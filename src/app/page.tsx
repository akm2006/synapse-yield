// src/app/page.tsx
'use client';
import { useState } from 'react';
import { parseUnits } from 'viem';
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
import type { Address } from 'viem';
export default function Home() {
  // Use shared hooks
  const { smartAccountAddress, setSmartAccountReady } = useSmartAccount();
  const { balances, isLoading: balancesLoading, fetchBalances } = useBalances(smartAccountAddress);
  const { generateOpId, openStream } = useSSEStream();
const { stakeMagma, unstakeMagma, stakeKintsu, unstakeKintsu, requestUnlock, redeemUnlock, directSwap } = useTokenOperations();
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

  // Manual staking operations (for backward compatibility with existing UI)
  const handleStakeMagma = async (amount: string) => {
    if (!smartAccountAddress) return addLog('[ERROR] Smart Account not ready');

    const opId = generateOpId();
    openStream(opId, addLog);

    try {
      addLog(`[ACTION] Stake Magma (Smart Account): ${amount}`);
      const result = await stakeMagma(amount, opId);

      if (!result.ok) return addLog(`[ERROR] stakeMagma: ${result.error}`);
      if (result.userOpHash) addLog(`[UO] userOpHash: ${result.userOpHash}`);
      if (result.transactionHash) addLog(`[TX] transactionHash: ${result.transactionHash}`);
      if (result.blockNumber) addLog(`[TX] included at block: ${result.blockNumber}`);

      await fetchBalances(false);
    } catch (err: any) {
      addLog(`[ERROR] Stake Magma error: ${err.message || err}`);
    }
  };

  const handleUnstakeMagma = async (amount: string) => {
    if (!smartAccountAddress) return addLog('[ERROR] Smart Account not ready');

    const opId = generateOpId();
    openStream(opId, addLog);

    try {
      addLog(`[ACTION] Unstake Magma (Smart Account): ${amount}`);
      const result = await unstakeMagma(amount, opId);

      if (!result.ok) return addLog(`[ERROR] unstakeMagma: ${result.error}`);
      if (result.userOpHash) addLog(`[UO] userOpHash: ${result.userOpHash}`);
      if (result.transactionHash) addLog(`[TX] transactionHash: ${result.transactionHash}`);
      if (result.blockNumber) addLog(`[TX] included at block: ${result.blockNumber}`);

      await fetchBalances(false);
    } catch (err: any) {
      addLog(`[ERROR] Unstake Magma error: ${err.message || err}`);
    }
  };

  const handleStakeKintsu = async (amount: string) => {
    if (!smartAccountAddress) return addLog('[ERROR] Smart Account not ready');

    const opId = generateOpId();
    openStream(opId, addLog);

    try {
      addLog(`[ACTION] Stake Kintsu (Smart Account): ${amount}`);
      const result = await stakeKintsu(amount, smartAccountAddress, opId);

      if (!result.ok) return addLog(`[ERROR] stakeKintsu: ${result.error}`);
      if (result.userOpHash) addLog(`[UO] userOpHash: ${result.userOpHash}`);
      if (result.transactionHash) addLog(`[TX] transactionHash: ${result.transactionHash}`);
      if (result.blockNumber) addLog(`[TX] included at block: ${result.blockNumber}`);

      await fetchBalances(false);
    } catch (err: any) {
      addLog(`[ERROR] Stake Kintsu error: ${err.message || err}`);
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

  // Replace the rebalance function in src/app/page.tsx with this optimized version:
const rebalance = async () => {
  if (!smartAccountAddress) return addLog('[ERROR] Smart Account not ready');

  setLoading(true);
  addLog('[ACTION] Starting optimized rebalance');

  try {
    const opId = generateOpId();
    openStream(opId, addLog);

    if (parseFloat(balances.kintsu) > 0.0001) {
      // sMON → gMON: Direct swap via PancakeSwap (single transaction)
      addLog('[INFO] Rebalancing from Kintsu (sMON) → Magma (gMON) via direct swap');
      
      const amountInWei = BigInt(Math.floor(parseFloat(balances.kintsu) * 1e18)).toString();
      const minOutWei = (BigInt(amountInWei) * 95n / 100n).toString(); // 5% slippage
      
      const result = await directSwap(
        CONTRACTS.KINTSU as Address, // sMON
        CONTRACTS.GMON as Address,   // gMON
        amountInWei,
        minOutWei,
        500, // 0.05% fee for stablecoin-like pairs
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
      // gMON → sMON: Direct swap via PancakeSwap (single transaction)
      addLog('[INFO] Rebalancing from Magma (gMON) → Kintsu (sMON) via direct swap');
      
      const amountInWei = BigInt(Math.floor(parseFloat(balances.magma) * 1e18)).toString();
      const minOutWei = (BigInt(amountInWei) * 95n / 100n).toString(); // 5% slippage
      
      const result = await directSwap(
        CONTRACTS.GMON as Address,   // gMON
        CONTRACTS.KINTSU as Address, // sMON
        amountInWei,
        minOutWei,
        500, // 0.05% fee for stablecoin-like pairs
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


  // Fund Smart Account functionality
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

  // Ensure Monad Chain
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

        {/* Smart Account Setup */}
        <SmartAccountManager
          onSmartAccountReady={setSmartAccountReady}
          onLog={addLog}
        />

        {smartAccountAddress && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
            {/* Left Column - Balances and Fund */}
            <div className="space-y-6">
              {/* Balance Display */}
              <BalanceDisplay 
                smartAccountAddress={smartAccountAddress} 
                balances={balances}
                loading={loading || balancesLoading} 
              />

              {/* Fund Smart Account */}
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

              {/* Token Transfer */}
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
              {/* Traditional Staking Actions */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Staking Actions:</h3>
                <div className="space-y-4">
                  {/* Magma Operations */}
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

                  {/* Kintsu Operations */}
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

                  {/* Rebalance */}
                  <button
                    onClick={rebalance}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 py-2 rounded font-semibold"
                  >
                    Rebalance
                  </button>
                </div>
              </div>

              {/* Transaction Logs */}
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
