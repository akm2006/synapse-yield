// src/lib/agent/protocols/kintsu.ts
import { formatEther, parseEther } from 'viem';
import { publicClient } from '@/lib/viemClients';
import { kintsuAddress, kintsuAbi } from '@/lib/protocolAbis';

const RATE_PRECISION = parseEther('1'); // 1e18
const PREVIEW_TEST_ASSETS = parseEther('1000'); // test amount for preview fallback

export async function fetchKintsuMetrics() {
  const metrics: {
    kintsuExchangeRate?: bigint;
    kintsuTotalShares?: bigint;
    kintsuTotalAssets?: bigint;
    kintsuAPY?: number;
  } = {};

  // totalShares
  try {
    const totalShares = (await publicClient.readContract({
      address: kintsuAddress,
      abi: kintsuAbi,
      functionName: 'totalShares',
    })) as bigint;

    metrics.kintsuTotalShares = totalShares;
  } catch (e) {
    // ignore; leave undefined
  }

  // exchange rate via convertToAssets(shares) where shares = min(totalShares/10, 1000 sMON)
  try {
    const totalShares = metrics.kintsuTotalShares ?? 0n;
    if (totalShares > 0n) {
      const testShares = totalShares > parseEther('1000') ? parseEther('1000') : (totalShares / 10n);
      const assetsForShares = (await publicClient.readContract({
        address: kintsuAddress,
        abi: kintsuAbi,
        functionName: 'convertToAssets',
        args: [testShares],
      })) as bigint;

      if (assetsForShares > 0n) {
        metrics.kintsuExchangeRate = (assetsForShares * RATE_PRECISION) / testShares;
        metrics.kintsuTotalAssets = (totalShares * metrics.kintsuExchangeRate) / RATE_PRECISION;
      }
    }
  } catch (e) {
    // ignore; fallback next
  }

  // fallback: previewDeposit(assets) -> shares, derive rate = assets/shares
  try {
    if (!metrics.kintsuExchangeRate) {
      const sharesForAssets = (await publicClient.readContract({
        address: kintsuAddress,
        abi: kintsuAbi,
        functionName: 'previewDeposit',
        args: [PREVIEW_TEST_ASSETS],
      })) as bigint;

      if (sharesForAssets > 0n) {
        metrics.kintsuExchangeRate = (PREVIEW_TEST_ASSETS * RATE_PRECISION) / sharesForAssets;
      }
    }
  } catch (e) {
    // ignore
  }

  // empty vault default: 1:1
  if (!metrics.kintsuExchangeRate) {
    metrics.kintsuExchangeRate = RATE_PRECISION;
    metrics.kintsuTotalAssets = 0n;
  }

  // derive APY approximation from rate delta vs 1.0 (for testnet demo)
  const rate = Number(formatEther(metrics.kintsuExchangeRate));
  metrics.kintsuAPY = Math.max(0, (rate - 1.0) * 100);

  return metrics as Required<typeof metrics>;
}

export async function getKintsuShareBalance(user: `0x${string}`) {
  try {
    const bal = (await publicClient.readContract({
      address: kintsuAddress,
      abi: kintsuAbi,
      functionName: 'balanceOf',
      args: [user],
    })) as bigint;

    return bal;
  } catch {
    return 0n;
  }
}
