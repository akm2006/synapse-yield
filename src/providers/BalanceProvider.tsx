'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { Address } from 'viem';
import { useBalances as useBalancesHook } from '@/hooks/useBalances';
import { useSmartAccount } from '@/hooks/useSmartAccount';

// 1. Define and export the Balances interface here
export interface Balances {
  native: string;
  kintsu: string;
  magma: string;
  wmon: string;
}

// 2. Define the shape of the context data using the exported interface
interface BalanceContextType {
  balances: Balances;
  isLoading: boolean;
  error: string | null;
  fetchBalances: (silent?: boolean) => Promise<void>;
  lastUpdated: number;
  smartAccountAddress: Address | null;
}

// Create the context
const BalanceContext = createContext<BalanceContextType | null>(null);

// Create the provider component
export function BalanceProvider({ children }: { children: ReactNode }) {
  const { smartAccountAddress } = useSmartAccount();
  const balanceState = useBalancesHook(smartAccountAddress);

  const value = {
    ...balanceState,
    smartAccountAddress,
  };

  return (
    <BalanceContext.Provider value={value}>
      {children}
    </BalanceContext.Provider>
  );
}

// Create a custom hook for easy access to the context
export function useBalances() {
  const context = useContext(BalanceContext);
  if (!context) {
    throw new Error('useBalances must be used within a BalanceProvider');
  }
  return context;
}

