import { NextResponse } from 'next/server';
import { encodeFunctionData, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monad, bundlerClient, publicClient, BUNDLER_RPC_URL } from '@/lib/viemClients';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { http } from 'viem';
import { synapseYieldAdapterAbi } from '@/lib/abi';
import {
  createExecution,
  ExecutionMode,
  toMetaMaskSmartAccount,
  Implementation,
  getDeleGatorEnvironment,
} from '@metamask/delegation-toolkit';
import { DelegationManager } from '@metamask/delegation-toolkit/contracts';
import type { Delegation } from '@metamask/delegation-toolkit';

// ----------------- CONFIG -----------------
const ADAPTER_CONTRACT_ADDRESS = getAddress(
  '0x3ed79496b6b5f2aed1e2b8203df783bbe39e9002'
) as `0x${string}`;

const signedDelegation: Delegation = {
  delegator: '0x688a6b7E1148FFFE0e5A19D2887edd0E9d1E88FE',
  delegate: '0x8f6b970b9f25b19f13115bdc7a34514d0f6971d1',
  authority: '0x442da5e7cef50064ca853508dc466d44de9632c1f69d5d49ab899cea95583926',
  caveats: [
    {
      enforcer: '0x7F20f61b1f09b08D970938F6fa563634d65c4EeB',
      terms: '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000003ed79496b6b5f2aed1e2b8203df783bbe39e9002',
      args: '0x',
    },
    {
      enforcer: '0x2C21fD0cB9DC8445Cb3fB0DC5e7bB0Aca0184285',
      terms: '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000003ed79496b6b5f2aed1e2b8203df783bbe39e90020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000131b89b1900000000000000000000000000000000000000000000000000000000',
      args: '0x',
    },
  ],
  salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
  signature: '0x00000000000000000000000069aa2f9fe1572f1b640e1bbc512f5c3a734fc77c0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000066000000000000000000000000000000000000000000000000000000000000005c44af63f0200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000055060806040526040516103f03803806103f08339810160408190526100229161025e565b61002c8282610033565b5050610341565b61003c82610091565b6040516001600160a01b038316907fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b905f90a280511561008557610080828261010c565b505050565b61008d61017f565b5050565b806001600160a01b03163b5f036100cb57604051634c9c8ce360e01b81526001600160a01b03821660048201526024015b60405180910390fd5b7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc80546001600160a01b0319166001600160a01b0392909216919091179055565b60605f80846001600160a01b031684604051610128919061032656'
};

export async function GET(request: Request) {
  try {
    if (!process.env.AGENT_PRIVATE_KEY) {
      throw new Error('AGENT_PRIVATE_KEY is not set in .env.local');
    }

    // 1) Create server-side agent EOA
    const agentAccount = privateKeyToAccount(
      process.env.AGENT_PRIVATE_KEY as `0x${string}`
    );
    console.log('Agent EOA address:', agentAccount.address);

    // 2) Create agent MetaMask Smart Account
    const environment = getDeleGatorEnvironment(monad.id);
    const agentSmartAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      signer: { account: agentAccount },
      environment,
      deployParams: [agentAccount.address, [], [], []],
      deploySalt: '0x',
    });
    console.log('Agent Smart Account address:', agentSmartAccount.address);

    // 3) Check Smart Account balance
    const saBalance = await publicClient.getBalance({ address: agentSmartAccount.address });
    console.log("🔍 Smart Account balance (wei):", saBalance);
    if (saBalance === 0n) {
      throw new Error("Smart Account has no funds. Please fund it with MON before sending UserOps.");
    }

    // 4) Build execution (rebalance call)
    const execution = createExecution({
      target: ADAPTER_CONTRACT_ADDRESS,
      value: 0n,
      callData: encodeFunctionData({
        abi: synapseYieldAdapterAbi,
        functionName: 'rebalance',
        args: ['Kintsu', 'Magma', 0n],
      }),
    });

    // 5) Encode DelegationManager.redeemDelegations calldata
    const redeemCalldata = DelegationManager.encode.redeemDelegations({
      delegations: [[signedDelegation]],
      modes: [ExecutionMode.SingleDefault],
      executions: [[execution]],
    });

    // 6) Estimate gas & send UserOperation to DelegationManager
    const calls = [
      {
        to: environment.DelegationManager as `0x${string}`,
        data: redeemCalldata,
      },
    ] as any;

    // Try to estimate gas via bundler; if not available, use fallbacks
    let callGasLimit: bigint = 1_000_000n;
    let verificationGasLimit: bigint = 500_000n;
    // Fallback high value since bundler may not support estimation; error indicated ~1_606_371 required
    let preVerificationGas: bigint = 2_000_000n;
    try {
      const est = await bundlerClient.estimateUserOperationGas({
        account: agentSmartAccount,
        calls,
      });
      callGasLimit = est.callGasLimit;
      verificationGasLimit = est.verificationGasLimit;
      preVerificationGas = est.preVerificationGas;
    } catch {
      console.warn('eth_estimateUserOperationGas not available on bundler; using fallback gas limits');
    }

    // Fetch fee caps from Pimlico (permissionless.js) and spread them
    const pimlico = createPimlicoClient({ transport: http(BUNDLER_RPC_URL) });
    const { fast: pimlicoFees } = await pimlico.getUserOperationGasPrice();

    console.log('UserOp sender (smart account):', agentSmartAccount.address);
    const userOpHash = await bundlerClient.sendUserOperation({
      account: agentSmartAccount,
      calls,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      ...pimlicoFees,
    });

    // Wait for receipt for reliability
    const { receipt } = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
    // Success
    return NextResponse.json({
      success: true,
      message: 'Agent ran and submitted user operation.',
      userOpHash,
      txHash: receipt.transactionHash,
    });

  } catch (error: any) {
    console.error('Agent handler error:', error);
    return NextResponse.json(
      { success: false, error: error.message ?? String(error) },
      { status: 500 }
    );
  }
}