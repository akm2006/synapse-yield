'use client';

import { useState, useEffect } from 'react';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useBalances } from '@/providers/BalanceProvider';
import { useLogger } from '@/providers/LoggerProvider';
import { useToasts } from '@/providers/ToastProvider';
import YieldOptimizerInterface from '@/components/YieldOptimizerInterface';
import { useAuth } from '@/providers/AuthProvider';
import {
  ShieldExclamationIcon,
  KeyIcon,
  LockClosedIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import Card from '@/components/common/Card';
import LiquidBackground from '@/components/layout/LiquidBackground';
import Image from 'next/image';

const GatedState = ({
  icon,
  title,
  description,
  buttonText,
  buttonLink,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}) => (
  <div className="fixed inset-0 flex items-center justify-center z-50">
    <div className="relative w-full max-w-md mx-auto px-6">
      <Card className="backdrop-blur-md bg-slate-900/60 border border-white/10 text-center shadow-2xl">
        <div className="p-8 flex flex-col items-center">
          <div className="mb-4">{icon}</div>
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-gray-400 mb-8">{description}</p>
          <Link
            href={buttonLink}
            className="group relative inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all duration-300 overflow-hidden"
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 flex items-center gap-2">
              {buttonText}
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </Card>
    </div>
  </div>
);


export default function YieldOptimizerPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { smartAccountAddress } = useSmartAccount();
  const { balances, isLoading: balancesLoading, fetchBalances } = useBalances();
  const { addLog } = useLogger();
  const { addToast } = useToasts();

  const [hasDelegation, setHasDelegation] = useState(false);
  const [checkingDelegation, setCheckingDelegation] = useState(true);
  const [totalValueLocked, setTotalValueLocked] = useState('0.00');

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
      setCheckingDelegation(false);
    }
  }, [isAuthenticated, smartAccountAddress, addLog, addToast]);


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

  const handleRebalanceComplete = () => {
    addLog('[SUCCESS] Rebalance operation logged.');
    fetchBalances(false);
  };

  if (isAuthLoading || checkingDelegation) {
     return (
        <LiquidBackground>
            <div className="min-h-screen flex items-center justify-center text-center">
                <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
                <p className="mt-4 text-gray-400">Loading Optimizer...</p>
                </div>
            </div>
        </LiquidBackground>
    );
  }

  if (!isAuthenticated) {
    return <GatedState icon={<ShieldExclamationIcon className="h-12 w-12 mx-auto text-yellow-400"/>} title="Authentication Required" description="Please sign in to access the Yield Optimizer." buttonText="Sign In on Dashobard" buttonLink="/dashboard" />;
  }

  if (!smartAccountAddress) {
    return <GatedState icon={<LockClosedIcon className="h-12 w-12 mx-auto text-yellow-400"/>} title="Smart Account Required" description="Create a smart account on the dashboard to use the optimizer." buttonText="Go to Dashboard" buttonLink="/dashboard" />;
  }
  
  return (
   
       <div>
       {/* Reduced top padding here */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Portfolio Overview */}
          <aside className="lg:col-span-4 space-y-8">
            <Card>
              <h2 className="text-xl font-semibold text-white mb-6">Portfolio Overview</h2>
              <div className="space-y-6">
                <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                  <p className="text-sm text-gray-400">Total Value Locked</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {totalValueLocked} <span className="text-xl text-gray-400">MON</span>
                  </p>
                </div>
                <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                  <p className="text-sm text-gray-400">Blended APY</p>
                   <p className="text-3xl font-bold text-green-400 mt-1">11.75%</p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10">
                <h3 className="text-lg font-medium text-white mb-4">Asset Allocation</h3>
                <div className="space-y-3">
                    {[
                        { name: 'Native MON', balance: balances?.native, icon: '/mon.jpeg'},
                        { name: 'Kintsu (sMON)', balance: balances?.kintsu, icon: '/smon.jpg' },
                        { name: 'Magma (gMON)', balance: balances?.magma, icon: '/gmon.png' }
                    ].map(asset => (
                        <div key={asset.name} className="flex items-center justify-between p-2">
                            <div className="flex items-center gap-3">
                                <Image src={asset.icon} alt={asset.name} width={24} height={24} className="rounded-full"/>
                                <span className="text-sm text-gray-300">{asset.name}</span>
                            </div>
                            <span className="font-mono text-sm text-white">{parseFloat(asset.balance || '0').toFixed(4)}</span>
                        </div>
                    ))}
                </div>
              </div>
            </Card>
          </aside>

          {/* Right Column - Optimizer Interface */}
          <section className="lg:col-span-8">
             <YieldOptimizerInterface
                smartAccountAddress={smartAccountAddress}
                hasDelegation={hasDelegation}
                onLog={addLog}
                onBalanceRefresh={handleRebalanceComplete}
              />
          </section>
        </div>
      </main>
     </div>
  );
}