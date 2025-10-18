'use client';

import { useState, useEffect } from 'react';
import type { Address } from 'viem';
import { useBalances } from '@/providers/BalanceProvider';
import APYDisplay from './APYDisplay';
import RebalanceEngine from './RebalanceEngine';
import { generateSimulatedAPY } from '@/utils/yieldOptimizer';
import Card from './common/Card';
import { ArrowTrendingUpIcon, InformationCircleIcon, ArrowRightIcon, KeyIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface YieldOptimizerInterfaceProps {
  smartAccountAddress: Address;
  hasDelegation: boolean;
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
  hasDelegation,
  onLog,
  onBalanceRefresh
}: YieldOptimizerInterfaceProps) {
  const { balances } = useBalances();
  
  const [protocolData, setProtocolData] = useState<{
    kintsu: ProtocolData;
    magma: ProtocolData;
  }>({
    kintsu: {
      name: 'Kintsu Protocol',
      symbol: 'sMON',
      apy: 0,
      balance: '0',
      icon: '/kintsu.png', // Changed to image path
      color: 'from-cyan-500 to-blue-500'
    },
    magma: {
      name: 'Magma Protocol', 
      symbol: 'gMON',
      apy: 0,
      balance: '0',
      icon: '/magma.png', // Changed to image path
      color: 'from-orange-500 to-amber-500'
    }
  });

  const [lastRebalance, setLastRebalance] = useState<Date | null>(null);
  const [rebalanceCount, setRebalanceCount] = useState(0);

  useEffect(() => {
    const updateData = () => {
      setProtocolData(prev => ({
        kintsu: {
          ...prev.kintsu,
          apy: generateSimulatedAPY(11, 14),
          balance: balances.kintsu || '0'
        },
        magma: { 
          ...prev.magma, 
          apy: generateSimulatedAPY(9, 12),
          balance: balances.magma || '0'
        }
      }));
    };

    updateData();
    const interval = setInterval(updateData, 10000);

    return () => clearInterval(interval);
  }, [balances.kintsu, balances.magma, balances]);

  const handleRebalanceComplete = () => {
    setLastRebalance(new Date());
    setRebalanceCount(prev => prev + 1);
    onLog('[SUCCESS] Rebalance operation completed');
    setTimeout(() => {
      onBalanceRefresh();
    }, 2000);
  };

  const totalValue = parseFloat(protocolData.kintsu.balance) + parseFloat(protocolData.magma.balance);

  if (!hasDelegation) {
    return (
        <Card>
            <div className="text-center p-8">
                <KeyIcon className="h-12 w-12 mx-auto text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold text-purple-300">Delegation Required</h3>
                <p className="text-gray-400 mt-2 mb-6">
                    Automated and one-click rebalancing requires you to set up delegation first.
                </p>
                <Link
                    href="/dashboard"
                    className="group relative inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-semibold rounded-xl transition-all duration-300 overflow-hidden"
                >
                    <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10 flex items-center gap-2">
                        Setup Delegation
                        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                </Link>
            </div>
        </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <ArrowTrendingUpIcon className="h-7 w-7 text-teal-400" />
          Optimizer Engine
        </h2>
      </div>

      <div className="mb-8">
        <APYDisplay protocols={protocolData} />
      </div>

      <div className="mb-8">
        <RebalanceEngine
          smartAccountAddress={smartAccountAddress}
          delegation={hasDelegation}
          onLog={onLog}
          onRebalanceComplete={handleRebalanceComplete}
          disabled={totalValue === 0}
        />
      </div>

      <div className="mt-8 pt-6 border-t border-white/10">
        <div className="bg-slate-800/50 rounded-lg p-4 flex items-start gap-4">
            <InformationCircleIcon className="h-6 w-6 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
                <h4 className="font-semibold text-white">How It Works</h4>
                <p className="text-sm text-gray-400 mt-1">
                    The optimizer monitors APYs and portfolio balance. In a production environment, it would automatically execute a rebalance to move funds to the highest-yielding protocol. Here, you can trigger it manually to see the one-click transaction flow.
                </p>
            </div>
        </div>
      </div>
    </Card>
  );
}

