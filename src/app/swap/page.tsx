'use client';

import { useState, useEffect } from 'react';
import type { Address } from 'viem';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useBalances } from '@/hooks/useBalances';
import { useTransactionLogger } from '@/components/TransactionLogger';
import TransactionLogger from '@/components/TransactionLogger';
import SwapInterface from '@/components/SwapInterface';
import TokenTransfer from '@/components/TokenTransfer';
import type { Delegation } from "@metamask/delegation-toolkit";
import { ArrowsRightLeftIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { parseUnits } from 'viem';

export default function SwapPage() {
  const { smartAccountAddress } = useSmartAccount();
  const { balances, fetchBalances } = useBalances(smartAccountAddress);
  const { logs, addLog, clearLogs } = useTransactionLogger();
  const [delegation, setDelegation] = useState<Delegation | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'swap' | 'transfer' | 'fund'>('swap');

  useEffect(() => {
    if (smartAccountAddress && !delegation) {
      const loadExistingDelegation = async () => {
        try {
          const { loadDelegation } = await import('@/utils/delegation');
          const existingDelegation = loadDelegation(smartAccountAddress);
          if (existingDelegation) {
            setDelegation(existingDelegation);
          }
        } catch (error) {
          console.error('Failed to load delegation:', error);
        }
      };
      loadExistingDelegation();
    }
  }, [smartAccountAddress, delegation]);

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

      addLog(`[ACTION] Funding Smart Account: ${fundAmount} MON from ${from}`);
      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: smartAccountAddress,
          value: '0x' + valueHex,
        }],
      });

      addLog(`[TX] ${txHash}`);
      await new Promise(r => setTimeout(r, 1200));
      await fetchBalances(false);
      setFundAmount('');
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

  if (!smartAccountAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950/50 to-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-2">Smart Account Required</h2>
          <p className="text-gray-400 mb-6">Create a smart account to access swap features</p>
          <a href="/dashboard" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors inline-block">
            Go to Dashboard
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
            <h1 className="text-4xl font-bold text-white mb-2">Token Operations</h1>
            <p className="text-gray-400">Swap tokens and manage your assets</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left - Navigation & Balances */}
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-2">
              <button
                onClick={() => setActiveTab('swap')}
                className={`w-full p-4 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'swap'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <ArrowsRightLeftIcon className="h-5 w-5" />
                  <span>Token Swap</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('transfer')}
                className={`w-full p-4 rounded-xl font-medium transition-all duration-200 mt-2 ${
                  activeTab === 'transfer'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <PaperAirplaneIcon className="h-5 w-5" />
                  <span>Transfer</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('fund')}
                className={`w-full p-4 rounded-xl font-medium transition-all duration-200 mt-2 ${
                  activeTab === 'fund'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">💰</span>
                  <span>Fund Account</span>
                </div>
              </button>
            </div>

            {/* Quick Balance Overview */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Available Balances</h3>
              <div className="space-y-3">
                {[
                  { label: 'MON', value: balances.native, icon: '🔷', color: 'text-blue-400' },
                  { label: 'sMON', value: balances.kintsu, icon: '🥩', color: 'text-red-400' },
                  { label: 'gMON', value: balances.magma, icon: '🏛️', color: 'text-purple-400' },
                  { label: 'WMON', value: balances.wmon, icon: '🔶', color: 'text-orange-400' }
                ].map((token, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{token.icon}</span>
                      <span className="text-white font-medium">{token.label}</span>
                    </div>
                    <span className={`font-semibold ${token.color}`}>
                      {parseFloat(token.value || '0').toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Portfolio Value */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
              <p className="text-sm text-gray-400 mb-2">Total Portfolio Value</p>
              <p className="text-3xl font-bold text-white">
                {(
                  parseFloat(balances.native || '0') +
                  parseFloat(balances.kintsu || '0') +
                  parseFloat(balances.magma || '0') +
                  parseFloat(balances.wmon || '0')
                ).toFixed(4)}{' '}
                <span className="text-lg text-gray-400">MON</span>
              </p>
            </div>
          </div>

          {/* Center - Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'swap' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Token Swap</h2>
                  <p className="text-gray-400">Seamlessly swap between tokens and staked positions</p>
                </div>
                
                {!delegation ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
                    <p className="text-yellow-400 mb-4">⚠️ Delegation required for swap operations</p>
                    <a href="/dashboard" className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-xl transition-colors inline-block">
                      Setup Delegation
                    </a>
                  </div>
                ) : (
                  <SwapInterface
                    smartAccountAddress={smartAccountAddress}
                    balances={balances}
                    onLog={addLog}
                    disabled={false}
                    onBalanceRefresh={() => fetchBalances(false)}
                    delegation={delegation}
                  />
                )}
              </div>
            )}

            {activeTab === 'transfer' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Transfer Tokens</h2>
                  <p className="text-gray-400">Send tokens to any address on Monad network</p>
                </div>
                <TokenTransfer
                  smartAccountAddress={smartAccountAddress}
                  balances={{
                    native: balances.native,
                    kintsu: balances.kintsu,
                    magma: balances.magma,
                  }}
                  onLog={addLog}
                  disabled={false}
                />
              </div>
            )}

            {activeTab === 'fund' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Fund Your Account</h2>
                  <p className="text-gray-400">Transfer MON from your connected wallet to your smart account</p>
                </div>

                <div className="space-y-6">
                  {/* Info Box */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">ℹ️</span>
                      <div>
                        <p className="text-blue-400 font-medium mb-1">How it works</p>
                        <p className="text-sm text-gray-400">
                          This will prompt your connected wallet (MetaMask) to send MON tokens to your smart account. 
                          Make sure you have enough MON in your wallet to cover the transfer amount.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Smart Account Address */}
                  <div className="bg-black/20 rounded-xl p-4">
                    <p className="text-sm text-gray-400 mb-2">Funding Address</p>
                    <p className="font-mono text-sm text-blue-400 break-all">{smartAccountAddress}</p>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Amount (MON)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-4 bg-black/20 border border-white/10 rounded-xl text-white text-lg placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                    />
                  </div>

                  {/* Fund Button */}
                  <button
                    onClick={fundSmartAccount}
                    disabled={!fundAmount || parseFloat(fundAmount) <= 0}
                    className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                  >
                    Fund Smart Account
                  </button>

                  {/* Warning */}
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">⚠️</span>
                      <div>
                        <p className="text-yellow-400 font-medium mb-1">Important</p>
                        <p className="text-sm text-gray-400">
                          Make sure your wallet is connected to the Monad Testnet network before proceeding.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Log */}
            <TransactionLogger
              title="Transaction Activity"
              logs={logs}
              onClear={clearLogs}
            />
          </div>
        </div>
      </div>
    </div>
  );
}