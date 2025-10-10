'use client';

import { useState, useEffect } from 'react';
import type { Address } from 'viem';
import type { Delegation } from "@metamask/delegation-toolkit";
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useBalances } from '@/hooks/useBalances';
import { useTransactionLogger } from '@/components/TransactionLogger';
import SmartAccountManager from '@/components/SmartAccountManager';
import DelegationManager from "@/components/DelegationManager";
import BalanceDisplay from '@/components/BalanceDisplay';
import TransactionLogger from '@/components/TransactionLogger';
import { CheckCircleIcon, CogIcon, WalletIcon, ArrowPathIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function Dashboard() {
  const { smartAccountAddress, setSmartAccountReady } = useSmartAccount();
  const { balances, fetchBalances } = useBalances(smartAccountAddress);
  const { logs, addLog, clearLogs } = useTransactionLogger();
  const [delegation, setDelegation] = useState<Delegation | null>(null);

  useEffect(() => {
    if (smartAccountAddress && !delegation) {
      const loadExistingDelegation = async () => {
        try {
          const { loadDelegation } = await import('@/utils/delegation');
          const existingDelegation = loadDelegation(smartAccountAddress);
          if (existingDelegation) {
            setDelegation(existingDelegation);
            addLog('[INFO] Existing delegation loaded from storage');
          }
        } catch (error) {
          console.error('Failed to load existing delegation:', error);
        }
      };
      loadExistingDelegation();
    }
  }, [smartAccountAddress, delegation, addLog]);

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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Onboarding Flow */}
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
          {/* Left Column - Account Status */}
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

            {/* Delegation Setup/Status */}
            {smartAccountAddress && !delegation && (
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
                  onDelegationCreated={(newDelegation) => {
                    setDelegation(newDelegation);
                    addLog('[SUCCESS] Delegation setup completed!');
                  }}
                  isCreating={false}
                  onLog={addLog}
                />
              </div>
            )}

            {smartAccountAddress && delegation && (
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Delegation Active</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  One-click operations enabled via secure delegation
                </p>
                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-300">All systems operational</span>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {smartAccountAddress && delegation && (
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

          {/* Center Column - Balance & Portfolio */}
          <div className="lg:col-span-2 space-y-6">
            {smartAccountAddress && (
              <>
                <BalanceDisplay smartAccountAddress={smartAccountAddress} onLog={addLog} />

                {/* Portfolio Overview */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-6">Portfolio Overview</h3>
                  
                  {/* Total Value */}
                  <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 mb-6">
                    <p className="text-sm text-gray-400 mb-2">Total Portfolio Value</p>
                    <p className="text-4xl font-bold text-white">
                      {(
                        parseFloat(balances.native || '0') +
                        parseFloat(balances.kintsu || '0') +
                        parseFloat(balances.magma || '0') +
                        parseFloat(balances.wmon || '0')
                      ).toFixed(4)}{' '}
                      <span className="text-2xl text-gray-400">MON</span>
                    </p>
                  </div>

                  {/* Asset Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Asset Distribution</h4>
                    {[
                      { name: 'Native MON', value: balances.native, color: 'bg-blue-500', icon: '🔷' },
                      { name: 'Kintsu (sMON)', value: balances.kintsu, color: 'bg-red-500', icon: '🥩' },
                      { name: 'Magma (gMON)', value: balances.magma, color: 'bg-purple-500', icon: '🏛️' },
                      { name: 'Wrapped MON', value: balances.wmon, color: 'bg-orange-500', icon: '🔶' }
                    ].map((asset, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{asset.icon}</span>
                          <div>
                            <p className="text-white font-medium">{asset.name}</p>
                            <p className="text-sm text-gray-400">{parseFloat(asset.value || '0').toFixed(4)} tokens</p>
                          </div>
                        </div>
                        <div className={`h-2 w-24 ${asset.color} rounded-full opacity-50`}></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transaction Activity */}
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