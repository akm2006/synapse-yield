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
  swapRoute?: string;
}

export function shouldRebalance(
  metrics: Metrics,
  positions: UserPositions,
  thresholdPct: number
): RebalanceDecision {
  
  const kintsuAPY = metrics.kintsu.apy;
  const magmaAPY = metrics.magma.apy;
  
  const kintsuBetter = kintsuAPY > magmaAPY;
  const betterProtocol = kintsuBetter ? 'Kintsu' : 'Magma';
  const worseProtocol = kintsuBetter ? 'Magma' : 'Kintsu';
  const improvementPct = Math.abs(kintsuAPY - magmaAPY);
  
  const hasBalanceInWorse = kintsuBetter 
    ? positions.magma.valueInMON > 0n
    : positions.kintsu.valueInMON > 0n;
  
  // Account for DEX swap costs when moving FROM Kintsu
  const effectiveImprovementPct = (worseProtocol === 'Kintsu') 
    ? improvementPct - 0.3 // Subtract ~0.3% for DEX fees
    : improvementPct;
  
  const meetsThreshold = effectiveImprovementPct >= thresholdPct;
  
  const currentPositions = {
    kintsu: positions.kintsu.balanceFormatted,
    magma: positions.magma.balanceFormatted,
    total: positions.totalValueMONFormatted
  };
  
  const swapRoute = worseProtocol === 'Kintsu' 
    ? 'via PancakeSwap (instant)'
    : 'direct (instant)';
  
  if (!hasBalanceInWorse) {
    return {
      shouldRebalance: false,
      fromProtocol: worseProtocol as 'Kintsu' | 'Magma',
      toProtocol: betterProtocol as 'Kintsu' | 'Magma',
      improvementPct: effectiveImprovementPct,
      reason: `Already optimized: no balance in ${worseProtocol}`,
      currentPositions,
      swapRoute
    };
  }
  
  if (!meetsThreshold) {
    const swapCostNote = worseProtocol === 'Kintsu' ? ' (after DEX fees)' : '';
    return {
      shouldRebalance: false,
      fromProtocol: worseProtocol as 'Kintsu' | 'Magma',
      toProtocol: betterProtocol as 'Kintsu' | 'Magma',
      improvementPct: effectiveImprovementPct,
      reason: `Improvement ${effectiveImprovementPct.toFixed(2)}%${swapCostNote} below threshold ${thresholdPct}%`,
      currentPositions,
      swapRoute
    };
  }
  
  return {
    shouldRebalance: true,
    fromProtocol: worseProtocol as 'Kintsu' | 'Magma',
    toProtocol: betterProtocol as 'Kintsu' | 'Magma',
    improvementPct: effectiveImprovementPct,
    reason: `Rebalancing ${worseProtocol} → ${betterProtocol} ${swapRoute} for ${effectiveImprovementPct.toFixed(2)}% improvement`,
    currentPositions,
    swapRoute
  };
}

export function getOptimalProtocol(metrics: Metrics): 'Kintsu' | 'Magma' {
  return metrics.kintsu.apy > metrics.magma.apy ? 'Kintsu' : 'Magma';
}

export function formatDecision(decision: RebalanceDecision): string {
  if (decision.shouldRebalance) {
    return `🔄 ${decision.fromProtocol} → ${decision.toProtocol} (+${decision.improvementPct.toFixed(2)}%) ${decision.swapRoute}`;
  } else {
    return `✅ ${decision.reason}`;
  }
}
