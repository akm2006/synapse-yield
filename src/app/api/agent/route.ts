// src/app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Address } from 'viem';
import { getAllMetrics } from '@/lib/agent/metrics';
import { getCurrentPositions } from '@/lib/agent/positions';
import { shouldRebalance } from '@/lib/agent/decisions';
import { executeRebalance } from '@/lib/agent/execution';
import { AGENT_CONFIG } from '@/lib/agent/config';

// In production, retrieve this from secure storage
const STORED_DELEGATION = process.env.SIGNED_DELEGATION ? 
  JSON.parse(process.env.SIGNED_DELEGATION) : null;

export async function GET(request: NextRequest) {
  try {
    // Get current metrics
    const metrics = await getAllMetrics();
    
    // Get current positions
    const positions = await getCurrentPositions(AGENT_CONFIG.SMART_ACCOUNT_ADDRESS);
    
    // Make decision
    const decision = shouldRebalance(metrics, positions, AGENT_CONFIG.REBALANCE_THRESHOLD_PCT);
    
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
        total: positions.totalValueMONFormatted
      },
      decision,
      smartAccount: AGENT_CONFIG.SMART_ACCOUNT_ADDRESS
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle delegation storage
    if (body.action === 'store_delegation') {
      // In production, store securely in database
      console.log('Received signed delegation:', body.signedDelegation);
      return NextResponse.json({ success: true, message: 'Delegation stored' });
    }
    
    // Handle manual execution trigger
    if (body.action === 'execute_rebalance') {
      if (!STORED_DELEGATION) {
        return NextResponse.json({
          success: false,
          error: 'No delegation found. User must authorize agent first.'
        });
      }
      
      const result = await performRebalance();
      return NextResponse.json(result);
    }
    
    // Default: Check if rebalance is needed and execute
    const result = await performRebalance();
    return NextResponse.json(result);
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function performRebalance() {
  try {
    // 1) Get latest data
    const metrics = await getAllMetrics();
    const positions = await getCurrentPositions(AGENT_CONFIG.SMART_ACCOUNT_ADDRESS);
    const decision = shouldRebalance(metrics, positions, AGENT_CONFIG.REBALANCE_THRESHOLD_PCT);
    
    if (!decision.shouldRebalance) {
      return {
        success: true,
        action: 'no_rebalance',
        reason: decision.reason,
        metrics,
        positions: {
          kintsu: positions.kintsu.balanceFormatted,
          magma: positions.magma.balanceFormatted,
          total: positions.totalValueMONFormatted
        },
        timestamp: new Date().toISOString()
      };
    }
    
    // 2) Check if delegation is available
    if (!STORED_DELEGATION) {
      return {
        success: false,
        action: 'delegation_required',
        error: 'User must authorize the agent first',
        decision
      };
    }
    
    // 3) Execute the rebalance
    const result = await executeRebalance(
      decision.fromProtocol,
      decision.toProtocol,
      STORED_DELEGATION
    );
    
    return {
      success: result.success,
      action: 'rebalance_executed',
      result,
      decision,
      metrics,
      positions: {
        kintsu: positions.kintsu.balanceFormatted,
        magma: positions.magma.balanceFormatted,
        total: positions.totalValueMONFormatted
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    return {
      success: false,
      action: 'execution_failed',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
