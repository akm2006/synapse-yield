// src/lib/agent/decisions.ts
import type { ProtocolMetrics, DecisionResult, ProtocolName } from './types';

export function determineOptimalProtocol(metrics: ProtocolMetrics): ProtocolName {
  const kAPY = metrics.kintsuAPY ?? 0;
  const mAPY = metrics.magmaAPY ?? 0;
  return kAPY >= mAPY ? 'Kintsu' : 'Magma';
}

export function shouldRebalance(
  current: ProtocolName,
  optimal: ProtocolName,
  metrics: ProtocolMetrics,
  thresholdPct: number
): DecisionResult {
  if (current === optimal) {
    return {
      shouldRebalance: false,
      reason: 'Already in optimal protocol',
    };
  }
  const kAPY = metrics.kintsuAPY ?? 0;
  const mAPY = metrics.magmaAPY ?? 0;
  const currentAPY = current === 'Kintsu' ? kAPY : mAPY;
  const optimalAPY = optimal === 'Kintsu' ? kAPY : mAPY;
  const improvement = optimalAPY - currentAPY;

  if (improvement <= thresholdPct) {
    return {
      shouldRebalance: false,
      fromProtocol: current,
      toProtocol: optimal,
      improvementPct: improvement,
      reason: `Improvement ${improvement.toFixed(2)}% below threshold ${thresholdPct.toFixed(2)}%`,
    };
  }
  return {
    shouldRebalance: true,
    fromProtocol: current,
    toProtocol: optimal,
    improvementPct: improvement,
    reason: `Improvement ${improvement.toFixed(2)}% exceeds threshold ${thresholdPct.toFixed(2)}%`,
  };
}
