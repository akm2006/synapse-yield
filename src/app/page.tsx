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
import SmartAccountManager from '../components/SmartAccountManager';
import TokenTransfer from '../components/TokenTransfer';
import { CONTRACTS } from '@/lib/contracts';
import Permit2Manager from '@/components/PermitManager'
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

// Extract the last operation (main tx usually comes last)
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

// Around line 180, replace the existing handleUnstakeKintsu function:
// --- Start of your changes ---
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


// (optional) Log all ops for debugging
if (result.operations?.length > 1) {
 result.operations.forEach((op: { userOpHash?: string; txHash?: string; target?: string }, i: number) => {
  addLog(`[OP-${i + 1}] target: ${op.target}, userOpHash: ${op.userOpHash}, txHash: ${op.txHash}`);
}); }
    
    await fetchBalances(false);
    addLog('[SUCCESS] Kintsu instant unstaking completed via delegation!');
  } catch (err: any) {
    addLog(`[ERROR] Unstake Kintsu error: ${err.message || err}`);
  } finally {
    setLoading(false);
  }
};
// --- End of your changes ---

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

const lastOp = result.operations?.[0]; // first or last execution
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

const lastOp = result.operations?.[0]; // first or last execution
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
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white">
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
          Smart Account Dashboard
        </h1>
        <p className="text-gray-400">Secure staking with MetaMask Delegation</p>
      </div>

      {/* Smart Account Manager */}
      <SmartAccountManager
        onSmartAccountReady={(address: Address) => {
          setSmartAccountReady(true);
          addLog(`[INFO] Smart Account ready with address: ${address}`);
        }}
        onLog={addLog}
      />
{smartAccountAddress && delegation && (
  <Permit2Manager
    token={CONTRACTS.KINTSU}
    spender={CONTRACTS.PANCAKESWAP}
    amount="1000"
    userAddress={smartAccountAddress}
    delegation={delegation}
  />
)}
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
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/50 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-green-500/20 p-3 rounded-full">
                <span className="text-green-400 text-2xl">✅</span>
              </div>
              <div>
                <h3 className="text-green-400 font-semibold text-lg">Delegation Active</h3>
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
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 text-sm px-4 py-2 rounded-lg transition-all duration-200"
              title="Clear delegation and require new setup"
            >
              Clear Delegation
            </button>
          </div>
        </div>
      )}

      {smartAccountAddress && delegation && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Balances and Fund */}
          <div className="space-y-6">
            <BalanceDisplay
              smartAccountAddress={smartAccountAddress}
              balances={balances}
              loading={loading || balancesLoading}
            />

            {/* Fund Smart Account Card */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="bg-blue-500/20 p-2 rounded-lg mr-3">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-xl font-semibold">Fund Account</h3>
              </div>
              <div className="space-y-3">
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
                  disabled={loading || !fundAmount || parseFloat(fundAmount) <= 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                >
                  Fund Account
                </button>
                <p className="text-xs text-gray-400 leading-relaxed">
                  💡 This will prompt your connected wallet to send MON to the smart account
                </p>
              </div>
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

          {/* Middle Column - Swap Interface */}
          <div className="space-y-6">
          <SwapInterface
  smartAccountAddress={smartAccountAddress}
  balances={balances}
  onLog={addLog}
  disabled={loading}
  onBalanceRefresh={() => fetchBalances(false)}
  delegation={delegation} // Add this line
/>
          </div>

          {/* Right Column - Staking Actions and Logs */}
          <div className="space-y-6">
            {/* Staking Actions Card */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="bg-purple-500/20 p-2 rounded-lg mr-3">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="text-xl font-semibold">Staking Actions</h3>
              </div>
              
              <div className="space-y-5">
                {/* Magma Stake */}
                <div className="bg-gray-900/50 p-4 rounded-lg border border-purple-500/20">
                  <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                    <span className="bg-purple-500/20 px-2 py-0.5 rounded text-xs mr-2">Magma</span>
                    Stake MON → gMON
                  </label>
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
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed py-2.5 rounded-lg font-medium shadow-md transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    {loading ? 'Processing...' : 'Stake to Magma'}
                  </button>
                </div>

                {/* Magma Unstake */}
                <div className="bg-gray-900/50 p-4 rounded-lg border border-red-500/20">
                  <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                    <span className="bg-red-500/20 px-2 py-0.5 rounded text-xs mr-2">Magma</span>
                    Unstake gMON → MON
                  </label>
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
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed py-2.5 rounded-lg font-medium shadow-md transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    {loading ? 'Processing...' : 'Unstake from Magma'}
                  </button>
                </div>

                {/* Kintsu Stake */}
                <div className="bg-gray-900/50 p-4 rounded-lg border border-green-500/20">
                  <label className="flex items-center justify-between text-sm font-medium text-gray-300 mb-2">
                    <span className="flex items-center">
                      <span className="bg-green-500/20 px-2 py-0.5 rounded text-xs mr-2">Kintsu</span>
                      Stake MON → sMON
                    </span>
                    <span className="text-xs text-green-400">Min: 0.01 MON</span>
                  </label>
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
                    <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                      <p className="text-xs text-yellow-400 flex items-center">
                        <span className="mr-1">⚠️</span>
                        Amount below minimum deposit (0.01 MON)
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => handleStakeKintsu(amt.kintsuStake)}
                    disabled={loading || parseFloat(amt.kintsuStake) < 0.01}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed py-2.5 rounded-lg font-medium shadow-md transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    {loading ? 'Processing...' : parseFloat(amt.kintsuStake) < 0.01 ? 'Minimum 0.01 MON' : 'Stake to Kintsu'}
                  </button>
                </div>

                {/* Kintsu Instant Unstake */}
                <div className="bg-gray-900/50 p-4 rounded-lg border border-orange-500/20">
                  <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                    <span className="bg-orange-500/20 px-2 py-0.5 rounded text-xs mr-2">Kintsu</span>
                    Instant Unstake sMON → MON
                  </label>
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
                    className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed py-2.5 rounded-lg font-medium shadow-md transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    {loading ? 'Processing...' : 'Instant Unstake'}
                  </button>
                  <p className="text-xs text-gray-400 mt-2">⚡ Swap via PancakeSwap (instant)</p>
                </div>

                {/* Request Unlock */}
                <div className="bg-gray-900/50 p-4 rounded-lg border border-yellow-500/20">
                  <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                    <span className="bg-yellow-500/20 px-2 py-0.5 rounded text-xs mr-2">Kintsu</span>
                    Request Unlock sMON
                  </label>
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
                    className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed py-2.5 rounded-lg font-medium shadow-md transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    {loading ? 'Processing...' : 'Request Unlock'}
                  </button>
                  <p className="text-xs text-gray-400 mt-2">⏱️ Standard unlock (wait period)</p>
                </div>

                {/* Redeem Unlock */}
                <div className="bg-gray-900/50 p-4 rounded-lg border border-teal-500/20">
                  <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                    <span className="bg-teal-500/20 px-2 py-0.5 rounded text-xs mr-2">Kintsu</span>
                    Redeem Unlock Index
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all mb-3"
                    placeholder="Unlock index (e.g., 0)"
                    defaultValue="0"
                  />
                  <button
                    onClick={() => handleRedeemUnlock("0")}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed py-2.5 rounded-lg font-medium shadow-md transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    {loading ? 'Processing...' : 'Redeem Unlock'}
                  </button>
                </div>

                {/* Rebalance Button */}
                <div className="pt-2">
                  <button
                    onClick={rebalance}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed py-3 rounded-lg font-semibold shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    {loading ? 'Processing...' : '🔄 Auto Rebalance'}
                  </button>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Automatically balance between Magma and Kintsu
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction Logs */}
            <TransactionLogger
              title="Transaction Logs"
              logs={logs}
              onClear={clearLogs}
            />
          </div>
        </div>
      )}
    </div>
  </div>
);}