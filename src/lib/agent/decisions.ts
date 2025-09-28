// src/lib/agent/decisions.ts
import { UserPositions } from './positions';

export interface Metrics {
  kintsu: {
    apy: number;
    totalTVL: string;
    exchangeRate?: number;
  };
  magma: {
    apy: number;
    totalTVL: string;
    exchangeRate?: number;
  };
  timestamp: string;
}

export interface RebalanceDecision {
  shouldRebalance: boolean;
  fromProtocol: 'Kintsu' | 'Magma';
  toProtocol: 'Kintsu' | 'Magma';
  improvementPct: number;
  reason: string;
  currentPositions: {
    kintsu: string;
    magma: string;
    total: string;
  };
}

export function shouldRebalance(
  metrics: Metrics,
  positions: UserPositions,
  thresholdPct: number
): RebalanceDecision {
  
  const kintsuAPY = metrics.kintsu.apy;
  const magmaAPY = metrics.magma.apy;
  
  // Determine which protocol has better yield
  const kintsuBetter = kintsuAPY > magmaAPY;
  const betterProtocol = kintsuBetter ? 'Kintsu' : 'Magma';
  const worseProtocol = kintsuBetter ? 'Magma' : 'Kintsu';
  const improvementPct = Math.abs(kintsuAPY - magmaAPY);
  
  // Check if user has balance in the worse protocol
  const hasBalanceInWorse = kintsuBetter 
    ? positions.magma.valueInMON > 0n
    : positions.kintsu.valueInMON > 0n;
  
  // Check if improvement exceeds threshold
  const meetsThreshold = improvementPct >= thresholdPct;
  
  const currentPositions = {
    kintsu: positions.kintsu.balanceFormatted,
    magma: positions.magma.balanceFormatted,
    total: positions.totalValueMONFormatted
  };
  
  // Decision logic
  if (!hasBalanceInWorse) {
    return {
      shouldRebalance: false,
      fromProtocol: worseProtocol as 'Kintsu' | 'Magma',
      toProtocol: betterProtocol as 'Kintsu' | 'Magma',
      improvementPct,
      reason: `Already optimized: no balance in ${worseProtocol}`,
      currentPositions
    };
  }
  
  if (!meetsThreshold) {
    return {
      shouldRebalance: false,
      fromProtocol: worseProtocol as 'Kintsu' | 'Magma',
      toProtocol: betterProtocol as 'Kintsu' | 'Magma',
      improvementPct,
      reason: `Improvement ${improvementPct.toFixed(2)}% below threshold ${thresholdPct}%`,
      currentPositions
    };
  }
  
  return {
    shouldRebalance: true,
    fromProtocol: worseProtocol as 'Kintsu' | 'Magma',
    toProtocol: betterProtocol as 'Kintsu' | 'Magma',
    improvementPct,
    reason: `Rebalancing ${worseProtocol} → ${betterProtocol} for ${improvementPct.toFixed(2)}% improvement`,
    currentPositions
  };
}

export function getOptimalProtocol(metrics: Metrics): 'Kintsu' | 'Magma' {
  return metrics.kintsu.apy > metrics.magma.apy ? 'Kintsu' : 'Magma';
}

export function formatDecision(decision: RebalanceDecision): string {
  if (decision.shouldRebalance) {
    return `🔄 ${decision.fromProtocol} → ${decision.toProtocol} (+${decision.improvementPct.toFixed(2)}%)`;
  } else {
    return `✅ ${decision.reason}`;
  }
}
