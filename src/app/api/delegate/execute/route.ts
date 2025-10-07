import { NextRequest, NextResponse } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';
import { Hex, Address, parseUnits, encodeFunctionData } from 'viem';
import { toMetaMaskSmartAccount, Implementation, ExecutionMode, Delegation } from '@metamask/delegation-toolkit';
import { DelegationManager } from '@metamask/delegation-toolkit/contracts';
import { createPublicClient, http } from 'viem';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { monadTestnet } from '@/lib/smartAccountClient';
import { kintsuAbi, magmaAbi } from '@/lib/abis';
import { CONTRACTS } from '@/lib/contracts';
import {
  createBundlerClient,
  createPaymasterClient,
} from 'viem/account-abstraction';
const DELEGATE_PRIVATE_KEY = process.env.DELEGATE_PRIVATE_KEY as Hex;
const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY!;

if (!DELEGATE_PRIVATE_KEY || !PIMLICO_API_KEY) {
  throw new Error('Required environment variables missing');
}

const chainId = 10143;
const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

const bundlerClient = createBundlerClient({
  transport: http(`https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`),
});

const paymasterClient = createPaymasterClient({
  transport: http(`https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`),
});

const pimlicoClient = createPimlicoClient({
  transport: http(`https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`),
});

export async function POST(request: NextRequest) {
  let body: any;
  
  try {
    body = await request.json();
    const { userAddress, operation, amount, referralId, delegation } = body;

    if (!userAddress || !operation || !delegation) {
      return NextResponse.json(
        { error: 'User address, operation, and delegation are required' },
        { status: 400 }
      );
    }

    if (!['stake-magma', 'unstake-magma', 'stake-kintsu', 'unstake-kintsu'].includes(operation)) {
      return NextResponse.json(
        { error: 'Invalid operation' },
        { status: 400 }
      );
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // Create delegate account
    const account = privateKeyToAccount(DELEGATE_PRIVATE_KEY);
    const delegateSA = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [account.address as Address, [] as string[], [] as bigint[], [] as bigint[]],
      deploySalt: "0x" as Address,
      signer: { account },
    });

    // Parse delegation
    const parsedDelegation: Delegation = {
      ...delegation,
      caveat: delegation.caveat ? {
        ...delegation.caveat,
        ...(delegation.caveat.maxValue && { maxValue: BigInt(delegation.caveat.maxValue) }),
      } : delegation.caveat,
    };

    // Create execution based on operation
    const amountBigInt = parseUnits(amount, 18);
    let execution;
    
    switch (operation) {
      case 'stake-magma':
        execution = {
          target: CONTRACTS.MAGMA_STAKE,
          value: amountBigInt,
          callData: encodeFunctionData({
            abi: magmaAbi,
            functionName: 'depositMon',
            args: referralId ? [BigInt(referralId)] : [],
          }),
        };
        break;
      case 'unstake-magma':
        execution = {
          target: CONTRACTS.MAGMA_STAKE,
          value: 0n,
          callData: encodeFunctionData({
            abi: magmaAbi,
            functionName: 'withdrawMon',
            args: [amountBigInt],
          }),
        };
        break;
     
      case 'stake-kintsu':
        execution = {
          target: CONTRACTS.KINTSU,
          value: amountBigInt,
          callData: encodeFunctionData({
            abi: kintsuAbi,
            functionName: 'deposit',
            args: [amountBigInt, userAddress as Address], // Pass the actual amount
          }),
        };
        break;
      case 'unstake-kintsu':
        // Implementation for unstaking via swap would go here
        // For brevity, showing the pattern
        return NextResponse.json({ error: 'Unstake Kintsu not yet implemented in delegation flow' }, { status: 501 });
      default:
        throw new Error('Invalid operation');
    }

    // Encode delegation redemption
    const redeemData = DelegationManager.encode.redeemDelegations({
      delegations: [[parsedDelegation]],
      modes: [ExecutionMode.SingleDefault],
      executions: [[execution]],
    });

    // Execute transaction
    const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();
    
    const userOpHash = await bundlerClient.sendUserOperation({
      account: delegateSA,
      calls: [{
  to: delegateSA.address,
  data: redeemData,
  value: operation === 'stake-kintsu' ? amountBigInt : 0n,
}],
      ...fee,
      paymaster: paymasterClient,
    });

    const { receipt } = await bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });

    return NextResponse.json({
      success: true,
      txHash: receipt.transactionHash,
      userOpHash,
    });
  } catch (error) {
    console.error(`Failed to execute ${body?.operation || 'operation'}:`, error);
    return NextResponse.json(
      { error: `Failed to execute ${body?.operation || 'operation'}` },
      { status: 500 }
    );
  }
}
