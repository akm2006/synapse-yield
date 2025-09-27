// src/lib/agent/protocols/magma.ts

import { publicClient } from '@/lib/viemClients';
import { magmaAddress, magmaAbi, gMonAddress, gMonAbi } from '@/lib/protocolAbis';

export async function getMagmaIndexWei(blockNumber?: bigint): Promise<bigint> {
  const [tvl, totalSupply] = await Promise.all([
    publicClient.readContract({
      address: magmaAddress,
      abi: magmaAbi,
      functionName: 'calculateTVL',
      ...(blockNumber ? { blockNumber } : {}),
    }) as Promise<bigint>,
    publicClient.readContract({
      address: gMonAddress,
      abi: gMonAbi,
      functionName: 'totalSupply',
      ...(blockNumber ? { blockNumber } : {}),
    }) as Promise<bigint>,
  ]);

  if (totalSupply === 0n) return 0n;
  // indexWei = TVL * 1e18 / totalSupply  => MON-per-gMON in wei terms
  return (tvl * 10n ** 18n) / totalSupply;
}

/**
 * Read gMON balance for a user.
 */
export async function getGMonBalance(user: `0x${string}`): Promise<bigint> {
  try {
    const bal = (await publicClient.readContract({
      address: gMonAddress,
      abi: gMonAbi,
      functionName: 'balanceOf',
      args: [user],
    })) as bigint;
    return bal;
  } catch {
    return 0n;
  }
}


export async function fetchMagmaMetricsWithAPY() {
  const tvl = (await publicClient.readContract({
    address: magmaAddress,
    abi: magmaAbi,
    functionName: 'calculateTVL',
  })) as bigint;

  return {
    magmaTVL: tvl,
    magmaAPY: 2, // Fixed placeholder until mainnet (reasonable estimate vs Kintsu's ~3.15%)
    magmaIndexWei: await getMagmaIndexWei(),
  };
}

