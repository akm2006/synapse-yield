'use client';

import { useState, useEffect } from 'react';
import type { Address } from 'viem';
import { useAuth } from '@/providers/AuthProvider';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useBalances } from '@/hooks/useBalances';
import { useTransactionLogger } from '@/components/TransactionLogger';
import SmartAccountManager from '@/components/SmartAccountManager';
import DelegationManager from "@/components/DelegationManager";
import BalanceDisplay from '@/components/BalanceDisplay';
import TransactionLogger from '@/components/TransactionLogger';
import AutomationManager from '@/components/AutomationManager'; 
import { CheckCircleIcon, CogIcon, WalletIcon, ArrowPathIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function Dashboard() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { smartAccountAddress, setSmartAccountReady } = useSmartAccount();
  const { balances, fetchBalances } = useBalances(smartAccountAddress);
  const { logs, addLog, clearLogs } = useTransactionLogger();

  // Delegation state (checked via API)
  const [hasDelegation, setHasDelegation] = useState(false);
  const [checkingDelegation, setCheckingDelegation] = useState(true);

  // Check delegation status on backend
  useEffect(() => {
    if (isAuthenticated && smartAccountAddress) {
      setCheckingDelegation(true);
      fetch('/api/delegation/status')
        .then(res => res.json())
        .then(data => {
          setHasDelegation(data.hasDelegation);
          if (data.hasDelegation) {
            addLog('[INFO] Verified existing delegation on server.');
          }
        })
        .catch(err => console.error('Failed to check delegation status', err))
        .finally(() => setCheckingDelegation(false));
    } else {
      setCheckingDelegation(false);
    }
  }, [isAuthenticated, smartAccountAddress, addLog]);

  // Loading states
  if (isAuthLoading || checkingDelegation) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading Session...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4">
        <div className="max-w-md bg-white/5 p-8 rounded-2xl border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-3">Please Log In</h2>
          <p className="text-gray-400">
            You must be signed in to access your smart account dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950/50 to-gray-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-400">Manage your smart account and view your portfolio</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Onboarding */}
        {!smartAccountAddress && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-blue-600/20 rounded-xl">
                  <WalletIcon className="h-8 w-8 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Welcome to Synapse Yield</h2>
                  <p className="text-gray-400">Get started by creating your smart account</p>
                </div>
              </div>
              <SmartAccountManager
                onSmartAccountReady={(address: Address) => {
                  setSmartAccountReady(true);
                  addLog(`[INFO] Smart Account ready with address: ${address}`);
                }}
                onLog={addLog}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Smart Account Status */}
            {smartAccountAddress && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <CheckCircleIcon className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Smart Account</h3>
                    <p className="text-sm text-gray-400">Active & Ready</p>
                  </div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 mt-4">
                  <p className="text-xs text-gray-500 mb-1">Address</p>
                  <p className="font-mono text-sm text-blue-400 break-all">{smartAccountAddress}</p>
                </div>
              </div>
            )}

            {/* ADD THE NEW COMPONENT HERE */}
            {smartAccountAddress && (
              <AutomationManager
                hasDelegation={hasDelegation}
                onLog={addLog}
              />
            )}
            {/* Delegation Manager */}
            {smartAccountAddress && !hasDelegation && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <CogIcon className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Setup Delegation</h3>
                    <p className="text-sm text-gray-400">Enable automated operations</p>
                  </div>
                </div>
                <DelegationManager
                  smartAccountAddress={smartAccountAddress}
                  onDelegationCreated={() => {
                    setHasDelegation(true);
                    addLog('[SUCCESS] Delegation setup completed!');
                  }}
                  isCreating={false}
                  onLog={addLog}
                />
              </div>
            )}

            {/* Delegation Active */}
            {smartAccountAddress && hasDelegation && (
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Delegation Active</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  One-click & automated operations are enabled.
                </p>
                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-300">All systems operational</span>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {smartAccountAddress && hasDelegation && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    href="/staking"
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 border border-white/10 hover:border-blue-500/50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                        <ArrowPathIcon className="h-5 w-5 text-blue-400" />
                      </div>
                      <span className="text-white font-medium">Stake & Unstake</span>
                    </div>
                    <ChartBarIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                  </Link>

                  <Link
                    href="/swap"
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 border border-white/10 hover:border-purple-500/50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                        <ArrowPathIcon className="h-5 w-5 text-purple-400" />
                      </div>
                      <span className="text-white font-medium">Token Swap</span>
                    </div>
                    <ChartBarIcon className="h-5 w-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                  </Link>

                  <Link
                    href="/yield-optimizer"
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 border border-white/10 hover:border-green-500/50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                        <ChartBarIcon className="h-5 w-5 text-green-400" />
                      </div>
                      <span className="text-white font-medium">Yield Optimizer</span>
                    </div>
                    <ChartBarIcon className="h-5 w-5 text-gray-400 group-hover:text-green-400 transition-colors" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Center Column */}
          <div className="lg:col-span-2 space-y-6">
            {smartAccountAddress && (
              <>
                <BalanceDisplay smartAccountAddress={smartAccountAddress} onLog={addLog} />

                {/* Transaction Log */}
                <TransactionLogger
                  title="Recent Activity"
                  logs={logs}
                  onClear={clearLogs}
                />
              </>
            )}

            {!smartAccountAddress && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
                <div className="text-6xl mb-4">👆</div>
                <h3 className="text-2xl font-bold text-white mb-2">Create Your Smart Account</h3>
                <p className="text-gray-400">Get started by creating your smart account above</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}