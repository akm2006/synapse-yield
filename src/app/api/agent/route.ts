// src/app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllMetrics } from '@/lib/agent/metrics';
import { getCurrentPositions } from '@/lib/agent/positions';
import { shouldRebalance } from '@/lib/agent/decisions';
import { executeRebalance } from '@/lib/agent/execution';
import { AGENT_CONFIG } from '@/lib/agent/config';
import { signedDelegation } from '@/lib/signedDelegation';  // ← import valid delegation

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch metrics & positions
    const [metrics, positions] = await Promise.all([
      getAllMetrics(),
      getCurrentPositions(AGENT_CONFIG.SMART_ACCOUNT_ADDRESS),
    ]);

    // 2. Determine if we should rebalance
    const decision = shouldRebalance(
      metrics,
      positions,
      AGENT_CONFIG.REBALANCE_THRESHOLD_PCT
    );

    // 3. Auto-execute if enabled and needed
    let executionResult = null;
    if (AGENT_CONFIG.EXECUTE_MODE && decision.shouldRebalance) {
      console.log('Decision is to rebalance, executing now...', decision);
      executionResult = await executeRebalance(
        decision.fromProtocol,
        decision.toProtocol,
        signedDelegation  // ← use imported signedDelegation
      );
      console.log('Execution result:', executionResult);
    }

    // 4. Return response
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      executeMode: AGENT_CONFIG.EXECUTE_MODE,
      metrics,
      positions: {
        kintsu: {
          balance: positions.kintsu.balanceFormatted,
          valueInMON: positions.kintsu.valueInMONFormatted,
        },
        magma: {
          balance: positions.magma.balanceFormatted,
          valueInMON: positions.magma.valueInMONFormatted,
        },
        total: positions.totalValueMONFormatted,
      },
      decision,
      executionResult,
      smartAccount: AGENT_CONFIG.SMART_ACCOUNT_ADDRESS,
    });
  } catch (error: any) {
    console.error('GET /api/agent error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'store_delegation') {
      console.log('Storing signed delegation (ignored, using built-in):', body.signedDelegation);
      return NextResponse.json({ success: true, message: 'Delegation stored (no-op)' });
    }

    if (body.action === 'execute_rebalance') {
      console.log('Manual rebalance trigger, executing now...');
      const result = await performRebalance();
      console.log('Manual execution result:', result);
      return NextResponse.json(result);
    }

    // Default: run rebalance logic
    const result = await performRebalance();
    console.log('Default execution result:', result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('POST /api/agent error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function performRebalance() {
  try {
    // Fetch data & decision
    const metrics = await getAllMetrics();
    const positions = await getCurrentPositions(AGENT_CONFIG.SMART_ACCOUNT_ADDRESS);
    const decision = shouldRebalance(
      metrics,
      positions,
      AGENT_CONFIG.REBALANCE_THRESHOLD_PCT
    );

    if (!decision.shouldRebalance) {
      console.log('No rebalance needed:', decision.reason);
      return {
        success: true,
        action: 'no_rebalance',
        reason: decision.reason,
        metrics,
        positions: {
          kintsu: positions.kintsu.balanceFormatted,
          magma: positions.magma.balanceFormatted,
          total: positions.totalValueMONFormatted,
        },
        timestamp: new Date().toISOString(),
      };
    }

    console.log('Executing rebalance with delegation...', decision);
    const result = await executeRebalance(
      decision.fromProtocol,
      decision.toProtocol,
      signedDelegation  // ← use imported signedDelegation
    );
    console.log('Rebalance executed:', result);

    return {
      success: result.success,
      action: 'rebalance_executed',
      result,
      decision,
      metrics,
      positions: {
        kintsu: positions.kintsu.balanceFormatted,
        magma: positions.magma.balanceFormatted,
        total: positions.totalValueMONFormatted,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('performRebalance error:', error);
    return {
      success: false,
      action: 'execution_failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}
