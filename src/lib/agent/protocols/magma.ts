// src/lib/agent/protocols/magma.ts
import { publicClient } from '@/lib/viemClients';
import { magmaAddress, magmaAbi, gMonAddress, gMonAbi } from '@/lib/protocolAbis';

export async function fetchMagmaMetrics() {
  const metrics: { magmaTVL?: bigint; magmaAPY?: number } = {};
  try {
    const tvl = (await publicClient.readContract({
      address: magmaAddress,
      abi: magmaAbi,
      functionName: 'calculateTVL',
    })) as bigint;
    metrics.magmaTVL = tvl;
  } catch {
    metrics.magmaTVL = 0n;
  }

  // TODO: replace with real APY formula when available
  metrics.magmaAPY = 0;

  return metrics as Required<typeof metrics>;
}

export async function getGMonBalance(user: `0x${string}`) {
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
