// src/components/APYDisplay.tsx
'use client';

import { useState, useEffect } from 'react';

interface ProtocolData {
  name: string;
  symbol: string;
  apy: number;
  balance: string;
  icon: string;
  color: string;
}

interface APYDisplayProps {
  protocols: {
    kintsu: ProtocolData;
    magma: ProtocolData;
  };
}

export default function APYDisplay({ protocols }: APYDisplayProps) {
  const [highlightBest, setHighlightBest] = useState(false);
  
  const bestAPY = Math.max(protocols.kintsu.apy, protocols.magma.apy);
  const apyDifference = Math.abs(protocols.kintsu.apy - protocols.magma.apy);

  // Highlight animation when APY changes significantly
  useEffect(() => {
    if (apyDifference > 2) {
      setHighlightBest(true);
      const timer = setTimeout(() => setHighlightBest(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [apyDifference]);

  const renderProtocolCard = (key: 'kintsu' | 'magma', protocol: ProtocolData) => {
    const isBest = protocol.apy === bestAPY && apyDifference > 1;
    const hasBalance = parseFloat(protocol.balance) > 0;

    return (
      <div
        key={key}
        className={`relative p-4 rounded-lg border transition-all duration-300 ${
          isBest && highlightBest
            ? 'border-yellow-400 bg-yellow-900/20 shadow-lg scale-105'
            : 'border-gray-600 bg-gray-700'
        }`}
      >
        {/* Best APY Badge */}
        {isBest && apyDifference > 1 && (
          <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
            BEST
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{protocol.icon}</span>
            <div>
              <h3 className="font-semibold text-white">{protocol.name}</h3>
              <p className="text-sm text-gray-400">{protocol.symbol}</p>
            </div>
          </div>
          
          {/* APY Display */}
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              isBest && highlightBest ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {protocol.apy.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-400">APY</div>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Your Balance:</span>
          <div className="text-right">
            <div className="font-semibold text-white">
              {parseFloat(protocol.balance).toFixed(4)} {protocol.symbol}
            </div>
            {hasBalance && (
              <div className="text-xs text-gray-400">
                ≈ ${(parseFloat(protocol.balance) * 1.2).toFixed(2)} USD
              </div>
            )}
          </div>
        </div>

        {/* Protocol Status */}
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${hasBalance ? 'bg-green-400' : 'bg-gray-500'}`}></div>
            <span className="text-xs text-gray-400">
              {hasBalance ? 'Active Position' : 'No Position'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Protocol APYs</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-sm text-gray-400">Live Updates</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {renderProtocolCard('kintsu', protocols.kintsu)}
        {renderProtocolCard('magma', protocols.magma)}
      </div>

      {/* APY Comparison */}
      {apyDifference > 1 && (
        <div className="p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
          <div className="flex items-center gap-2 text-blue-200">
            <span className="text-lg">📊</span>
            <span className="font-semibold">APY Analysis:</span>
          </div>
          <div className="text-sm text-blue-200 mt-1">
            {protocols.kintsu.apy > protocols.magma.apy 
              ? `Kintsu offers ${apyDifference.toFixed(2)}% higher APY than Magma`
              : `Magma offers ${apyDifference.toFixed(2)}% higher APY than Kintsu`
            }
          </div>
          {apyDifference > 5 && (
            <div className="text-xs text-yellow-300 mt-1">
              ⚠️ In production, this difference would trigger automatic rebalancing
            </div>
          )}
        </div>
      )}
    </div>
  );
}
