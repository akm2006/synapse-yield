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
export function determineRebalanceAction(
  kintsuBalance: string,
  magmaBalance: string
): {
  shouldRebalance: boolean;
  fromProtocol?: 'kintsu' | 'magma';
  toProtocol?: 'kintsu' | 'magma';
  amount?: string;
  reason?: string;
} {
  const kintsuBal = parseFloat(kintsuBalance || '0');
  const magmaBal  = parseFloat(magmaBalance  || '0');
  const totalBalance = kintsuBal + magmaBal;

  // No rebalance if nothing staked
  if (totalBalance < 0.001) {
    return { shouldRebalance: false };
  }

  // If perfectly balanced, no action
  if (Math.abs(kintsuBal - magmaBal) < 0.000001) {
    return { shouldRebalance: false };
  }

  // Determine from/to
  const fromProtocol = kintsuBal > magmaBal ? 'kintsu' : 'magma';
  const toProtocol   = kintsuBal > magmaBal ? 'magma' : 'kintsu';

  // Move entire balance of the larger protocol
  const amount = fromProtocol === 'kintsu'
    ? kintsuBal.toFixed(6)
    : magmaBal.toFixed(6);

  const difference = Math.abs(kintsuBal - magmaBal);
  const reason = `${fromProtocol.charAt(0).toUpperCase() + fromProtocol.slice(1)} has ${difference.toFixed(4)} more tokens`;

  return {
    shouldRebalance: true,
    fromProtocol,
    toProtocol,
    amount,
    reason
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
