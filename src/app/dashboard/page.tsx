'use client';

import { useState, useEffect } from 'react';
import { parseUnits } from 'viem';
import type { Address } from 'viem';
import DelegationManager from "@/components/DelegationManager";
import type { Delegation } from "@metamask/delegation-toolkit";
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useBalances } from '@/hooks/useBalances';
import { useSSEStream } from '@/hooks/useSSEStream';
import { useTokenOperations } from '@/hooks/useTokenOperations';
import { useTransactionLogger } from '@/components/TransactionLogger';
import BalanceDisplay from '@/components/BalanceDisplay';
import SwapInterface from '@/components/SwapInterface';
import TransactionLogger from '@/components/TransactionLogger';
import SmartAccountManager from '../../components/SmartAccountManager';
import TokenTransfer from '../../components/TokenTransfer';
import { CONTRACTS } from '@/lib/contracts';
import Permit2Manager from '@/components/PermitManager';
import { CheckCircleIcon, CogIcon, WalletIcon } from '@heroicons/react/24/outline';

export default function Dashboard() {
  // Use shared hooks
  const { smartAccountAddress, setSmartAccountReady } = useSmartAccount();
  const { balances, isLoading: balancesLoading, fetchBalances } = useBalances(smartAccountAddress);
  const { generateOpId, openStream } = useSSEStream();
  const { stakeKintsu, unstakeKintsu, requestUnlock, redeemUnlock, directSwap } = useTokenOperations();
  const { logs, addLog, clearLogs } = useTransactionLogger();

  // Local state for manual operations
  const [loading, setLoading] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [amt, setAmt] = useState({
    magmaStake: '0.01',
    magmaUnstake: '0.01',
    kintsuStake: '0.02',
    kintsuUnstake: '0.01',
  });
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

  const handleStakeMagma = async (amount: string) => {
    if (!smartAccountAddress || !delegation) {
      return addLog('[ERROR] Smart Account or delegation not ready');
    }
    if (!amount || parseFloat(amount) <= 0) {
      return addLog('[ERROR] Please enter a valid amount');
    }

    const opId = generateOpId();
    openStream(opId, addLog);
    setLoading(true);

    try {
      addLog(`[ACTION] Stake Magma via Delegation: ${amount} MON`);
      const response = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: smartAccountAddress,
          operation: 'stake-magma',
          amount,
          delegation
        }),
      });

      const result = await response.json();
      if (!result.success) {
        return addLog(`[ERROR] stakeMagma: ${result.error}`);
      }

      const lastOp = result.operations?.[result.operations.length - 1];
      if (lastOp?.userOpHash) addLog(`[UO] userOpHash: ${lastOp.userOpHash}`);
      if (lastOp?.txHash) addLog(`[TX] transactionHash: ${lastOp.txHash}`);

      await fetchBalances(false);
      addLog('[SUCCESS] Magma staking completed via delegation!');
    } catch (err: any) {
      addLog(`[ERROR] Stake Magma error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstakeMagma = async (amount: string) => {
    if (!smartAccountAddress || !delegation) {
      return addLog('[ERROR] Smart Account or delegation not ready');
    }
    if (!amount || parseFloat(amount) <= 0) {
      return addLog('[ERROR] Please enter a valid amount');
    }

    const opId = generateOpId();
    openStream(opId, addLog);
    setLoading(true);

    try {
      addLog(`[ACTION] Unstake Magma via Delegation: ${amount} MON`);
      const response = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: smartAccountAddress,
          operation: 'unstake-magma',
          amount,
          delegation
        }),
      });

      const result = await response.json();
      if (!result.success) {
        return addLog(`[ERROR] unstakeMagma: ${result.error}`);
      }

      const lastOp = result.operations?.[result.operations.length - 1];
      if (lastOp?.userOpHash) addLog(`[UO] userOpHash: ${lastOp.userOpHash}`);
      if (lastOp?.txHash) addLog(`[TX] transactionHash: ${lastOp.txHash}`);

      await fetchBalances(false);
      addLog('[SUCCESS] Magma unstaking completed via delegation!');
    } catch (err: any) {
      addLog(`[ERROR] Unstake Magma error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStakeKintsu = async (amount: string) => {
    if (!smartAccountAddress || !delegation) {
      return addLog('[ERROR] Smart Account or delegation not ready');
    }
    if (!amount || parseFloat(amount) <= 0) {
      return addLog('[ERROR] Please enter a valid amount');
    }

    const opId = generateOpId();
    openStream(opId, addLog);
    setLoading(true);

    try {
      addLog(`[ACTION] Stake Kintsu via Delegation: ${amount} MON`);
      const response = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: smartAccountAddress,
          operation: 'stake-kintsu',
          amount,
          delegation
        }),
      });

      const result = await response.json();
      if (!result.success) {
        return addLog(`[ERROR] stakeKintsu: ${result.error}`);
      }

      const lastOp = result.operations?.[result.operations.length - 1];
      if (lastOp?.userOpHash) addLog(`[UO] userOpHash: ${lastOp.userOpHash}`);
      if (lastOp?.txHash) addLog(`[TX] transactionHash: ${lastOp.txHash}`);

      await fetchBalances(false);
      addLog('[SUCCESS] Kintsu staking completed via delegation!');
    } catch (err: any) {
      addLog(`[ERROR] Stake Kintsu error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstakeKintsu = async (amount: string) => {
    if (!smartAccountAddress || !delegation) {
      return addLog('[ERROR] Smart Account or delegation not ready');
    }
    if (!amount || parseFloat(amount) <= 0) {
      return addLog('[ERROR] Please enter a valid amount');
    }

    const opId = generateOpId();
    openStream(opId, addLog);
    setLoading(true);

    try {
      addLog(`[ACTION] Kintsu Instant Unstake via Delegation: ${amount} sMON`);
      
      const amountInWei = BigInt(Math.floor(+amount * 1e18)).toString();
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
          delegation
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        return addLog(`[ERROR] unstakeKintsu: ${result.error}`);
      }

      if (result.operations?.length > 1) {
        result.operations.forEach((op: { userOpHash?: string; txHash?: string; target?: string }, i: number) => {
          addLog(`[OP-${i + 1}] target: ${op.target}, userOpHash: ${op.userOpHash}, txHash: ${op.txHash}`);
        }); 
      }
      
      await fetchBalances(false);
      addLog('[SUCCESS] Kintsu instant unstaking completed via delegation!');
    } catch (err: any) {
      addLog(`[ERROR] Unstake Kintsu error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestUnlock = async (amount: string) => {
    if (!smartAccountAddress) return addLog('[ERROR] Smart Account not ready');
    const opId = generateOpId();
    openStream(opId, addLog);
    try {
      addLog(`[ACTION] Request Unlock Kintsu: ${amount}`);
      
      const response = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: smartAccountAddress,
          operation: 'kintsu-request-unlock',
          amount,
          delegation
        }),
      });

      const result = await response.json();
      if (!result.success) return addLog(`[ERROR] requestUnlock: ${result.error}`);
      
      const lastOp = result.operations?.[0];
      if (lastOp?.userOpHash) addLog(`[UO] userOpHash: ${lastOp.userOpHash}`);
      if (lastOp?.txHash) addLog(`[TX] transactionHash: ${lastOp.txHash}`);
      if (lastOp?.blockNumber) addLog(`[TX] included at block: ${lastOp.blockNumber}`);

      await fetchBalances(false);
    } catch (err: any) {
      addLog(`[ERROR] Request Unlock error: ${err.message || err}`);
    }
  };

  const handleRedeemUnlock = async (unlockIndex: string) => {
    if (!smartAccountAddress) return addLog('[ERROR] Smart Account not ready');
    const opId = generateOpId();
    openStream(opId, addLog);
    try {
      addLog(`[ACTION] Redeem Unlock Index: ${unlockIndex}`);

      const response = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: smartAccountAddress,
          receiver: smartAccountAddress,
          operation: 'kintsu-redeem',
          delegation,
          unlockIndex
        }),
      });

      const result = await response.json();
      if (!result.success) return addLog(`[ERROR] requestUnlock: ${result.error}`);
      
      const lastOp = result.operations?.[0];
      if (lastOp?.userOpHash) addLog(`[UO] userOpHash: ${lastOp.userOpHash}`);
      if (lastOp?.txHash) addLog(`[TX] transactionHash: ${lastOp.txHash}`);
      if (lastOp?.blockNumber) addLog(`[TX] included at block: ${lastOp.blockNumber}`);

      await fetchBalances(false);
    } catch (err: any) {
      addLog(`[ERROR] Redeem Unlock error: ${err.message || err}`);
    }
  };

  const rebalance = async () => {
    if (!smartAccountAddress) return addLog('[ERROR] Smart Account not ready');
    setLoading(true);
    addLog('[ACTION] Starting optimized rebalance');

    try {
      const opId = generateOpId();
      openStream(opId, addLog);

      if (parseFloat(balances.kintsu) > 0.0001) {
        addLog('[INFO] Rebalancing from Kintsu (sMON) → Magma (gMON) via direct swap');
        const amountInWei = BigInt(Math.floor(parseFloat(balances.kintsu) * 1e18)).toString();
        const minOutWei = (BigInt(amountInWei) * 95n / 100n).toString();

        const result = await directSwap(
          CONTRACTS.KINTSU as Address,
          CONTRACTS.GMON as Address,
          amountInWei,
          minOutWei,
          500,
          smartAccountAddress,
          1800,
          opId
        );

        if (!result.success) throw new Error(result.error);
        if (result.userOpHash) addLog(`[UO] userOpHash: ${result.userOpHash}`);
        if (result.txHash) addLog(`[TX] transactionHash: ${result.txHash}`);
        if (result.blockNumber) addLog(`[TX] included at block: ${result.blockNumber}`);
        addLog('[SUCCESS] Direct swap completed in 1 transaction!');

      } else if (parseFloat(balances.magma) > 0.0001) {
        addLog('[INFO] Rebalancing from Magma (gMON) → Kintsu (sMON) via direct swap');
        const amountInWei = BigInt(Math.floor(parseFloat(balances.magma) * 1e18)).toString();
        const minOutWei = (BigInt(amountInWei) * 95n / 100n).toString();

        const result = await directSwap(
          CONTRACTS.GMON as Address,
          CONTRACTS.KINTSU as Address,
          amountInWei,
          minOutWei,
          500,
          smartAccountAddress,
          1800,
          opId
        );

        if (!result.success) throw new Error(result.error);
        if (result.userOpHash) addLog(`[UO] userOpHash: ${result.userOpHash}`);
        if (result.txHash) addLog(`[TX] transactionHash: ${result.txHash}`);
        if (result.blockNumber) addLog(`[TX] included at block: ${result.blockNumber}`);
        addLog('[SUCCESS] Direct swap completed in 1 transaction!');

      } else {
        addLog('[INFO] No funds to rebalance');
      }
    } catch (err: any) {
      addLog(`[ERROR] Rebalance error: ${err.message || err}`);
    } finally {
      await fetchBalances(false);
      setLoading(false);
    }
  };

  const fundSmartAccount = async () => {
    if (!smartAccountAddress) return addLog('[ERROR] Smart Account not ready');
    try {
      const eth = (window as any).ethereum;
      if (!eth) return addLog('[ERROR] No wallet provider found');

      await ensureMonadChain();
      const [from] = await eth.request({ method: 'eth_requestAccounts' });
      if (!from) return addLog('[ERROR] No EOA account connected');

      const valueHex = parseUnits(fundAmount || '0', 18).toString(16);
      if (valueHex === '0') return addLog('[ERROR] Enter a positive amount');

      addLog(`[ACTION] Fund Smart Account: ${fundAmount} MON from ${from}`);
      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: smartAccountAddress,
          value: '0x' + valueHex,
        }],
      });

      addLog(`[TX] fund transactionHash: ${txHash}`);
      await new Promise(r => setTimeout(r, 1200));
      await fetchBalances(false);
    } catch (err: any) {
      addLog(`[ERROR] Fund Smart Account: ${err?.message || err}`);
    }
  };

  const ensureMonadChain = async () => {
    const eth = (window as any).ethereum;
    const monadHex = '0x279f'; // 10143
    const chainId = await eth.request({ method: 'eth_chainId' });
    if (chainId !== monadHex) {
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: monadHex }],
        });
      } catch {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: monadHex,
            chainName: 'Monad Testnet',
            nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
            rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL!],
            blockExplorerUrls: ['https://testnet.monadexplorer.com'],
          }],
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-b border-gray-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="mt-2 text-gray-400">Manage your smart account and delegate staking operations</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Onboarding & Status */}
          <div className="space-y-6">
            {/* Smart Account Manager */}
            {!smartAccountAddress && (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-600/20 rounded-lg">
                    <WalletIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Smart Account Setup</h3>
                </div>
                <SmartAccountManager
                  onSmartAccountReady={(address: Address) => {
                    setSmartAccountReady(true);
                    addLog(`[INFO] Smart Account ready with address: ${address}`);
                  }}
                  onLog={addLog}
                />
              </div>
            )}

            {/* Smart Account Status */}
            {smartAccountAddress && (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Smart Account Active</h3>
                </div>
                <p className="text-sm text-gray-400 mb-2">Address:</p>
                <p className="font-mono text-sm text-blue-400 break-all">{smartAccountAddress}</p>
              </div>
            )}

            {/* Delegation Setup */}
            {smartAccountAddress && !delegation && (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-600/20 rounded-lg">
                    <CogIcon className="h-5 w-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Delegation Setup</h3>
                </div>
                <DelegationManager
                  smartAccountAddress={smartAccountAddress}
                  onDelegationCreated={(newDelegation) => {
                    setDelegation(newDelegation);
                    addLog('[SUCCESS] Delegation setup completed - you can now stake/unstake!');
                  }}
                  isCreating={false}
                  onLog={addLog}
                />
              </div>
            )}

            {/* Delegation Status */}
            {smartAccountAddress && delegation && (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Delegation Active</h3>
                </div>
                <p className="text-gray-400">One-click staking/unstaking enabled via secure delegation</p>
                
                {/* Permit2Manager */}
                <div className="mt-4">
                  <Permit2Manager
                    token={CONTRACTS.KINTSU}
                    spender={CONTRACTS.PANCAKESWAP}
                    amount="1000"
                    userAddress={smartAccountAddress}
                    delegation={delegation}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Main (Center) Column - Core Actions */}
          <div className="space-y-6">
            {/* Balance Display */}
            {smartAccountAddress && (
              <BalanceDisplay
                smartAccountAddress={smartAccountAddress}
              />
            )}

            {/* Fund Account Card */}
            {smartAccountAddress && (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-600/20 rounded-lg">
                    <span className="text-xl">💰</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Fund Account</h3>
                </div>
                <div className="space-y-4">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    placeholder="Amount in MON"
                    className="w-full p-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    onClick={fundSmartAccount}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Fund Account
                  </button>
                  <p className="text-xs text-gray-500">
                    💡 This will prompt your connected wallet to send MON to the smart account
                  </p>
                </div>
              </div>
            )}

            {/* Manage Assets Card */}
            {smartAccountAddress && (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Manage Assets</h3>
                <TokenTransfer
                  smartAccountAddress={smartAccountAddress}
                  balances={{
                    native: balances.native,
                    kintsu: balances.kintsu,
                    magma: balances.magma,
                  }}
                  onLog={addLog}
                  disabled={loading}
                />
              </div>
            )}

            {/* Manual Staking Forms */}
            {smartAccountAddress && delegation && (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-600/20 rounded-lg">
                    <span className="text-xl">⚡</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Manual Staking</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Magma Stake */}
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-600">
                    <h4 className="font-medium text-purple-400 mb-2">Magma</h4>
                    <p className="text-sm text-gray-400 mb-3">Stake MON → gMON</p>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all mb-3"
                      value={amt.magmaStake}
                      onChange={(e) => setAmt((s) => ({ ...s, magmaStake: e.target.value }))}
                      placeholder="Amount"
                    />
                    <button
                      onClick={() => handleStakeMagma(amt.magmaStake)}
                      disabled={loading}
                      className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Stake
                    </button>
                  </div>

                  {/* Magma Unstake */}
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-600">
                    <h4 className="font-medium text-red-400 mb-2">Magma</h4>
                    <p className="text-sm text-gray-400 mb-3">Unstake gMON → MON</p>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all mb-3"
                      value={amt.magmaUnstake}
                      onChange={(e) => setAmt((s) => ({ ...s, magmaUnstake: e.target.value }))}
                      placeholder="Amount"
                    />
                    <button
                      onClick={() => handleUnstakeMagma(amt.magmaUnstake)}
                      disabled={loading}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Unstake
                    </button>
                  </div>

                  {/* Kintsu Stake */}
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-green-400">Kintsu</h4>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">Stake MON → sMON</p>
                    <p className="text-xs text-yellow-400 mb-3">Min: 0.01 MON</p>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all mb-2"
                      value={amt.kintsuStake}
                      onChange={(e) => setAmt((s) => ({ ...s, kintsuStake: e.target.value }))}
                      placeholder="Min: 0.01"
                    />
                    {parseFloat(amt.kintsuStake) > 0 && parseFloat(amt.kintsuStake) < 0.01 && (
                      <div className="flex items-center gap-2 mb-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-xs">
                        <span>⚠️</span>
                        Amount below minimum deposit (0.01 MON)
                      </div>
                    )}
                    <button
                      onClick={() => handleStakeKintsu(amt.kintsuStake)}
                      disabled={loading || parseFloat(amt.kintsuStake) < 0.01}
                      className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Stake
                    </button>
                  </div>

                  {/* Kintsu Instant Unstake */}
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-600">
                    <h4 className="font-medium text-orange-400 mb-2">Kintsu</h4>
                    <p className="text-sm text-gray-400 mb-3">Instant Unstake sMON → MON</p>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all mb-3"
                      value={amt.kintsuUnstake}
                      onChange={(e) => setAmt((s) => ({ ...s, kintsuUnstake: e.target.value }))}
                      placeholder="Amount"
                    />
                    <button
                      onClick={() => handleUnstakeKintsu(amt.kintsuUnstake)}
                      disabled={loading}
                      className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Instant Unstake
                    </button>
                    <p className="text-xs text-gray-500 mt-2">⚡ Swap via PancakeSwap (instant)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {/* Request Unlock */}
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-600">
                    <h4 className="font-medium text-yellow-400 mb-2">Kintsu</h4>
                    <p className="text-sm text-gray-400 mb-3">Request Unlock sMON</p>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all mb-3"
                      value={amt.kintsuUnstake}
                      onChange={(e) => setAmt((s) => ({ ...s, kintsuUnstake: e.target.value }))}
                      placeholder="Amount"
                    />
                    <button
                      onClick={() => handleRequestUnlock(amt.kintsuUnstake)}
                      disabled={loading}
                      className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Request Unlock
                    </button>
                    <p className="text-xs text-gray-500 mt-2">⏱️ Standard unlock (wait period)</p>
                  </div>

                  {/* Redeem Unlock */}
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-600">
                    <h4 className="font-medium text-teal-400 mb-2">Kintsu</h4>
                    <p className="text-sm text-gray-400 mb-3">Redeem Unlock Index</p>
                    <input
                      type="number"
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all mb-3"
                      placeholder="Unlock index (e.g., 0)"
                      defaultValue="0"
                    />
                    <button
                      onClick={() => handleRedeemUnlock('0')}
                      disabled={loading}
                      className="w-full px-3 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Redeem
                    </button>
                  </div>
                </div>

                {/* Rebalance Button */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <button
                    onClick={rebalance}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-lg transition-all"
                  >
                    {loading ? 'Rebalancing...' : 'Auto Rebalance'}
                  </button>
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Automatically balance between Magma and Kintsu
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Activity & Swapping */}
          <div className="space-y-6">
            {/* Swap Interface */}
            {smartAccountAddress && (
              <SwapInterface
                smartAccountAddress={smartAccountAddress}
                balances={balances}
                onLog={addLog}
                disabled={loading}
                onBalanceRefresh={() => fetchBalances(false)}
                delegation={delegation}
              />
            )}

            {/* Transaction Logs */}
            <TransactionLogger
              title="Transaction Logs"
              logs={logs}
              onClear={clearLogs}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
