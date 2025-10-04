'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Address } from 'viem';
import { formatUnits } from 'viem';
import { browserPublicClient } from '@/lib/smartAccountClient';
import { erc20Abi } from '@/lib/abis';
import { CONTRACTS } from '@/lib/contracts';

export interface Balances {
  native: string;
  kintsu: string;  // sMON
  magma: string;   // gMON
  wmon: string;    // WMON
}

export function useBalances(smartAccountAddress: Address | null) {
  const [balances, setBalances] = useState<Balances>({ 
    native: '0', 
    kintsu: '0', 
    magma: '0',
    wmon: '0'
  });
  const [isLoading, setIsLoading] = useState(false);
  const unwatchRef = useRef<(() => void) | null>(null);
  const lastBlockRef = useRef<bigint>(0n);

  const fetchBalances = useCallback(async (silent = false) => {
    if (!smartAccountAddress) {
      setBalances({ native: '0', kintsu: '0', magma: '0', wmon: '0' });
      return;
    }
    
    if (!silent) setIsLoading(true);
    
    try {
      // Fetch all balances in parallel
      const [nativeBalance, kintsuBalance, magmaBalance, wmonBalance] = await Promise.all([
        browserPublicClient.getBalance({ address: smartAccountAddress }),
        browserPublicClient.readContract({
          address: CONTRACTS.KINTSU as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [smartAccountAddress],
        }).catch(() => 0n),
        browserPublicClient.readContract({
          address: CONTRACTS.GMON as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [smartAccountAddress],
        }).catch(() => 0n),
        browserPublicClient.readContract({
          address: CONTRACTS.WMON as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [smartAccountAddress],
        }).catch(() => 0n),
      ]);

      const newBalances = {
        native: formatUnits(nativeBalance, 18),
        kintsu: formatUnits(kintsuBalance as bigint, 18),
        magma: formatUnits(magmaBalance as bigint, 18),
        wmon: formatUnits(wmonBalance as bigint, 18),
      };

      setBalances(newBalances);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      if (!silent) {
        setBalances({ native: '0', kintsu: '0', magma: '0', wmon: '0' });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [smartAccountAddress]);

  // Auto-fetch when smart account address changes
  useEffect(() => {
    if (smartAccountAddress) {
      fetchBalances(false); // Initial fetch with loading
    }
  }, [smartAccountAddress, fetchBalances]);

  // Set up block watcher for silent updates
  useEffect(() => {
    if (!smartAccountAddress) return;

    try {
      const unwatch = browserPublicClient.watchBlockNumber({
        poll: true,
        pollingInterval: 3000,
        onBlockNumber: async (bn) => {
          if (bn !== lastBlockRef.current) {
            lastBlockRef.current = bn;
            await fetchBalances(true); // Silent refresh
          }
        },
        onError: (e) => console.warn('watchBlockNumber error:', e?.message || e),
      });
      unwatchRef.current = unwatch;
    } catch (e) {
      console.warn('watchBlockNumber unsupported, using fallback polling');
      // Fallback polling
      const interval = setInterval(() => fetchBalances(true), 5000);
      unwatchRef.current = () => clearInterval(interval);
    }

    return () => {
      if (unwatchRef.current) {
        unwatchRef.current();
        unwatchRef.current = null;
      }
    };
  }, [smartAccountAddress, fetchBalances]);

  return { balances, isLoading, fetchBalances };
}
