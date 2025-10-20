// src/utils/yieldOptimizer.ts
import { parseUnits, formatUnits } from 'viem';

/**
 * Generate simulated APY values for demonstration
 */
export function generateSimulatedAPY(min: number, max: number): number {
  const base = min + Math.random() * (max - min);
  const volatility = 0.5; // ±0.5% volatility
  const fluctuation = (Math.random() - 0.5) * 2 * volatility;

  return Math.max(min, Math.min(max, base + fluctuation));
}

/**
 * Determine if rebalancing is needed and calculate the action.
 * This version includes improved logging and clearer calculations.
 */
export function determineRebalanceAction(
  kintsuBalanceStr: string | null,
  magmaBalanceStr: string | null
) {
  const kintsuBalance = parseFloat(kintsuBalanceStr || '0');
  const magmaBalance = parseFloat(magmaBalanceStr || '0');
  const totalStaked = kintsuBalance + magmaBalance;

  // --- CONFIGURATION ---
  const THRESHOLD = 0.05; // 5% tolerance band (45% - 55%)
  const MIN_REBALANCE_AMOUNT = 0.001; // Don't rebalance dust

  const LOWER_BOUND = 0.5 - THRESHOLD; // 45%
  const UPPER_BOUND = 0.5 + THRESHOLD; // 55%

  if (totalStaked < MIN_REBALANCE_AMOUNT) {
    return {
      shouldRebalance: false,
      fromProtocol: null,
      toProtocol: null,
      amount: null,
      reason: "Total balance is too low to rebalance.",
    };
  }

  const kintsuRatio = kintsuBalance / totalStaked;
  const magmaRatio = magmaBalance / totalStaked;
  const targetAmount = totalStaked / 2;

  let fromProtocol: 'kintsu' | 'magma' | null = null;
  let toProtocol: 'kintsu' | 'magma' | null = null;
  let amountToMove = 0;
  let reason = "";

  // Case 1: Kintsu (sMON) is over the target weight
  if (kintsuRatio > UPPER_BOUND) {
    fromProtocol = 'kintsu';
    toProtocol = 'magma';
    amountToMove = kintsuBalance - targetAmount;
    reason = `Portfolio imbalanced (sMON: ${(kintsuRatio * 100).toFixed(1)}%, gMON: ${(magmaRatio * 100).toFixed(1)}%). Action: Rebalance ${amountToMove.toFixed(4)} sMON to gMON.`;
  }
  // Case 2: Magma (gMON) is over the target weight
  else if (magmaRatio > UPPER_BOUND) {
    fromProtocol = 'magma';
    toProtocol = 'kintsu';
    amountToMove = magmaBalance - targetAmount;
    reason = `Portfolio imbalanced (sMON: ${(kintsuRatio * 100).toFixed(1)}%, gMON: ${(magmaRatio * 100).toFixed(1)}%). Action: Rebalance ${amountToMove.toFixed(4)} gMON to sMON.`;
  }

  // Final check to see if the action is worth executing
  if (fromProtocol && amountToMove > MIN_REBALANCE_AMOUNT) {
    return {
      shouldRebalance: true,
      fromProtocol,
      toProtocol,
      amount: amountToMove.toString(),
      reason,
    };
  }

  return {
    shouldRebalance: false,
    fromProtocol: null,
    toProtocol: null,
    amount: null,
    reason: `Portfolio is within the balanced range (sMON: ${(kintsuRatio * 100).toFixed(1)}%, gMON: ${(magmaRatio * 100).toFixed(1)}%).`,
  };
}


/**
 * Calculate potential yield optimization based on APY differences
 */
export function calculateYieldOptimization(
  kintsuAPY: number,
  magmaAPY: number,
  kintsuBalance: string,
  magmaBalance: string
): {
  optimalProtocol: 'kintsu' | 'magma';
  potentialGain: number;
  shouldOptimize: boolean;
} {
  const kintsuBal = parseFloat(kintsuBalance || '0');
  const magmaBal = parseFloat(magmaBalance || '0');
  const totalBalance = kintsuBal + magmaBal;

  if (totalBalance === 0) {
    return {
      optimalProtocol: kintsuAPY > magmaAPY ? 'kintsu' : 'magma',
      potentialGain: 0,
      shouldOptimize: false
    };
  }

  const currentYield = (kintsuBal * kintsuAPY + magmaBal * magmaAPY) / totalBalance;
  const optimalAPY = Math.max(kintsuAPY, magmaAPY);
  const optimalProtocol = kintsuAPY > magmaAPY ? 'kintsu' : 'magma';
  const potentialGain = optimalAPY - currentYield;

  // Only suggest optimization if gain is > 5%
  const shouldOptimize = potentialGain > 5.0;

  return {
    optimalProtocol,
    potentialGain,
    shouldOptimize
  };
}

/**
 * Format balance for display
 */
export function formatBalance(balance: string, decimals: number = 4): string {
  const bal = parseFloat(balance || '0');
  return bal.toFixed(decimals);
}

/**
 * Calculate estimated gas costs for rebalancing operations
 */
export function estimateRebalanceGasCost(operation: 'kintsu-to-magma' | 'magma-to-kintsu'): {
  estimatedGas: string;
  operationCount: number;
  description: string;
} {
  const gasEstimates = {
    'kintsu-to-magma': {
      estimatedGas: '0.002',
      operationCount: 2,
      description: 'Swap sMON→WMON, then stake WMON→gMON'
    },
    'magma-to-kintsu': {
      estimatedGas: '0.0015',
      operationCount: 2,
      description: 'Unstake gMON→MON, then stake MON→sMON'
    }
  };

  return gasEstimates[operation];
}