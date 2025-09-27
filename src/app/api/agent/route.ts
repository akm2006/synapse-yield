// src/app/api/agent/route.ts
import { NextResponse } from 'next/server';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  CHAIN,
  DELEGATION_ENV,
  ENTRYPOINT_ADDRESS,
  REBALANCE_THRESHOLD_PCT,
  AGENT_PRIVATE_KEY,
  EXECUTE_MODE,
} from '@/lib/agent/config';
import { publicClient } from '@/lib/viemClients';
import {
  toMetaMaskSmartAccount,
  Implementation,
} from '@metamask/delegation-toolkit';
import { getAllMetrics } from '@/lib/agent/metrics';
import { getUserPosition } from '@/lib/agent/positions';
import { determineOptimalProtocol, shouldRebalance } from '@/lib/agent/decisions';
import { ensureEntryPointPrefund } from '@/lib/agent/entryPoint';
import { 
  applySlippage, 
  buildRebalanceExecution, 
  encodeRedeemDelegations, 
  estimateGasAndFees, 
  sendUserOperation 
} from '@/lib/agent/userop';
import { toJSONSafe } from '@/lib/agent/serialize';
import type { Address } from 'viem';
import type { Delegation } from '@metamask/delegation-toolkit';

// TODO: Import real signed delegation in Phase 3.5
// For now, using a placeholder - replace with actual delegation
const signedDelegation: Delegation = {
  delegator: '0x688a6b7E1148FFFE0e5A19D2887edd0E9d1E88FE' as Address,
  delegate: '0x8f6b970b9f25b19f13115bdc7a34514d0f6971d1' as Address,
  authority: '0x442da5e7cef50064ca853508dc466d44de9632c1f69d5d49ab899cea95583926' as `0x${string}`,
  caveats: [
    {
      enforcer: '0x7F20f61b1f09b08D970938F6fa563634d65c4EeB' as Address,
      terms: '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000003ed79496b6b5f2aed1e2b8203df783bbe39e9002' as `0x${string}`,
      args: '0x' as `0x${string}`,
    },
  ],
  salt: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
  signature: '0x00000000000000000000000069aa2f9fe1572f1b640e1bbc512f5c3a734fc77c0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000066000000000000000000000000000000000000000000000000000000000000005c44af63f0200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000055060806040526040516103f03803806103f08339810160408190526100229161025e565b61002c8282610033565b5050610341565b61003c82610091565b6040516001600160a01b038316907fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b905f90a280511561008557610080828261010c565b505050565b61008d61017f565b5050565b806001600160a01b03163b5f036100cb57604051634c9c8ce360e01b81526001600160a01b03821660048201526024015b60405180910390fd5b7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc80546001600160a01b0319166001600160a01b0392909216919091179055565b60605f80846001600160a01b031684604051610128919061032656' as `0x${string}`,
};

// BigInt-safe JSON helper for this route
const json = (v: any, init?: ResponseInit) =>
  NextResponse.json(toJSONSafe(v), init);

export async function GET() {
  try {
    console.log('🚀 Agent route start - Execute Mode:', EXECUTE_MODE);
    
    if (!AGENT_PRIVATE_KEY) {
      throw new Error('❌ AGENT_PRIVATE_KEY is not set in environment');
    }

    // 1) Agent EOA and wallet client
    const agentEOA = privateKeyToAccount(AGENT_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account: agentEOA,
      chain: CHAIN,
      transport: http(),
    });

    console.log('👤 Agent EOA:', agentEOA.address);

    // 2) Agent Smart Account (MetaMask hybrid)
    const agentSA = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      signer: { account: agentEOA },
      environment: DELEGATION_ENV,
      deployParams: [agentEOA.address, [], [], []],
      deploySalt: '0x',
    });

    console.log('🤖 Agent Smart Account:', agentSA.address);

    // 3) Metrics + Position
    const [metrics, position] = await Promise.all([
      getAllMetrics(),
      getUserPosition(agentSA.address as Address),
    ]);

    console.log('📊 Current metrics:', {
      kintsuAPY: metrics.kintsuAPY,
      magmaAPY: metrics.magmaAPY,
    });

    // If no current position, skip for now
    if (!position) {
      return json({
        success: true,
        message: 'No current position; nothing to rebalance',
        metrics,
        agentAddress: agentSA.address,
        executeMode: EXECUTE_MODE,
      });
    }

    console.log('👤 Current position:', position);

    // 4) Decide optimal target and whether to rebalance
    const optimal = determineOptimalProtocol(metrics);
    const decision = shouldRebalance(position.protocol, optimal, metrics, REBALANCE_THRESHOLD_PCT);

    console.log('🎯 Optimal protocol:', optimal);
    console.log('🔄 Decision:', decision);

    if (!decision.shouldRebalance || !decision.fromProtocol || !decision.toProtocol) {
      return json({
        success: true,
        message: decision.reason,
        decision,
        metrics,
        position,
        agentAddress: agentSA.address,
        executeMode: EXECUTE_MODE,
      });
    }

    // 5) Check execution mode
    if (!EXECUTE_MODE) {
      return json({
        success: true,
        message: `Simulation mode - would rebalance from ${decision.fromProtocol} to ${decision.toProtocol}`,
        decision,
        metrics,
        position,
        agentAddress: agentSA.address,
        executeMode: EXECUTE_MODE,
        simulated: true,
      });
    }

    // 6) Prefund EntryPoint (optional, for live execution)
    if (ENTRYPOINT_ADDRESS) {
      console.log('⛽ Ensuring EntryPoint prefund...');
      await ensureEntryPointPrefund(walletClient, ENTRYPOINT_ADDRESS, agentSA.address as Address, {
        minDeposit: undefined,
        topUpAmount: undefined,
        checkOnly: false,
      });
    }

    // 7) Build calldata and calls
    const minAmountOut = 0n; // Conservative for demo; improve with slippage calculation
    const execution = buildRebalanceExecution(decision.fromProtocol, decision.toProtocol, minAmountOut);
    const redeemCall = encodeRedeemDelegations(signedDelegation, execution);
    const calls = [redeemCall];

    console.log('🔧 Built execution calls');

    // 8) Gas limits + fees, then send UserOperation
    const { limits, fees } = await estimateGasAndFees(agentSA, calls);
    console.log('⛽ Gas estimated:', limits);
    console.log('💰 Fees:', fees);

    const { userOpHash, receipt } = await sendUserOperation(agentSA, calls, limits, fees);
    console.log('✅ UserOp sent:', userOpHash);
    console.log('📄 Receipt:', receipt.transactionHash);

    return json({
      success: true,
      message: `Rebalanced from ${decision.fromProtocol} to ${decision.toProtocol}`,
      decision,
      metrics,
      position,
      userOpHash,
      txHash: receipt.transactionHash,
      agentAddress: agentSA.address,
      executeMode: EXECUTE_MODE,
    });
  } catch (error: any) {
    console.error('❌ Agent handler error:', error);
    return json(
      { 
        success: false, 
        error: error.message ?? String(error),
        executeMode: EXECUTE_MODE,
      },
      { status: 500 }
    );
  }
}
