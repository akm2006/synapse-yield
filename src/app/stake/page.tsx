'use client';

import { useState, useEffect } from 'react';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useBalances } from '@/hooks/useBalances';
import { useSSEStream } from '@/hooks/useSSEStream';
import TransactionLogger from '@/components/TransactionLogger';
import { useLogger } from '@/providers/LoggerProvider';
import { useToasts } from '@/providers/ToastProvider';
import type { Delegation } from "@metamask/delegation-toolkit";
import { useAuth } from '@/providers/AuthProvider'; // Import useAuth
import { ArrowPathIcon, BoltIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function StakingPage() {
  const { smartAccountAddress } = useSmartAccount();
  const { balances, fetchBalances } = useBalances(smartAccountAddress);
  const { generateOpId, openStream } = useSSEStream();
  const { logs, addLog, clearLogs } = useLogger();
  const { addToast } = useToasts();
  // Start logger closed; open it only when user clicks
  const [showLogger, setShowLogger] = useState(false);
  const { isAuthenticated } = useAuth();

  // This state now only tracks if a delegation *exists*
  const [hasDelegation, setHasDelegation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'magma' | 'kintsu'>('magma');
  const [amounts, setAmounts] = useState({
    magmaStake: '',
    magmaUnstake: '',
    kintsuStake: '',
    kintsuUnstake: '',
    kintsuUnlock: '',
    unlockIndex: '0'
  });

  useEffect(() => {
    // NEW LOGIC: Check if a delegation exists on the backend
    const checkDelegationStatus = async () => {
      if (isAuthenticated && smartAccountAddress) {
        try {
          const res = await fetch('/api/delegation/get'); // endpoint should return { hasDelegation: boolean }
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

  const handleStakeMagma = async () => {
    if (!smartAccountAddress || !hasDelegation || !amounts.magmaStake) {
      addToast({ message: 'Missing requirements for staking.', type: 'error' });
      return addLog('[ERROR] Missing requirements');
    }

    const opId = generateOpId();
    openStream(opId, addLog);
    setLoading(true);

    // Immediate UI feedback
    addToast({ message: `Staking ${amounts.magmaStake} MON...`, type: 'info' });

    try {
      addLog(`[ACTION] Staking ${amounts.magmaStake} MON to Magma`);
      const response = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: smartAccountAddress,
          operation: 'stake-magma',
          amount: amounts.magmaStake,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      const lastOp = result.operations?.[result.operations.length - 1];
      if (lastOp?.txHash) addLog(`[TX] ${lastOp.txHash}`);

      await fetchBalances(false);
      addLog('[SUCCESS] Magma staking completed!');
      addToast({ message: 'Stake successful!', type: 'success', txHash: lastOp?.txHash });
      setAmounts(prev => ({ ...prev, magmaStake: '' }));
    } catch (err: any) {
      addLog(`[ERROR] ${err.message}`);
      addToast({ message: 'Staking failed. Check log for details.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnstakeMagma = async () => {
    if (!smartAccountAddress || !hasDelegation || !amounts.magmaUnstake) {
      addToast({ message: 'Missing requirements for unstaking.', type: 'error' });
      return addLog('[ERROR] Missing requirements');
    }

    const opId = generateOpId();
    openStream(opId, addLog);
    setLoading(true);

    // Immediate UI feedback
    addToast({ message: `Unstaking ${amounts.magmaUnstake} gMON...`, type: 'info' });

    try {
      addLog(`[ACTION] Unstaking ${amounts.magmaUnstake} gMON from Magma`);
      const response = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: smartAccountAddress,
          operation: 'unstake-magma',
          amount: amounts.magmaUnstake,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      const lastOp = result.operations?.[result.operations.length - 1];
      if (lastOp?.txHash) addLog(`[TX] ${lastOp.txHash}`);

      await fetchBalances(false);
      addLog('[SUCCESS] Magma unstaking completed!');
      addToast({ message: 'Unstake successful!', type: 'success', txHash: lastOp?.txHash });
      setAmounts(prev => ({ ...prev, magmaUnstake: '' }));
    } catch (err: any) {
      addLog(`[ERROR] ${err.message}`);
      addToast({ message: 'Unstaking failed. Check log for details.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStakeKintsu = async () => {
    if (!smartAccountAddress || !hasDelegation || !amounts.kintsuStake) {
      addToast({ message: 'Missing requirements for staking to Kintsu.', type: 'error' });
      return addLog('[ERROR] Missing requirements');
    }

    if (parseFloat(amounts.kintsuStake) < 0.01) {
      addToast({ message: 'Minimum stake is 0.01 MON', type: 'error' });
      return addLog('[ERROR] Minimum stake is 0.01 MON');
    }

    const opId = generateOpId();
    openStream(opId, addLog);
    setLoading(true);

    // Immediate UI feedback
    addToast({ message: `Staking ${amounts.kintsuStake} MON to Kintsu...`, type: 'info' });

    try {
      addLog(`[ACTION] Staking ${amounts.kintsuStake} MON to Kintsu`);
      const response = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: smartAccountAddress,
          operation: 'stake-kintsu',
          amount: amounts.kintsuStake,
        }),
  });

  const result = await response.json();
      if (!result.success) throw new Error(result.error);

      const lastOp = result.operations?.[result.operations.length - 1];
      if (lastOp?.txHash) addLog(`[TX] ${lastOp.txHash}`);

      await fetchBalances(false);
      addLog('[SUCCESS] Kintsu staking completed!');
      addToast({ message: 'Stake to Kintsu successful!', type: 'success', txHash: lastOp?.txHash });
      setAmounts(prev => ({ ...prev, kintsuStake: '' }));
    } catch (err: any) {
      addLog(`[ERROR] ${err.message}`);
      addToast({ message: 'Kintsu staking failed. Check log for details.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleInstantUnstakeKintsu = async () => {
    if (!smartAccountAddress || !hasDelegation || !amounts.kintsuUnstake) {
      addToast({ message: 'Missing requirements for instant unstake.', type: 'error' });
      return addLog('[ERROR] Missing requirements');
    }

    const opId = generateOpId();
    openStream(opId, addLog);
    setLoading(true);

    // Immediate UI feedback
    addToast({ message: `Instant unstaking ${amounts.kintsuUnstake} sMON...`, type: 'info' });

    try {
      addLog(`[ACTION] Instant unstaking ${amounts.kintsuUnstake} sMON`);
      const amountInWei = BigInt(Math.floor(+amounts.kintsuUnstake * 1e18)).toString();
      const minOutWei = (BigInt(amountInWei) * 99n / 100n).toString();

      const response = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: smartAccountAddress,
          operation: 'kintsu-instant-unstake',
          amountIn: amountInWei,
          minOut: minOutWei,
          fee: 2500,
          recipient: smartAccountAddress,
          unwrap: true,
        }),
  });

  const result = await response.json();
    if (!result.success) throw new Error(result.error);

    const lastOp = result.operations?.[result.operations.length - 1];
    if (lastOp?.txHash) addLog(`[TX] ${lastOp.txHash}`);

    await fetchBalances(false);
    addLog('[SUCCESS] Kintsu instant unstaking completed!');
    addToast({ message: 'Instant unstake successful!', type: 'success', txHash: lastOp?.txHash });
    setAmounts(prev => ({ ...prev, kintsuUnstake: '' }));
    } catch (err: any) {
      addLog(`[ERROR] ${err.message}`);
      addToast({ message: 'Instant unstake failed. Check log for details.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestUnlock = async () => {
    if (!smartAccountAddress || !hasDelegation || !amounts.kintsuUnlock) {
      addToast({ message: 'Missing requirements to request unlock.', type: 'error' });
      return addLog('[ERROR] Missing requirements');
    }

    const opId = generateOpId();
    openStream(opId, addLog);
    setLoading(true);

    // Immediate UI feedback
    addToast({ message: `Requesting unlock for ${amounts.kintsuUnlock} sMON...`, type: 'info' });

    try {
      addLog(`[ACTION] Requesting unlock for ${amounts.kintsuUnlock} sMON`);
      const response = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: smartAccountAddress,
          operation: 'kintsu-request-unlock',
          amount: amounts.kintsuUnlock,
        }),
  });

  const result = await response.json();
      if (!result.success) throw new Error(result.error);

      const lastOp = result.operations?.[0];
      if (lastOp?.txHash) addLog(`[TX] ${lastOp.txHash}`);

      await fetchBalances(false);
      addLog('[SUCCESS] Unlock request submitted!');
      addToast({ message: 'Unlock request submitted!', type: 'success', txHash: lastOp?.txHash });
      setAmounts(prev => ({ ...prev, kintsuUnlock: '' }));
    } catch (err: any) {
      addLog(`[ERROR] ${err.message}`);
      addToast({ message: 'Unlock request failed. Check log for details.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemUnlock = async () => {
    if (!smartAccountAddress || !hasDelegation) {
      addToast({ message: 'Missing requirements to redeem unlock.', type: 'error' });
      return addLog('[ERROR] Missing requirements');
    }

    const opId = generateOpId();
    openStream(opId, addLog);
    setLoading(true);

    // Immediate UI feedback
    addToast({ message: `Redeeming unlock index ${amounts.unlockIndex}...`, type: 'info' });

    try {
      addLog(`[ACTION] Redeeming unlock index ${amounts.unlockIndex}`);
      const response = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: smartAccountAddress,
          receiver: smartAccountAddress,
          operation: 'kintsu-redeem',
          unlockIndex: amounts.unlockIndex
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      const lastOp = result.operations?.[0];
      if (lastOp?.txHash) addLog(`[TX] ${lastOp.txHash}`);

      await fetchBalances(false);
      addLog('[SUCCESS] Unlock redeemed successfully!');
      addToast({ message: 'Redeem successful!', type: 'success', txHash: lastOp?.txHash });
    } catch (err: any) {
      addLog(`[ERROR] ${err.message}`);
      addToast({ message: 'Redeem failed. Check log for details.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!smartAccountAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950/50 to-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-2">Smart Account Required</h2>
          <p className="text-gray-400 mb-6">Create a smart account to access staking features</p>
          <a href="/dashboard" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors inline-block">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (!hasDelegation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950/50 to-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Delegation Required</h2>
          <p className="text-gray-400 mb-6">Setup delegation to enable one-click staking operations</p>
          <a href="/dashboard" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors inline-block">
            Setup Delegation
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
            <h1 className="text-4xl font-bold text-white mb-2">Staking Operations</h1>
            <p className="text-gray-400">Stake and unstake across Magma and Kintsu protocols</p>
            <div className="mt-4">
              <button
                onClick={() => {
                  // trigger test toasts: info, success (with example tx), error
                  addToast({ message: 'This is an info toast (test)', type: 'info' });
                  addToast({ message: 'This is a success toast (test)', type: 'success', txHash: '0x1234abcd' });
                  addToast({ message: 'This is an error toast (test)', type: 'error' });
                }}
                className="px-3 py-2 mt-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Test Toasts
              </button>
              <button
                onClick={() => setShowLogger(true)}
                className="px-3 py-2 mt-2 ml-3 bg-gray-800/60 text-white rounded-lg hover:bg-gray-800"
              >
                Show Logs
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left - Protocol Selection */}
          <div className="space-y-6">
            {/* Protocol Tabs */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-2">
              <button
                onClick={() => setActiveTab('magma')}
                className={`w-full p-4 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'magma'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">🏛️</span>
                  <span>Magma Protocol</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('kintsu')}
                className={`w-full p-4 rounded-xl font-medium transition-all duration-200 mt-2 ${
                  activeTab === 'kintsu'
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">🥩</span>
                  <span>Kintsu Protocol</span>
                </div>
              </button>
            </div>

            {/* Protocol Info */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Protocol Info</h3>
              {activeTab === 'magma' ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">APY</span>
                    <span className="text-purple-400 font-semibold">10.8%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">TVL</span>
                    <span className="text-white">$800K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Your Balance</span>
                    <span className="text-white">{parseFloat(balances.magma || '0').toFixed(4)} gMON</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">APY</span>
                    <span className="text-red-400 font-semibold">12.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">TVL</span>
                    <span className="text-white">$1.2M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Your Balance</span>
                    <span className="text-white">{parseFloat(balances.kintsu || '0').toFixed(4)} sMON</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Min. Deposit</span>
                    <span className="text-yellow-400">0.01 MON</span>
                  </div>
                </div>
              )}
            </div>

            {/* Available Balance */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
              <p className="text-sm text-gray-400 mb-2">Available MON</p>
              <p className="text-3xl font-bold text-white">{parseFloat(balances.native || '0').toFixed(4)}</p>
            </div>
          </div>

          {/* Center - Staking Forms */}
          <div className="space-y-6">
            {activeTab === 'magma' ? (
              <>
                {/* Magma Stake */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <ArrowPathIcon className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Stake MON</h3>
                      <p className="text-sm text-gray-400">Convert MON → gMON</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Amount to Stake</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={amounts.magmaStake}
                        onChange={(e) => setAmounts(prev => ({ ...prev, magmaStake: e.target.value }))}
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleStakeMagma}
                      disabled={loading || !amounts.magmaStake}
                      className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Staking...' : 'Stake to Magma'}
                    </button>
                  </div>
                </div>

                {/* Magma Unstake */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <ArrowPathIcon className="h-6 w-6 text-red-400 rotate-180" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Unstake gMON</h3>
                      <p className="text-sm text-gray-400">Convert gMON → MON</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Amount to Unstake</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={amounts.magmaUnstake}
                        onChange={(e) => setAmounts(prev => ({ ...prev, magmaUnstake: e.target.value }))}
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleUnstakeMagma}
                      disabled={loading || !amounts.magmaUnstake}
                      className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Unstaking...' : 'Unstake from Magma'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Kintsu Stake */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <ArrowPathIcon className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Stake MON</h3>
                      <p className="text-sm text-gray-400">Convert MON → sMON</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Amount to Stake (Min: 0.01)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amounts.kintsuStake}
                        onChange={(e) => setAmounts(prev => ({ ...prev, kintsuStake: e.target.value }))}
                        placeholder="0.01"
                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                      />
                      {parseFloat(amounts.kintsuStake) > 0 && parseFloat(amounts.kintsuStake) < 0.01 && (
                        <p className="text-sm text-yellow-400 mt-2">⚠️ Amount below minimum (0.01 MON)</p>
                      )}
                    </div>
                    <button
                      onClick={handleStakeKintsu}
                      disabled={loading || !amounts.kintsuStake || parseFloat(amounts.kintsuStake) < 0.01}
                      className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Staking...' : 'Stake to Kintsu'}
                    </button>
                  </div>
                </div>

                {/* Kintsu Instant Unstake */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <BoltIcon className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Instant Unstake</h3>
                      <p className="text-sm text-gray-400">Convert sMON → MON (via DEX)</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Amount to Unstake</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={amounts.kintsuUnstake}
                        onChange={(e) => setAmounts(prev => ({ ...prev, kintsuUnstake: e.target.value }))}
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleInstantUnstakeKintsu}
                      disabled={loading || !amounts.kintsuUnstake}
                      className="w-full px-6 py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Unstaking...' : '⚡ Instant Unstake'}
                    </button>
                    <p className="text-xs text-gray-500 text-center">Instant withdrawal via PancakeSwap</p>
                  </div>
                </div>

                {/* Kintsu Request Unlock */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-yellow-500/20 rounded-lg">
                      <ClockIcon className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Request Unlock</h3>
                      <p className="text-sm text-gray-400">Standard unlock (wait period)</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Amount to Unlock</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={amounts.kintsuUnlock}
                        onChange={(e) => setAmounts(prev => ({ ...prev, kintsuUnlock: e.target.value }))}
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleRequestUnlock}
                      disabled={loading || !amounts.kintsuUnlock}
                      className="w-full px-6 py-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Requesting...' : 'Request Unlock'}
                    </button>
                  </div>
                </div>

                {/* Kintsu Redeem Unlock */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-teal-500/20 rounded-lg">
                      <BoltIcon className="h-6 w-6 text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Redeem Unlock</h3>
                      <p className="text-sm text-gray-400">Claim unlocked tokens</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Unlock Index</label>
                      <input
                        type="number"
                        min="0"
                        value={amounts.unlockIndex}
                        onChange={(e) => setAmounts(prev => ({ ...prev, unlockIndex: e.target.value }))}
                        placeholder="0"
                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleRedeemUnlock}
                      disabled={loading}
                      className="w-full px-6 py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Redeeming...' : 'Redeem Unlock'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right - Activity Log */}
          <div>
            {showLogger && (
              <TransactionLogger
                logs={logs}
                onClear={clearLogs}
                onClose={() => setShowLogger(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}