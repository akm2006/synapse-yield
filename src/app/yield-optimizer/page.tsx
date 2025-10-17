'use client';

import { useState, useEffect } from 'react';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useBalances } from '@/hooks/useBalances';
import TransactionLogger from '@/components/TransactionLogger';
import { useLogger } from '@/providers/LoggerProvider';
import { useToasts } from '@/providers/ToastProvider';
import YieldOptimizerInterface from '@/components/YieldOptimizerInterface';
import { useAuth } from '@/providers/AuthProvider';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

// Static data for display purposes
const protocolsData = [
  { name: 'Kintsu', apy: '12.5', tvl: '1.2M', token: 'sMON' },
  { name: 'Magma', apy: '10.8', tvl: '800K', token: 'gMON' }
];

export default function YieldOptimizerPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { smartAccountAddress } = useSmartAccount();
  const { balances, isLoading: balancesLoading, fetchBalances } = useBalances(smartAccountAddress);
  const { logs, addLog, clearLogs } = useLogger();
  const { addToast } = useToasts();
  // start closed; open only when user clicks the button

  // State now tracks if a delegation exists on the backend
  const [hasDelegation, setHasDelegation] = useState(false);
  const [checkingDelegation, setCheckingDelegation] = useState(true);
  const [totalValueLocked, setTotalValueLocked] = useState('0.00');

  // Check for an existing delegation on the backend when the user is authenticated
  useEffect(() => {
    if (isAuthenticated && smartAccountAddress) {
      setCheckingDelegation(true);
      fetch('/api/delegation/status')
        .then(res => res.json())
        .then(data => {
          setHasDelegation(data.hasDelegation);
          if (data.hasDelegation) {
            addLog('[INFO] Verified existing delegation for optimizer.');
          }
        })
        .catch(err => { console.error("Failed to check delegation status", err); try { addToast({ message: 'Failed to check delegation status', type: 'error' }); } catch {} })
        .finally(() => setCheckingDelegation(false));
    } else if (!isAuthenticated) {
      // If not authenticated, we know there's no delegation to check
      setCheckingDelegation(false);
    }
  }, [isAuthenticated, smartAccountAddress, addLog]);


  // Calculate total value locked (no changes needed here)
  useEffect(() => {
    if (balances) {
      const total = (
        parseFloat(balances.native || '0') +
        parseFloat(balances.kintsu || '0') +
        parseFloat(balances.magma || '0')
      ).toFixed(4);
      setTotalValueLocked(total);
    }
  }, [balances]);

  // This handler is now much simpler
  const handleRebalanceComplete = () => {
    addLog('[SUCCESS] Rebalance operation logged.');
    fetchBalances(false);
  };

  // Loading and Authentication checks
  if (isAuthLoading || checkingDelegation) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading Optimizer...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4">
        <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-8 max-w-md">
          <ShieldExclamationIcon className="h-16 w-16 mx-auto text-yellow-400 mb-4" />
          <h2 className="text-2xl font-bold text-white">Authentication Required</h2>
          <p className="text-gray-400 mt-2 mb-6">Please sign in to access the Yield Optimizer.</p>
        </div>
      </div>
    );
  }

  if (!smartAccountAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4">
         <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-8 max-w-md">
            <h2 className="text-2xl font-bold text-white">Smart Account Required</h2>
            <p className="text-gray-400 mt-2 mb-6">Create a smart account on the dashboard to use the optimizer.</p>
            <a href="/dashboard" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl">
              Go to Dashboard
            </a>
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
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
                <ArrowTrendingUpIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Yield Optimizer</h1>
                <p className="text-gray-400">Automated yield maximization across Monad DeFi protocols</p>
              </div>
              <div className="ml-auto">
               
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Portfolio Overview */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Portfolio Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                  <p className="text-sm text-gray-400">Total Value Locked</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {totalValueLocked} <span className="text-lg text-gray-400">MON</span>
                  </p>
                </div>
                <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                  <p className="text-sm text-gray-400">Blended APY</p>
                   <p className="text-2xl font-bold text-green-400 mt-1">
                        {((parseFloat(protocolsData[0].apy) + parseFloat(protocolsData[1].apy)) / 2).toFixed(1)}%
                    </p>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-medium text-white mb-4">Asset Allocation</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-white">Native MON</span>
                    <span className="text-gray-300">{balances?.native || '0.00'} MON</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-white">Kintsu (sMON)</span>
                    <span className="text-gray-300">{balances?.kintsu || '0.00'} sMON</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                   <span className="text-white">Magma (gMON)</span>
                    <span className="text-gray-300">{balances?.magma || '0.00'} gMON</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Performance Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Last Rebalance</span>
                  <span className="text-white">2 hours ago</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Rebalances</span>
                  <span className="text-white">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Gas Saved</span>
                  <span className="text-green-400">0.045 MON</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Yield Generated</span>
                  <span className="text-green-400">+0.156 MON</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Optimizer Controls</h2>
              <YieldOptimizerInterface
                smartAccountAddress={smartAccountAddress}
                hasDelegation={hasDelegation}
                onLog={addLog}
                onBalanceRefresh={handleRebalanceComplete}
              />
            </div>

            

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => fetchBalances(true)}
                  disabled={balancesLoading}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-xl transition-colors"
                >
                  {balancesLoading ? 'Refreshing...' : 'Refresh Balances'}
                </button>
                <a
                  href="/dashboard"
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors text-center block"
                >
                  Back to Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}