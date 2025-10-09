'use client';

import { useState, useEffect } from 'react';
import type { Address } from 'viem';
import { useBalances } from '@/hooks/useBalances';

interface BalanceDisplayProps {
  smartAccountAddress: Address | null;
  onLog?: (message: string) => void;
}

export default function BalanceDisplay({ smartAccountAddress, onLog }: BalanceDisplayProps) {
  const { balances, isLoading, error, fetchBalances, lastUpdated } = useBalances(smartAccountAddress);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const formatTime = (ts: number) => (!ts ? 'Never' : new Date(ts).toLocaleTimeString());

  const handleManualRefresh = async () => {
    onLog?.('[ACTION] Manually refreshing balances...');
    try {
      await fetchBalances(false);
      onLog?.('[SUCCESS] Balances refreshed');
    } catch {
      onLog?.('[ERROR] Refresh failed');
    }
  };

  useEffect(() => {
    if (!autoRefresh || !smartAccountAddress) return;
    const timer = setInterval(() => fetchBalances(true), 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, smartAccountAddress, fetchBalances]);

  if (!smartAccountAddress)
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center text-gray-400">
        <h2 className="text-xl font-bold text-white mb-4">💰 Token Balances</h2>
        Create a Smart Account to view balances
      </div>
    );

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">💰 Token Balances</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-xs px-2 py-1 rounded ${
              autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            Auto: {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className={`px-3 py-1 rounded text-sm ${
              isLoading ? 'bg-gray-600 text-gray-400' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? '⏳ Updating...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-3 mb-4 text-red-200 text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <BalanceCard icon="🔷" label="MON" sub="Native" value={balances.native} color="text-blue-400" />
        <BalanceCard icon="🥩" label="sMON" sub="Kintsu" value={balances.kintsu} color="text-red-400" />
        <BalanceCard icon="🏛️" label="gMON" sub="Magma" value={balances.magma} color="text-purple-400" />
        <BalanceCard icon="🔶" label="WMON" sub="Wrapped" value={balances.wmon} color="text-orange-400" />
      </div>

      <div className="mt-4 pt-4 border-t border-gray-600 flex justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              error ? 'bg-red-400' : isLoading ? 'bg-yellow-400' : 'bg-green-400'
            }`}
          ></span>
          {error ? 'Error' : isLoading ? 'Updating...' : 'Live'}
        </div>
        <div>Last updated: {formatTime(lastUpdated)}</div>
      </div>
    </div>
  );
}

function BalanceCard({ icon, label, sub, value, color }: any) {
  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-white">{label}</h3>
          <p className="text-xs text-gray-400">{sub}</p>
        </div>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
