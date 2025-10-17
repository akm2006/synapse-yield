'use client';

import { useState, useEffect } from 'react';
import type { Address } from 'viem';
import { useAuth } from '@/providers/AuthProvider';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useLogger } from '@/providers/LoggerProvider';
import { useBalances } from '@/providers/BalanceProvider';
import { motion } from 'framer-motion';

// Import the new and refactored components
import SmartAccountManager from '@/components/SmartAccountManager';
import DelegationManager from "@/components/DelegationManager";
import AutomationManager from '@/components/AutomationManager';
import PortfolioSummary from '@/components/modules/dashboard/PortfolioSummary';
import AccountStatusPanel from '@/components/modules/dashboard/AccountStatusPanel';

import { WalletIcon, CogIcon } from '@heroicons/react/24/outline';

export default function Dashboard() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { smartAccountAddress, setSmartAccountReady } = useSmartAccount();
  const { balances } = useBalances();
  const { addLog } = useLogger();

  const [hasDelegation, setHasDelegation] = useState(false);
  const [checkingDelegation, setCheckingDelegation] = useState(true);

  useEffect(() => {
    if (isAuthenticated && smartAccountAddress) {
      setCheckingDelegation(true);
      fetch('/api/delegation/status')
        .then(res => res.json())
        .then(data => {
          setHasDelegation(data.hasDelegation);
          if (data.hasDelegation) {
            addLog('[INFO] Verified existing delegation.');
          }
        })
        .catch(err => {
            console.error('Failed to check delegation status:', err);
            setHasDelegation(false);
        })
        .finally(() => setCheckingDelegation(false));
    } else {
      setHasDelegation(false);
      setCheckingDelegation(false);
    }
  }, [isAuthenticated, smartAccountAddress, addLog]);

  if (isAuthLoading || (isAuthenticated && !smartAccountAddress && checkingDelegation)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading Session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4">
        <div className="max-w-md bg-slate-900/50 p-8 rounded-2xl border border-white/10 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-3">Please Log In</h2>
          <p className="text-gray-400">Sign in with your wallet to access your smart account dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950/50 to-purple-950 pb-20">
      <div className="border-b border-white/10 bg-gradient-to-r from-gray-950/50 to-blue-950/20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-10">
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Dashboard</h1>
            <p className="text-gray-400">Your central control panel for Synapse Yield.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 space-y-8">
            {!smartAccountAddress ? (
              <SmartAccountManager onSmartAccountReady={(address: Address) => setSmartAccountReady(true)} />
            ) : !hasDelegation ? (
              <DelegationManager
                smartAccountAddress={smartAccountAddress}
                onDelegationCreated={() => setHasDelegation(true)}
                isCreating={false}
              />
            ) : (
              <AccountStatusPanel smartAccountAddress={smartAccountAddress} hasDelegation={hasDelegation} />
            )}
          </div>

          <div className="lg:col-span-2 space-y-8">
            {smartAccountAddress ? (
              <>
                <PortfolioSummary balances={balances} />
                {hasDelegation && <AutomationManager hasDelegation={hasDelegation} />}
              </>
            ) : (
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
                <WalletIcon className="h-12 w-12 text-blue-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Create Your Smart Account</h3>
                <p className="text-gray-400 max-w-xs">Follow the steps on the left to activate your Synapse Yield account.</p>
              </div>
            )}
            {smartAccountAddress && !hasDelegation && (
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
                <CogIcon className="h-12 w-12 text-purple-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Setup Delegation</h3>
                <p className="text-gray-400 max-w-xs">Complete delegation to unlock your portfolio and automated features.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
