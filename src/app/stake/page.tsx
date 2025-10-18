'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useBalances } from '@/providers/BalanceProvider';
import { useSSEStream } from '@/hooks/useSSEStream';
import { useLogger } from '@/providers/LoggerProvider';
import { useToasts } from '@/providers/ToastProvider';
import { useAuth } from '@/providers/AuthProvider';
import {
  BoltIcon,
  ClockIcon,
  LockClosedIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import Card from '@/components/common/Card';
import LiquidBackground from '@/components/layout/LiquidBackground';
import Link from 'next/link';

// --- Sub-components for Staking Page ---

const AmountInput = ({ value, onChange, onMaxClick, disabled, maxBalance }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onMaxClick: () => void, disabled: boolean, maxBalance: string }) => (
  <div className="relative">
    <input
      type="number"
      step="0.001"
      min="0"
      value={value}
      onChange={onChange}
      placeholder="0.00"
      className="w-full pl-4 pr-24 py-3 bg-slate-800/50 border-2 border-slate-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
      disabled={disabled}
    />
    <button
      onClick={onMaxClick}
      className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-slate-700/70 text-blue-300 text-xs font-semibold rounded-md hover:bg-slate-600/70 transition-colors disabled:opacity-50"
      disabled={disabled || parseFloat(maxBalance) <= 0}
    >
      MAX
    </button>
  </div>
);

const ConversionDisplay = ({ from, to }: { from: 'MON' | 'gMON' | 'sMON', to: 'MON' | 'gMON' | 'sMON' }) => {
    const tokenInfo = {
        MON: { icon: '/mon.jpeg' },
        gMON: { icon: '/gmon.png' },
        sMON: { icon: '/smon.jpg' },
    }
    return (
        <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="font-medium">Convert</span>
            <Image src={tokenInfo[from].icon} alt={from} width={16} height={16} className="rounded-full" />
            <span className="font-semibold text-gray-300">{from}</span>
            <ArrowRightIcon className="h-3 w-3 text-gray-500" />
            <Image src={tokenInfo[to].icon} alt={to} width={16} height={16} className="rounded-full" />
            <span className="font-semibold text-gray-300">{to}</span>
        </div>
    )
};


const ActionCard = ({ icon, title, description, children }: { icon: React.ReactNode, title: string, description: React.ReactNode, children: React.ReactNode }) => (
  <Card>
    <div className="flex items-center gap-4 mb-6">
      <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg bg-slate-800 ring-2 ring-white/10">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {description}
      </div>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </Card>
);

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
  <LiquidBackground>
    <Card className="max-w-fit text-center backdrop-blur-xl bg-slate-900/70 border border-white/10 shadow-2xl flex flex-row items-center justify-center my-auto mx-auto">
      <div className="p-8">
        <div className="flex justify-center mb-4">{icon}</div>
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-gray-400 mb-8">{description}</p>
        <Link
          href={buttonLink}
          className="group relative inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-700 via-purple-600 to-teal-700 font-semibold text-white rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all duration-300 overflow-hidden"
        >
          <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative z-10 flex items-center gap-2">
            {buttonText}
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </div>
    </Card>
  </LiquidBackground>
);


// --- Main Staking Page Component ---

export default function StakingPage() {
  const { smartAccountAddress } = useSmartAccount();
  const { balances, fetchBalances } = useBalances();
  const { generateOpId, openStream } = useSSEStream();
  const { addLog } = useLogger();
  const { addToast } = useToasts();
  const { isAuthenticated } = useAuth();

  const [hasDelegation, setHasDelegation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'magma' | 'kintsu'>('magma');
  const [amounts, setAmounts] = useState({
    magmaStake: '',
    magmaUnstake: '',
    kintsuStake: '',
    kintsuUnstake: '',
    kintsuUnlock: '',
    unlockIndex: '0',
  });

  useEffect(() => {
    const checkDelegationStatus = async () => {
      if (isAuthenticated && smartAccountAddress) {
        try {
          const res = await fetch('/api/delegation/get');
          if (res.ok) {
            const data = await res.json();
            setHasDelegation(!!data.hasDelegation);
          }
        } catch (error) {
          console.error('Failed to check delegation status:', error);
        }
      }
    };
    checkDelegationStatus();
  }, [isAuthenticated, smartAccountAddress]);

  const executeOperation = async (operation: string, body: any, successMessage: string, failureMessage: string) => {
    setLoading(true);
    const opId = generateOpId();
    openStream(opId, addLog);
    addToast({ message: `${successMessage.replace(/successful!|submitted!/, '...')}`, type: 'loading', duration: 30000 });
    
    try {
      addLog(`[ACTION] ${operation}`);
      const response = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: smartAccountAddress,
          operation,
          ...body,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      const lastOp = result.operations?.[result.operations.length - 1];
      if (lastOp?.txHash) addLog(`[TX] ${lastOp.txHash}`);
      
      await fetchBalances(true);
      addLog(`[SUCCESS] ${successMessage}`);
      addToast({ message: successMessage, type: 'success', txHash: lastOp?.txHash });
      return true;
    } catch (err: any) {
      addLog(`[ERROR] ${err.message}`);
      addToast({ message: failureMessage, type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  const handleStakeMagma = async () => {
    if (await executeOperation('stake-magma', { amount: amounts.magmaStake }, 'Magma stake successful!', 'Magma staking failed.')) {
      setAmounts(prev => ({ ...prev, magmaStake: '' }));
    }
  };
  const handleUnstakeMagma = async () => {
     if (await executeOperation('unstake-magma', { amount: amounts.magmaUnstake }, 'Magma unstake successful!', 'Magma unstaking failed.')) {
      setAmounts(prev => ({ ...prev, magmaUnstake: '' }));
    }
  };
  const handleStakeKintsu = async () => {
    if (parseFloat(amounts.kintsuStake) < 0.01) return addToast({ message: 'Minimum stake is 0.01 MON', type: 'error' });
    if (await executeOperation('stake-kintsu', { amount: amounts.kintsuStake }, 'Kintsu stake successful!', 'Kintsu staking failed.')) {
      setAmounts(prev => ({ ...prev, kintsuStake: '' }));
    }
  };
  const handleInstantUnstakeKintsu = async () => {
    const amountInWei = BigInt(Math.floor(+amounts.kintsuUnstake * 1e18)).toString();
    const body = { amountIn: amountInWei, minOut: (BigInt(amountInWei) * 99n / 100n).toString(), fee: 2500, recipient: smartAccountAddress, unwrap: true };
    if (await executeOperation('kintsu-instant-unstake', body, 'Instant unstake successful!', 'Instant unstake failed.')) {
      setAmounts(prev => ({ ...prev, kintsuUnstake: '' }));
    }
  };
  const handleRequestUnlock = async () => {
     if (await executeOperation('kintsu-request-unlock', { amount: amounts.kintsuUnlock }, 'Unlock request submitted!', 'Unlock request failed.')) {
      setAmounts(prev => ({ ...prev, kintsuUnlock: '' }));
    }
  };
  const handleRedeemUnlock = async () => {
     await executeOperation('kintsu-redeem', { unlockIndex: amounts.unlockIndex, receiver: smartAccountAddress }, 'Redeem successful!', 'Redeem failed.');
  };

  if (!smartAccountAddress) {
    return <GatedState icon={<LockClosedIcon className="h-12 w-12  text-yellow-400"/>} title="Smart Account Required" description="Create a smart account on the dashboard to access staking features." buttonText="Go to Dashboard" buttonLink="/dashboard" />;
  }

  if (!hasDelegation) {
    return <GatedState icon={<KeyIcon className="h-12 w-12 text-purple-400"/>} title="Delegation Required" description="Setup delegation to enable one-click staking operations." buttonText="Setup Delegation" buttonLink="/dashboard" />;
  }

  return (
    <LiquidBackground>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <aside className="lg:col-span-4 space-y-8">
            <Card>
              <div className="flex space-x-2 p-1 bg-slate-800/50 rounded-lg">
                <button onClick={() => setActiveTab('magma')} className={`w-1/2 p-3 rounded-md font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2.5 ${activeTab === 'magma' ? 'bg-slate-700 text-white shadow-md' : 'text-gray-400 hover:bg-slate-700/50'}`}>
                  <Image src="/gmon.png" alt="Magma" width={24} height={24} className="rounded-full"/>
                  Magma
                </button>
                <button onClick={() => setActiveTab('kintsu')} className={`w-1/2 p-3 rounded-md font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2.5 ${activeTab === 'kintsu' ? 'bg-slate-700 text-white shadow-md' : 'text-gray-400 hover:bg-slate-700/50'}`}>
                   <Image src="/smon.jpg" alt="Kintsu" width={24} height={24} className="rounded-full"/>
                  Kintsu
                </button>
              </div>
            </Card>

            <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Protocol Information</h3>
                {activeTab === 'magma' ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">APY</span><span className="font-semibold text-orange-400">10.8%</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">TVL</span><span className="font-medium text-white">$800K</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Your Balance</span><span className="font-mono text-white">{parseFloat(balances.magma || '0').toFixed(4)} gMON</span></div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">APY</span><span className="font-semibold text-cyan-400">12.5%</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">TVL</span><span className="font-medium text-white">$1.2M</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Your Balance</span><span className="font-mono text-white">{parseFloat(balances.kintsu || '0').toFixed(4)} sMON</span></div>
                  </div>
                )}
                 <div className="mt-6 pt-4 border-t border-white/10">
                    <p className="text-sm text-gray-400 mb-1">Available to Stake</p>
                    <div className="flex items-baseline gap-2">
                        <Image src="/mon.jpeg" alt="MON" width={28} height={28} className="rounded-full" />
                        <p className="text-3xl font-bold text-white">{parseFloat(balances.native || '0').toFixed(4)}</p>
                        <span className="text-xl font-medium text-gray-400">MON</span>
                    </div>
                 </div>
            </Card>
          </aside>

          <section className="lg:col-span-8 space-y-8">
            {activeTab === 'magma' ? (
              <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ActionCard icon={<ArrowUpTrayIcon className="h-7 w-7 text-orange-400" />} title="Stake to Magma" description={<ConversionDisplay from="MON" to="gMON" />}>
                  <AmountInput value={amounts.magmaStake} onChange={(e) => setAmounts(prev => ({ ...prev, magmaStake: e.target.value }))} onMaxClick={() => setAmounts(prev => ({...prev, magmaStake: balances.native}))} disabled={loading} maxBalance={balances.native} />
                  <motion.button onClick={handleStakeMagma} disabled={loading || !amounts.magmaStake} className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:brightness-110 disabled:bg-slate-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all" whileTap={{ scale: 0.98 }}>
                    {loading ? 'Processing...' : 'Stake'}
                  </motion.button>
                </ActionCard>
                <ActionCard icon={<ArrowDownTrayIcon className="h-7 w-7 text-orange-400" />} title="Unstake from Magma" description={<ConversionDisplay from="gMON" to="MON" />}>
                   <AmountInput value={amounts.magmaUnstake} onChange={(e) => setAmounts(prev => ({ ...prev, magmaUnstake: e.target.value }))} onMaxClick={() => setAmounts(prev => ({...prev, magmaUnstake: balances.magma}))} disabled={loading} maxBalance={balances.magma} />
                   <motion.button onClick={handleUnstakeMagma} disabled={loading || !amounts.magmaUnstake} className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all" whileTap={{ scale: 0.98 }}>
                    {loading ? 'Processing...' : 'Unstake'}
                  </motion.button>
                </ActionCard>
              </motion.div>
            ) : (
              <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <ActionCard icon={<ArrowUpTrayIcon className="h-7 w-7 text-cyan-400" />} title="Stake to Kintsu" description={<ConversionDisplay from="MON" to="sMON" />}>
                  <AmountInput value={amounts.kintsuStake} onChange={(e) => setAmounts(prev => ({ ...prev, kintsuStake: e.target.value }))} onMaxClick={() => setAmounts(prev => ({...prev, kintsuStake: balances.native}))} disabled={loading} maxBalance={balances.native} />
                  {parseFloat(amounts.kintsuStake) > 0 && parseFloat(amounts.kintsuStake) < 0.01 && (<p className="text-xs text-yellow-400 text-center flex items-center gap-2"><ExclamationTriangleIcon className="h-4 w-4"/> Minimum stake is 0.01 MON</p>)}
                  <motion.button onClick={handleStakeKintsu} disabled={loading || !amounts.kintsuStake || parseFloat(amounts.kintsuStake) < 0.01} className="w-full bg-gradient-to-r from-cyan-600 to-blue-500 hover:brightness-110 disabled:bg-slate-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all" whileTap={{ scale: 0.98 }}>
                    {loading ? 'Processing...' : 'Stake'}
                  </motion.button>
                 </ActionCard>
                 <ActionCard icon={<BoltIcon className="h-7 w-7 text-purple-400" />} title="Instant Unstake" description={<ConversionDisplay from="sMON" to="MON" />}>
                  <AmountInput value={amounts.kintsuUnstake} onChange={(e) => setAmounts(prev => ({ ...prev, kintsuUnstake: e.target.value }))} onMaxClick={() => setAmounts(prev => ({...prev, kintsuUnstake: balances.kintsu}))} disabled={loading} maxBalance={balances.kintsu} />
                   <motion.button onClick={handleInstantUnstakeKintsu} disabled={loading || !amounts.kintsuUnstake} className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 hover:brightness-110 disabled:bg-slate-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all" whileTap={{ scale: 0.98 }}>
                    {loading ? 'Processing...' : 'Instant Unstake'}
                  </motion.button>
                 </ActionCard>
                 <ActionCard icon={<ClockIcon className="h-7 w-7 text-yellow-400" />} title="Request Unlock" description="Standard unlock (wait period)">
                  <AmountInput value={amounts.kintsuUnlock} onChange={(e) => setAmounts(prev => ({ ...prev, kintsuUnlock: e.target.value }))} onMaxClick={() => setAmounts(prev => ({...prev, kintsuUnlock: balances.kintsu}))} disabled={loading} maxBalance={balances.kintsu}/>
                   <motion.button onClick={handleRequestUnlock} disabled={loading || !amounts.kintsuUnlock} className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all" whileTap={{ scale: 0.98 }}>
                    {loading ? 'Processing...' : 'Request Unlock'}
                  </motion.button>
                 </ActionCard>
                  <ActionCard icon={<KeyIcon className="h-7 w-7 text-teal-400" />} title="Redeem Unlock" description="Claim unlocked tokens">
                    <input type="number" value={amounts.unlockIndex} onChange={(e) => setAmounts(prev => ({ ...prev, unlockIndex: e.target.value }))} placeholder="Unlock Index" className="w-full px-4 py-3 bg-slate-800/50 border-2 border-slate-700 rounded-xl text-white placeholder-gray-500 focus:border-teal-500 transition-all" disabled={loading} />
                    <motion.button onClick={handleRedeemUnlock} disabled={loading} className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all" whileTap={{ scale: 0.98 }}>
                      {loading ? 'Processing...' : 'Redeem'}
                    </motion.button>
                  </ActionCard>
              </motion.div>
            )}
          </section>
        </div>
      </main>
    </LiquidBackground>
  );
}

