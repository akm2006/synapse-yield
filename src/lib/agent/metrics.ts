// src/lib/agent/metrics.ts
import type { ProtocolMetrics } from './types';
import { fetchKintsuMetrics } from './protocols/kintsu';
import { fetchMagmaMetricsWithAPY } from './protocols/magma';

// src/lib/agent/metrics.ts - ADD THIS FUNCTION
export async function getAllMetrics() {
  // This should return the same structure as your existing metrics
  // Assuming you have the protocols already defined
  
  try {
    const [kintsuMetrics, magmaMetrics] = await Promise.all([
      getKintsuMetrics(),
      getMagmaMetrics()
    ]);

    return {
      kintsu: kintsuMetrics,
      magma: magmaMetrics,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting all metrics:', error);
    throw new Error(`Failed to fetch metrics: ${error}`);
  }
}

// Helper functions (implement based on your existing code)
async function getKintsuMetrics() {
  return {
    apy: 5.2, // Implement actual APY calculation
    totalTVL: "1000000", // Implement actual TVL fetching
    exchangeRate: 1.05 // Implement actual exchange rate
  };
}

async function getMagmaMetrics() {
  return {
    apy: 4.8, // Implement actual APY calculation  
    totalTVL: "800000", // Implement actual TVL fetching
    exchangeRate: 1.02 // Implement actual exchange rate
  };
}
