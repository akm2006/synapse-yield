// src/hooks/useBalances.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePublicClient, useBlockNumber } from 'wagmi';
import type { Address } from 'viem';
import { formatUnits } from 'viem';
import { CONTRACTS } from '@/lib/contracts';
import { erc20Abi } from '@/lib/abis';

export interface Balances {
  native: string;
  kintsu: string;
  magma: string;
  wmon: string;
}

interface UseBalancesReturn {
  balances: Balances;
  isLoading: boolean;
  error: string | null;
  fetchBalances: (silent?: boolean) => Promise<void>;
  lastUpdated: number;
}

const ZERO_BALANCE = '0.0000';

export function useBalances(smartAccountAddress: Address | null): UseBalancesReturn {
  const publicClient = usePublicClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const [balances, setBalances] = useState<Balances>({
    native: ZERO_BALANCE,
    kintsu: ZERO_BALANCE,
    magma: ZERO_BALANCE,
    wmon: ZERO_BALANCE,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(0);

  // Prevent stale closures with refs
  const addressRef = useRef(smartAccountAddress);
  const clientRef = useRef(publicClient);

  useEffect(() => {
    addressRef.current = smartAccountAddress;
    clientRef.current = publicClient;
  }, [smartAccountAddress, publicClient]);

  const fetchBalances = useCallback(async (silent = false) => {
    const currentAddress = addressRef.current;
    const currentClient = clientRef.current;

    if (!currentAddress || !currentClient) {
      setBalances({
        native: ZERO_BALANCE,
        kintsu: ZERO_BALANCE,
        magma: ZERO_BALANCE,
        wmon: ZERO_BALANCE,
      });
      return;
    }

    if (!silent) setIsLoading(true);
    setError(null);

    try {
      console.log(`[Balances] Fetching for ${currentAddress}...`);

      const balancePromises = [
        currentClient.getBalance({ address: currentAddress }),
        currentClient.readContract({
          address: CONTRACTS.KINTSU,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [currentAddress],
        }),
        currentClient.readContract({
          address: CONTRACTS.GMON,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [currentAddress],
        }),
        currentClient.readContract({
          address: CONTRACTS.WMON,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [currentAddress],
        }),
      ];

      const results = await Promise.allSettled(balancePromises);

      const newBalances: Balances = {
        native: results[0].status === 'fulfilled'
          ? parseFloat(formatUnits(results[0].value, 18)).toFixed(4)
          : ZERO_BALANCE,
        kintsu: results[1].status === 'fulfilled'
          ? parseFloat(formatUnits(results[1].value as bigint, 18)).toFixed(4)
          : ZERO_BALANCE,
        magma: results[2].status === 'fulfilled'
          ? parseFloat(formatUnits(results[2].value as bigint, 18)).toFixed(4)
          : ZERO_BALANCE,
        wmon: results[3].status === 'fulfilled'
          ? parseFloat(formatUnits(results[3].value as bigint, 18)).toFixed(4)
          : ZERO_BALANCE,
      };

      setBalances(prev => {
        const hasChanged = Object.keys(newBalances).some(
          key => prev[key as keyof Balances] !== newBalances[key as keyof Balances]
        );
        if (hasChanged) {
          console.log('[Balances] Updated:', newBalances);
          setLastUpdated(Date.now());
          return newBalances;
        }
        return prev;
      });

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`[Balances] Failed to fetch balance ${index}:`, result.reason);
        }
      });

    } catch (err: any) {
      console.error('[Balances] Fetch error:', err);
      setError(err.message || 'Failed to fetch balances');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Auto-refresh on new blocks (~2s)
  useEffect(() => {
    if (blockNumber && smartAccountAddress) {
      console.log(`[Balances] Block ${blockNumber} - refreshing balances`);
      fetchBalances(true);
    }
  }, [blockNumber, smartAccountAddress, fetchBalances]);

  // Initial fetch or reset
  useEffect(() => {
    if (smartAccountAddress) fetchBalances(false);
    else {
      setBalances({
        native: ZERO_BALANCE,
        kintsu: ZERO_BALANCE,
        magma: ZERO_BALANCE,
        wmon: ZERO_BALANCE,
      });
      setLastUpdated(0);
    }
  }, [smartAccountAddress, fetchBalances]);

  return { balances, isLoading, error, fetchBalances, lastUpdated };
}
