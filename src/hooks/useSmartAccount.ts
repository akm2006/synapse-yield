'use client';
import { useState, useCallback } from 'react';
import type { Address } from 'viem';
import { getAAClient } from '@/lib/aaClient';

export function useSmartAccount() {
  const [smartAccountAddress, setSmartAccountAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeSmartAccount = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { client } = await getAAClient();
      const address = client.account.address;
      setSmartAccountAddress(address);
      return address;
    } catch (err: any) {
      const errorMsg = `Failed to initialize Smart Account: ${err.message}`;
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSmartAccountReady = useCallback((address: Address) => {
    setSmartAccountAddress(address);
  }, []);

  return {
    smartAccountAddress,
    isLoading,
    error,
    initializeSmartAccount,
    setSmartAccountReady,
  };
}
