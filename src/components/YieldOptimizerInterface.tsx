// src/components/YieldOptimizerInterface.tsx
'use client';

import { useState, useEffect } from 'react';
import type { Address } from 'viem';
import { useBalances } from '@/hooks/useBalances'; // Add this import
import APYDisplay from './APYDisplay';
import RebalanceEngine from './RebalanceEngine';
import { generateSimulatedAPY } from '@/utils/yieldOptimizer';

interface YieldOptimizerInterfaceProps {
  smartAccountAddress: Address;
  delegation: any;
  onLog: (message: string) => void;
  onBalanceRefresh: () => void;
}

interface ProtocolData {
  name: string;
  symbol: string;
  apy: number;
  balance: string;
  icon: string;
  color: string;
}

export default function YieldOptimizerInterface({
  smartAccountAddress,
  delegation,
  onLog,
  onBalanceRefresh
}: YieldOptimizerInterfaceProps) {
  // Get real-time balances for APY display
  const { balances } = useBalances(smartAccountAddress);
  
  const [protocolData, setProtocolData] = useState<{
    kintsu: ProtocolData;
    magma: ProtocolData;
  }>({
    kintsu: {
      name: 'Kintsu Protocol',
      symbol: 'sMON',
      apy: 0,
      balance: '0',
      icon: '🥩',
      color: 'from-red-500 to-orange-500'
    },
    magma: {
      name: 'Magma Protocol', 
      symbol: 'gMON',
      apy: 0,
      balance: '0',
      icon: '🏛️',
      color: 'from-purple-500 to-pink-500'
    }
  });

  const [lastRebalance, setLastRebalance] = useState<Date | null>(null);
  const [rebalanceCount, setRebalanceCount] = useState(0);

  // Update APYs and balances periodically
  useEffect(() => {
    const updateData = () => {
      setProtocolData(prev => ({
        kintsu: {
          ...prev.kintsu,
          apy: generateSimulatedAPY(8, 15), // 8-15% range for Kintsu
          balance: balances.kintsu || '0'
        },
        magma: {
          ...prev.magma,  
          apy: generateSimulatedAPY(6, 18), // 6-18% range for Magma
          balance: balances.magma || '0'
        }
      }));
    };

    updateData();
    const interval = setInterval(updateData, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [balances.kintsu, balances.magma]);

  const handleRebalanceComplete = () => {
    setLastRebalance(new Date());
    setRebalanceCount(prev => prev + 1);
    onLog('[SUCCESS] Rebalance operation completed');
    setTimeout(() => {
      onBalanceRefresh();
    }, 2000);
  };

  const totalValue = parseFloat(protocolData.kintsu.balance) + parseFloat(protocolData.magma.balance);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          ⚡ Yield Optimizer
          <span className="text-sm font-normal bg-green-600 text-white px-2 py-1 rounded-full">
            Active
          </span>
        </h2>
        <div className="text-right text-sm text-gray-400">
          <div>Rebalances: {rebalanceCount}</div>
          {lastRebalance && (
            <div>Last: {lastRebalance.toLocaleTimeString()}</div>
          )}
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">Portfolio Overview</h3>
        <div className="text-2xl font-bold text-white mb-2">
          {totalValue.toFixed(4)} MON Total
        </div>
        <div className="text-sm text-gray-300">
          Distributed across {totalValue > 0 ? '2' : '0'} protocols
        </div>
      </div>

      {/* Protocol APY Display */}
      <APYDisplay protocols={protocolData} />

      {/* Rebalance Engine - Updated with simplified props */}
      <RebalanceEngine
        smartAccountAddress={smartAccountAddress}
        delegation={delegation}
        onLog={onLog}
        onRebalanceComplete={handleRebalanceComplete}
        disabled={totalValue === 0}
      />

      {/* Information Panel */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
        <h4 className="text-lg font-semibold text-blue-200 mb-2">
          ℹ️ How It Works
        </h4>
        <div className="text-sm text-blue-200 space-y-2">
          <p>• <strong>Testnet Simulation:</strong> APY values are simulated for demonstration</p>
          <p>• <strong>Rebalance Logic:</strong> Moves funds from larger balance to smaller balance</p>
          <p>• <strong>Real World:</strong> Would compare actual APYs and rebalance to highest yield</p>
          <p>• <strong>Threshold:</strong> In production, would use 5%+ APY difference trigger</p>
        </div>
      </div>
    </div>
  );
}
