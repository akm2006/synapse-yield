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
import SmartAccountManager from './components/SmartAccountManager';
import TokenTransfer from './components/TokenTransfer';
import { CONTRACTS } from '@/lib/contracts';

export default function Home() {
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

      if (result.userOpHash) addLog(`[UO] userOpHash: ${result.userOpHash}`);
      if (result.txHash) addLog(`[TX] transactionHash: ${result.txHash}`);

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

      if (result.userOpHash) addLog(`[UO] userOpHash: ${result.userOpHash}`);
      if (result.txHash) addLog(`[TX] transactionHash: ${result.txHash}`);

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

      if (result.userOpHash) addLog(`[UO] userOpHash: ${result.userOpHash}`);
      if (result.txHash) addLog(`[TX] transactionHash: ${result.txHash}`);

      await fetchBalances(false);
      addLog('[SUCCESS] Kintsu staking completed via delegation!');
    } catch (err: any) {
      addLog(`[ERROR] Stake Kintsu error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstakeKintsu = async (amount: string) => {
    if (!smartAccountAddress) return addLog('[ERROR] Smart Account not ready');

    try {
      const amountInWei = BigInt(Math.floor(+amount * 1e18)).toString();
      const minOutWei = (BigInt(amountInWei) * 99n) / 100n + '';
      const fee = 2500;
      const opId = generateOpId();
      openStream(opId, addLog);

      addLog(`[ACTION] Kintsu Instant Unstake via Pancake (Smart Account): ${amount}`);
      const result = await unstakeKintsu(
        amountInWei,
        minOutWei,
        fee,
        smartAccountAddress,
        true,
        1800,
        opId
      );

      if (!result.ok) return addLog(`[ERROR] Unstake Kintsu: ${result.error}`);
      if (result.userOpHash) addLog(`[UO] userOpHash: ${result.userOpHash}`);
      if (result.transactionHash) addLog(`[TX] transactionHash: ${result.transactionHash}`);
      if (result.blockNumber) addLog(`[TX] included at block: ${result.blockNumber}`);
      if (result.batchedCalls) addLog(`[INFO] Batched ${result.batchedCalls} calls in one UserOperation`);

      await fetchBalances(false);
    } catch (err: any) {
      addLog(`[ERROR] Unstake Kintsu flow: ${err.message || err}`);
    }
  };

  const handleRequestUnlock = async (amount: string) => {
    if (!smartAccountAddress) return addLog('[ERROR] Smart Account not ready');

    const opId = generateOpId();
    openStream(opId, addLog);

    try {
      addLog(`[ACTION] Request Unlock Kintsu: ${amount}`);
      const result = await requestUnlock(amount, opId);

      if (!result.ok) return addLog(`[ERROR] requestUnlock: ${result.error}`);
      if (result.userOpHash) addLog(`[UO] userOpHash: ${result.userOpHash}`);
      if (result.transactionHash) addLog(`[TX] transactionHash: ${result.transactionHash}`);
      if (result.blockNumber) addLog(`[TX] included at block: ${result.blockNumber}`);

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
      const result = await redeemUnlock(unlockIndex, smartAccountAddress, opId);

      if (!result.ok) return addLog(`[ERROR] redeem: ${result.error}`);
      if (result.userOpHash) addLog(`[UO] userOpHash: ${result.userOpHash}`);
      if (result.transactionHash) addLog(`[TX] transactionHash: ${result.transactionHash}`);
      if (result.blockNumber) addLog(`[TX] included at block: ${result.blockNumber}`);

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

        if (!result.ok) throw new Error(result.error);
        if (result.userOpHash) addLog(`[UO] userOpHash: ${result.userOpHash}`);
        if (result.transactionHash) addLog(`[TX] transactionHash: ${result.transactionHash}`);
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

        if (!result.ok) throw new Error(result.error);
        if (result.userOpHash) addLog(`[UO] userOpHash: ${result.userOpHash}`);
        if (result.transactionHash) addLog(`[TX] transactionHash: ${result.transactionHash}`);
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
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Phase 2: Smart Account Dashboard</h1>

        <SmartAccountManager
          onSmartAccountReady={(address: Address) => {
            setSmartAccountReady(true);  // ignore the address argument
            addLog(`[INFO] Smart Account ready with address: ${address}`);
          }}
          onLog={addLog}
        />

        {/* Delegation Setup - Show when smart account exists but no delegation */}
        {smartAccountAddress && !delegation && (
          <DelegationManager
            smartAccountAddress={smartAccountAddress}
            onDelegationCreated={(newDelegation) => {
              setDelegation(newDelegation);
              addLog('[SUCCESS] Delegation setup completed - you can now stake/unstake!');
            }}
            isCreating={false}
            onLog={addLog}
          />
        )}

        {/* Delegation Status - Show when delegation is active */}
        {smartAccountAddress && delegation && (
          <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-400 text-xl mr-3">✅</span>
                <div>
                  <h3 className="text-green-400 font-semibold">Delegation Active</h3>
                  <p className="text-green-200 text-sm">One-click staking/unstaking enabled via secure delegation</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear the delegation? You will need to create a new one to continue staking.')) {
                    setDelegation(null);
                    localStorage.removeItem(`delegation_${smartAccountAddress.toLowerCase()}`);
                    addLog('[INFO] Delegation cleared - create a new one to continue staking');
                  }
                }}
                className="text-red-400 hover:text-red-300 text-sm underline px-2 py-1"
                title="Clear delegation and require new setup"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {smartAccountAddress && delegation && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
            {/* Left Column - Balances and Fund */}
            <div className="space-y-6">
              <BalanceDisplay
                smartAccountAddress={smartAccountAddress}
                balances={balances}
                loading={loading || balancesLoading}
              />

              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Fund Smart Account</h3>
                <div className="flex gap-4">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    placeholder="Amount MON"
                    className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                  <button
                    onClick={fundSmartAccount}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-2 rounded font-semibold"
                  >
                    Fund
                  </button>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  This will prompt the connected wallet to send MON to the smart account address.
                </p>
              </div>

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

            {/* Middle Column - Integrated Swap Interface */}
            <div className="space-y-6">
              <SwapInterface
                smartAccountAddress={smartAccountAddress}
                balances={balances}
                onLog={addLog}
                disabled={loading}
                onBalanceRefresh={() => fetchBalances(false)}
              />
            </div>

            {/* Right Column - Manual Staking Actions and Logs */}
            <div className="space-y-6">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Staking Actions:</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">
                      Stake MON → gMON (amount)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      value={amt.magmaStake}
                      onChange={(e) => setAmt((s) => ({ ...s, magmaStake: e.target.value }))}
                    />
                    <button
                      onClick={() => handleStakeMagma(amt.magmaStake)}
                      disabled={loading}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 py-2 rounded"
                    >
                      Stake Magma
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">
                      Unstake gMON → MON (amount)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      value={amt.magmaUnstake}
                      onChange={(e) => setAmt((s) => ({ ...s, magmaUnstake: e.target.value }))}
                    />
                    <button
                      onClick={() => handleUnstakeMagma(amt.magmaUnstake)}
                      disabled={loading}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 py-2 rounded"
                    >
                      Unstake Magma
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">
                      Stake MON → sMON (amount)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      value={amt.kintsuStake}
                      onChange={(e) => setAmt((s) => ({ ...s, kintsuStake: e.target.value }))}
                    />
                    <button
                      onClick={() => handleStakeKintsu(amt.kintsuStake)}
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 py-2 rounded"
                    >
                      Stake Kintsu
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">
                      Instant Unstake sMON → MON (amount)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      value={amt.kintsuUnstake}
                      onChange={(e) => setAmt((s) => ({ ...s, kintsuUnstake: e.target.value }))}
                    />
                    <button
                      onClick={() => handleUnstakeKintsu(amt.kintsuUnstake)}
                      disabled={loading}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 py-2 rounded"
                    >
                      Instant Unstake
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">
                      Request Unlock sMON (amount)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      value={amt.kintsuUnstake}
                      onChange={(e) => setAmt((s) => ({ ...s, kintsuUnstake: e.target.value }))}
                    />
                    <button
                      onClick={() => handleRequestUnlock(amt.kintsuUnstake)}
                      disabled={loading}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 py-2 rounded"
                    >
                      Request Unlock
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">
                      Redeem Unlock Index
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="0"
                    />
                    <button
                      onClick={() => handleRedeemUnlock("0")}
                      disabled={loading}
                      className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 py-2 rounded"
                    >
                      Redeem Unlock
                    </button>
                  </div>

                  <button
                    onClick={rebalance}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 py-2 rounded font-semibold"
                  >
                    Rebalance
                  </button>
                </div>
              </div>

              <TransactionLogger
                title="Logs:"
                logs={logs}
                onClear={clearLogs}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
