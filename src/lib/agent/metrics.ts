// src/lib/agent/metrics.ts
import type { ProtocolMetrics } from './types';
import { fetchKintsuMetrics } from './protocols/kintsu';
import { fetchMagmaMetrics } from './protocols/magma';

export async function getAllMetrics(): Promise<ProtocolMetrics> {
  const [k, m] = await Promise.all([fetchKintsuMetrics(), fetchMagmaMetrics()]);
  return {
    kintsuExchangeRate: k.kintsuExchangeRate,
    kintsuTotalShares: k.kintsuTotalShares,
    kintsuTotalAssets: k.kintsuTotalAssets,
    kintsuAPY: k.kintsuAPY,
    magmaTVL: m.magmaTVL,
    magmaAPY: m.magmaAPY,
  };
}
