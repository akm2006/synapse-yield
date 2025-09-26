// src/lib/agent/positions.ts
import type { UserPosition } from './types';
import { getKintsuShareBalance } from './protocols/kintsu';
import { getGMonBalance } from './protocols/magma';

export async function getUserPosition(user: `0x${string}`): Promise<UserPosition | null> {
  const [kintsuBal, gmonBal] = await Promise.all([
    getKintsuShareBalance(user),
    getGMonBalance(user),
  ]);

  if (kintsuBal > 0n) {
    return { protocol: 'Kintsu', amount: kintsuBal, shares: kintsuBal };
  }
  if (gmonBal > 0n) {
    return { protocol: 'Magma', amount: gmonBal };
  }
  return null;
}
