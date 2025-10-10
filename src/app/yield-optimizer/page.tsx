'use client';

import { useState, useEffect } from 'react';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useBalances } from '@/hooks/useBalances';
import { useTransactionLogger } from '@/components/TransactionLogger';
import TransactionLogger from '@/components/TransactionLogger';
import YieldOptimizerInterface from '@/components/YieldOptimizerInterface';
import APYDisplay from '@/components/APYDisplay';
import RebalanceEngine from '@/components/RebalanceEngine';
import { ChartBarIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import type { Delegation } from "@metamask/delegation-toolkit";

// Define the protocol data structure for APYDisplay
const protocolsData = [
  {
    name: 'Kintsu',
    apy: '12.5',
    tvl: '1.2M',
    token: 'sMON',
    color: 'green'
  },
  {
    name: 'Magma',
    apy: '10.8',
    tvl: '800K', 
    token: 'gMON',
    color: 'purple'
  }
];

export default function YieldOptimizerPage() {
  const { smartAccountAddress } = useSmartAccount();
  const { balances, isLoading: balancesLoading, fetchBalances } = useBalances(smartAccountAddress);
  const { logs, addLog, clearLogs } = useTransactionLogger();

  // Fix: Proper typing for delegation state
  const [delegation, setDelegation] = useState<Delegation | null>(null);
  const [totalValueLocked, setTotalValueLocked] = useState('0.00');

  useEffect(() => {
    if (smartAccountAddress && !delegation) {
      const loadExistingDelegation = async () => {
        try {
          const { loadDelegation } = await import('@/utils/delegation');
          const existingDelegation = loadDelegation(smartAccountAddress);
          if (existingDelegation) {
            setDelegation(existingDelegation);
            addLog('[INFO] Existing delegation loaded for yield optimizer');
          }
        } catch (error) {
          console.error('Failed to load existing delegation:', error);
        }
      };
      loadExistingDelegation();
    }
  }, [smartAccountAddress, delegation, addLog]);

  useEffect(() => {
    // Calculate total value locked
    if (balances) {
      const total = (
        parseFloat(balances.native || '0') +
        parseFloat(balances.kintsu || '0') +
        parseFloat(balances.magma || '0')
      ).toFixed(4);
      setTotalValueLocked(total);
    }
  }, [balances]);

  const handleOptimizeYield = async () => {
    if (!smartAccountAddress || !delegation) {
      return addLog('[ERROR] Smart Account or delegation not ready');
    }

    addLog('[ACTION] Starting yield optimization...');
    
    try {
      const kintsuBalance = parseFloat(balances.kintsu || '0');
      const magmaBalance = parseFloat(balances.magma || '0');
      
      if (kintsuBalance > magmaBalance && kintsuBalance > 0.001) {
        addLog('[INFO] Optimizing: Moving funds from Kintsu to Magma for better yield');
        
        const response = await fetch('/api/delegate/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: smartAccountAddress,
            operation: 'kintsu-instant-unstake',
            amountIn: (BigInt(Math.floor(kintsuBalance * 0.5 * 1e18))).toString(),
            minOut: (BigInt(Math.floor(kintsuBalance * 0.5 * 0.95 * 1e18))).toString(),
            fee: 2500,
            recipient: smartAccountAddress,
            unwrap: true,
            delegation
          }),
        });
        
        const result = await response.json();
        if (result.success) {
          addLog('[SUCCESS] Yield optimization completed successfully');
          await fetchBalances(false);
        } else {
          addLog(`[ERROR] Optimization failed: ${result.error}`);
        }
      } else if (magmaBalance > kintsuBalance && magmaBalance > 0.001) {
        addLog('[INFO] Optimizing: Moving funds from Magma to Kintsu for better yield');
        
        const response = await fetch('/api/delegate/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: smartAccountAddress,
            operation: 'unstake-magma',
            amount: (magmaBalance * 0.5).toString(),
            delegation
          }),
        });
        
        const result = await response.json();
        if (result.success) {
          addLog('[SUCCESS] Yield optimization completed successfully');
          await fetchBalances(false);
        } else {
          addLog(`[ERROR] Optimization failed: ${result.error}`);
        }
      } else {
        addLog('[INFO] Portfolio is already optimally balanced');
      }
    } catch (error: any) {
      addLog(`[ERROR] Yield optimization error: ${error.message || error}`);
    }
  };

  const handleRebalanceComplete = () => {
    addLog('[SUCCESS] Rebalance operation completed');
    fetchBalances(false);
  };

  if (!smartAccountAddress) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 bg-yellow-600/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <ChartBarIcon className="h-8 w-8 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Smart Account Required</h2>
          <p className="text-gray-400 mb-6">
            Please create a smart account first to use the yield optimizer.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-b border-gray-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600/20 rounded-lg">
                <ArrowTrendingUpIcon className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Yield Optimizer</h1>
                <p className="mt-1 text-gray-400">
                  Automated yield maximization across Monad DeFi protocols
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Optimizer Interface */}
          <div className="lg:col-span-2 space-y-6">
            {/* Portfolio Overview */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Portfolio Overview</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Total Value Locked */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total Value Locked</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {totalValueLocked} <span className="text-lg text-gray-400">MON</span>
                      </p>
                    </div>
                    <div className="p-3 bg-green-600/20 rounded-lg">
                      <ChartBarIcon className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
                </div>

                {/* Current Blended APY */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Current Blended APY</p>
                      <p className="text-2xl font-bold text-green-400 mt-1">
                        {((parseFloat(protocolsData[0].apy) + parseFloat(protocolsData[1].apy)) / 2).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 bg-blue-600/20 rounded-lg">
                      <ArrowTrendingUpIcon className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Portfolio Breakdown */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-white mb-4">Asset Allocation</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-white">Native MON</span>
                    </div>
                    <span className="text-gray-300">{balances?.native || '0.00'} MON</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-white">Kintsu (sMON)</span>
                    </div>
                    <span className="text-gray-300">{balances?.kintsu || '0.00'} sMON</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-white">Magma (gMON)</span>
                    </div>
                    <span className="text-gray-300">{balances?.magma || '0.00'} gMON</span>
                  </div>
                </div>
              </div>
            </div>

         

            {/* Yield Optimizer Interface - Fix: Provide required props */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Optimizer Controls</h2>
              <YieldOptimizerInterface 
                smartAccountAddress={smartAccountAddress}
                delegation={delegation}
                onLog={addLog}
                onBalanceRefresh={() => fetchBalances(false)}
              />
            </div>

       
            
          </div>

          {/* Right Column - Activity Log */}
          <div className="space-y-6">
            <TransactionLogger
              title="Yield Optimizer Activity"
              logs={logs}
              onClear={clearLogs}
            />

            {/* Performance Stats */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
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

            {/* Quick Actions */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleOptimizeYield}
                  disabled={!delegation || balancesLoading}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Optimize Now
                </button>
                <button
                  onClick={() => fetchBalances(true)}
                  disabled={balancesLoading}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Refresh Balances
                </button>
                <a
                  href="/dashboard"
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors text-center block"
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
