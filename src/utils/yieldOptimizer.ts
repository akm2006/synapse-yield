// src/utils/yieldOptimizer.ts
import { parseUnits, formatUnits } from 'viem';

/**
 * Generate simulated APY values for demonstration
 */
export function generateSimulatedAPY(min: number, max: number): number {
  // Add some realistic volatility to the APY
  const base = min + Math.random() * (max - min);
  const volatility = 0.5; // ±0.5% volatility
  const fluctuation = (Math.random() - 0.5) * 2 * volatility;
  
  return Math.max(min, Math.min(max, base + fluctuation));
}

/**
 * Determine if rebalancing is needed and calculate the action
 * Now moves the entire balance of the larger protocol to the smaller one.
 */
// src/utils/yieldOptimizer.ts

// ... (generateSimulatedAPY function remains the same) ...

export function determineRebalanceAction(
  kintsuBalanceStr: string | null,
  magmaBalanceStr: string | null
) {
  const kintsuBalance = parseFloat(kintsuBalanceStr || '0');
  const magmaBalance = parseFloat(magmaBalanceStr || '0');
  const totalStaked = kintsuBalance + magmaBalance;

  // --- NEW LOGIC WITH THRESHOLD ---
  const THRESHOLD = 0.05; // 5% tolerance
  const LOWER_BOUND = 0.5 - THRESHOLD; // 45%
  const UPPER_BOUND = 0.5 + THRESHOLD; // 55%

  if (totalStaked < 0.001) { // Don't rebalance dust
    return {
      shouldRebalance: false,
      fromProtocol: null,
      toProtocol: null,
      amount: null,
      reason: "Total balance too low to rebalance.",
    };
  }

  const kintsuRatio = kintsuBalance / totalStaked;

  let fromProtocol: 'kintsu' | 'magma' | null = null;
  let toProtocol: 'kintsu' | 'magma' | null = null;
  let amountToMove = 0;

  // If Kintsu balance is too high (e.g., > 55%)
  if (kintsuRatio > UPPER_BOUND) {
    fromProtocol = 'kintsu';
    toProtocol = 'magma';
    // Calculate amount needed to move to reach a perfect 50/50 balance
    amountToMove = kintsuBalance - (totalStaked / 2);
  } 
  // If Kintsu balance is too low (e.g., < 45%), which means Magma is too high
  else if (kintsuRatio < LOWER_BOUND) {
    fromProtocol = 'magma';
    toProtocol = 'kintsu';
    // Calculate amount needed to move to reach a perfect 50/50 balance
    amountToMove = magmaBalance - (totalStaked / 2);
  }

  if (fromProtocol && amountToMove > 0.001) { // Check if amount is significant
    return {
      shouldRebalance: true,
      fromProtocol,
      toProtocol,
      amount: amountToMove.toString(),
      reason: `Portfolio imbalanced. ${fromProtocol} is at ${(kintsuRatio * 100).toFixed(1)}%. Rebalancing to 50/50.`,
    };
  }
  // --- END OF NEW LOGIC ---
  
  return {
    shouldRebalance: false,
    fromProtocol: null,
    toProtocol: null,
    amount: null,
    reason: "Portfolio is within the balanced range.",
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
