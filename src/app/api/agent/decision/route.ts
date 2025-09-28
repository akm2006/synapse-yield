// src/app/api/agent/decision/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Address } from 'viem';

import { getAllMetrics } from '@/lib/agent/metrics';
import { getCurrentPositions } from '@/lib/agent/positions';
import { shouldRebalance, getOptimalProtocol } from '@/lib/agent/decisions';
import { AGENT_CONFIG } from '@/lib/agent/config';

export async function GET(request: NextRequest) {
  try {
    // Get current metrics and positions
    const [metrics, positions] = await Promise.all([
      getAllMetrics(),
      getCurrentPositions(AGENT_CONFIG.SMART_ACCOUNT_ADDRESS)
    ]);

    // Determine optimal protocol and rebalance decision
    const optimalProtocol = getOptimalProtocol(metrics);
    const decision = shouldRebalance(metrics, positions, AGENT_CONFIG.REBALANCE_THRESHOLD_PCT);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      smartAccount: AGENT_CONFIG.SMART_ACCOUNT_ADDRESS,
      executeMode: AGENT_CONFIG.EXECUTE_MODE,
      
      // Current metrics
      metrics,
      
      // Current positions
      positions: {
        kintsu: {
          balance: positions.kintsu.balanceFormatted,
          valueInMON: positions.kintsu.valueInMONFormatted,
          unlockRequests: positions.kintsu.unlockRequests?.length || 0
        },
        magma: {
          balance: positions.magma.balanceFormatted,
          valueInMON: positions.magma.valueInMONFormatted
        },
        total: {
          valueInMON: positions.totalValueMONFormatted
        }
      },
      
      // Decision analysis
      optimalProtocol,
      decision: {
        shouldRebalance: decision.shouldRebalance,
        fromProtocol: decision.fromProtocol,
        toProtocol: decision.toProtocol,
        improvementPct: decision.improvementPct,
        reason: decision.reason
      }
    });

  } catch (error: any) {
    console.error('Decision API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to analyze decision',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
