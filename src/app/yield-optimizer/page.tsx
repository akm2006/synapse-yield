// src/app/yield-optimizer/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useDelegation } from '@/hooks/useDelegation';
import { useBalances } from '@/hooks/useBalances';
import SmartAccountManager from '@/components/SmartAccountManager';
import DelegationManager from '@/components/DelegationManager';
import YieldOptimizerInterface from '@/components/YieldOptimizerInterface';
import TransactionLogger from '@/components/TransactionLogger';
import type { Address } from 'viem';
import BalanceDisplay from '@/components/BalanceDisplay';
export default function YieldOptimizerPage() {
  const { isConnected } = useAccount();
  const { smartAccount, smartAccountAddress, isReady } = useSmartAccount();
  
  // Fix 1: Handle null by converting to undefined for useDelegation
  const { delegation, loadExistingDelegation } = useDelegation(
    smartAccountAddress || undefined
  );
  
  // Fix 2: Get the full hook return object
  const balancesHook = useBalances(smartAccountAddress);
  
  const [logs, setLogs] = useState<string[]>([]);
  const [isDelegationReady, setIsDelegationReady] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Load existing delegation on mount
  useEffect(() => {
    if (smartAccountAddress) {
      const existingDelegation = loadExistingDelegation();
      if (existingDelegation) {
        setIsDelegationReady(true);
        addLog('[INFO] Existing delegation loaded successfully');
      }
    }
  }, [smartAccountAddress, loadExistingDelegation]);

  const handleDelegationCreated = (newDelegation: any) => {
    setIsDelegationReady(true);
    addLog('[SUCCESS] Delegation created - Yield Optimizer ready!');
  };

  const handleBalanceRefresh = async () => {
    try {
      // Fix 3: Use fetchBalances instead of refresh
      await balancesHook.fetchBalances(false);
      addLog('[INFO] Balances refreshed successfully');
    } catch (error) {
      addLog('[ERROR] Failed to refresh balances');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold text-white mb-6">
              🚀 Yield Optimizer
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Autonomous yield farming with MetaMask Smart Accounts
            </p>
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-6 text-yellow-200">
              <p className="text-lg">
                Please connect your MetaMask wallet to access the Yield Optimizer
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🚀 Yield Optimizer
          </h1>
          <p className="text-xl text-gray-300">
            Autonomous yield farming with simulated rebalancing
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Setup */}
          <div className="space-y-6">
            {/* Smart Account Setup */}
            {!smartAccountAddress && (
              <SmartAccountManager
                onSmartAccountReady={(address: Address) => addLog(`[SUCCESS] Smart Account ready: ${address}`)}
                onLog={addLog}
              />
            )}
  {smartAccountAddress && (
    <BalanceDisplay smartAccountAddress={smartAccountAddress} onLog={addLog} />
  )}

            {/* Delegation Setup */}
            {smartAccountAddress && !isDelegationReady && (
              <DelegationManager
                smartAccountAddress={smartAccountAddress}
                onDelegationCreated={handleDelegationCreated}
                isCreating={false}
                onLog={addLog}
              />
            )}

          {/* Yield Optimizer Interface */}
{smartAccountAddress && isDelegationReady && (
  <YieldOptimizerInterface
    smartAccountAddress={smartAccountAddress}
    delegation={delegation}
    onLog={addLog}
    onBalanceRefresh={handleBalanceRefresh}
  />
)}
          </div>

          {/* Right Column - Logs */}
          <div>
            <TransactionLogger 
              logs={logs} 
              onClear={() => setLogs([])}
              title="Yield Optimizer Activity"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
