// src/app/api/agent/decision/route.ts
import { NextResponse } from 'next/server';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  CHAIN,
  DELEGATION_ENV,
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
import { toJSONSafe } from '@/lib/agent/serialize';
import type { Address } from 'viem';

const json = (v: any, init?: ResponseInit) =>
  NextResponse.json(toJSONSafe(v), init);

export async function GET() {
  try {
    if (!AGENT_PRIVATE_KEY) {
      throw new Error('AGENT_PRIVATE_KEY is not set');
    }

    // Create agent smart account (needed for position checking)
    const agentEOA = privateKeyToAccount(AGENT_PRIVATE_KEY);
    const agentSA = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      signer: { account: agentEOA },
      environment: DELEGATION_ENV,
      deployParams: [agentEOA.address, [], [], []],
      deploySalt: '0x',
    });

    // Get current state
    const [metrics, position] = await Promise.all([
      getAllMetrics(),
      getUserPosition(agentSA.address as Address),
    ]);

    // Make decision
    const optimal = determineOptimalProtocol(metrics);
    const decision = position 
      ? shouldRebalance(position.protocol, optimal, metrics, REBALANCE_THRESHOLD_PCT)
      : {
          shouldRebalance: false,
          reason: 'No current position found',
        };

    return json({
      success: true,
      metrics,
      position,
      optimalProtocol: optimal,
      decision,
      agentAddress: agentSA.address,
      executeMode: EXECUTE_MODE,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return json(
      { 
        success: false, 
        error: error.message ?? String(error) 
      },
      { status: 500 }
    );
  }
}
