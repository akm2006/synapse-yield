'use client';
import type { Address } from 'viem';
import type { Balances } from '@/hooks/useBalances';

interface BalanceDisplayProps {
  smartAccountAddress: Address | null;
  balances: Balances;
  loading?: boolean;
}

const TOKEN_INFO = {
  MON: { name: 'Monad', symbol: 'MON', icon: '🔷' },
  sMON: { name: 'Staked Kintsu Monad', symbol: 'sMON', icon: '🥩' },
  gMON: { name: 'Staked Magma Monad', symbol: 'gMON', icon: '🏛️' },
  WMON: { name: 'Wrapped Monad', symbol: 'WMON', icon: '🔶' },
};

export default function BalanceDisplay({ 
  smartAccountAddress, 
  balances,
  loading = false
}: BalanceDisplayProps) {
  if (!smartAccountAddress) return null;

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-white">
        Smart Account Balances:
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        {smartAccountAddress.slice(0, 6)}...{smartAccountAddress.slice(-4)}
      </p>
      
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-300">Loading balances...</span>
        </div>
      ) : (
        <ul className="space-y-2">
          <li className="flex justify-between">
            <span className="text-white">🔷 MON:</span>
            <span className="text-purple-400 font-bold">{balances.native}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-white">🥩 sMON:</span>
            <span className="text-purple-400 font-bold">{balances.kintsu}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-white">🏛️ gMON:</span>
            <span className="text-purple-400 font-bold">{balances.magma}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-white">🔶 WMON:</span>
            <span className="text-purple-400 font-bold">{balances.wmon}</span>
          </li>
        </ul>
      )}
    </div>
  );
}
