// src/components/APYDisplay.tsx
'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { InformationCircleIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react'; // Added useEffect and useState back

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
  const [highlightBest, setHighlightBest] = useState(false); // Restore highlight state

  const bestProtocolKey = protocols.kintsu.apy > protocols.magma.apy ? 'kintsu' : 'magma';
  const bestAPY = Math.max(protocols.kintsu.apy, protocols.magma.apy);
  const apyDifference = Math.abs(protocols.kintsu.apy - protocols.magma.apy);

  // Restore highlight effect logic
  useEffect(() => {
    if (apyDifference > 1) { // Trigger highlight if difference is noticeable
      setHighlightBest(true);
      const timer = setTimeout(() => setHighlightBest(false), 2500); // Highlight duration
      return () => clearTimeout(timer);
    }
  }, [protocols.kintsu.apy, protocols.magma.apy, apyDifference]); // Depend on APYs directly


  const renderProtocolCard = (key: 'kintsu' | 'magma') => {
    const protocol = protocols[key];
    const isBest = bestProtocolKey === key;
    const hasBalance = parseFloat(protocol.balance) > 0.0001; // Restore balance check

    return (
      <div
        key={key}
        className={`relative p-4 rounded-xl border-2 transition-all duration-500 ease-out ${
          isBest && highlightBest
            ? 'border-cyan-400/60 bg-slate-700/60 scale-[1.03]' // Enhanced highlight style
            : 'border-slate-700/50 bg-slate-800/30'
        }`}
      >
        {/* Restored Best APY Badge with motion */}
        {isBest && (
          <motion.div
            layoutId="best-apy-badge"
            className="absolute -top-3 left-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-10"
          >
            HIGHEST APY
          </motion.div>
        )}
        
        {/* APY Section */}
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <Image src={protocol.icon} alt={protocol.name} width={40} height={40} className="rounded-full" />
                <div>
                    <h3 className="font-semibold text-white">{protocol.name}</h3>
                    <p className="text-sm text-gray-400">{protocol.symbol}</p>
                </div>
            </div>
            <div className="text-right">
                <p className={`text-2xl font-bold ${isBest ? 'text-cyan-300' : 'text-cyan-300/40'}`}>
                    {protocol.apy.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500">APY</p>
            </div>
        </div>

        {/* Balance Section - Restored */}
        <div className="mt-4 pt-3 border-t border-white/10">
             <div className="flex justify-between items-center mb-1">
                 <span className="text-sm text-gray-400">Your Balance:</span>
                 <div className={`w-2 h-2 rounded-full ${hasBalance ? 'bg-green-400' : 'bg-gray-500'}`}></div>
             </div>
             <div className="text-right">
                <div className="font-semibold text-white">
                 {parseFloat(protocol.balance).toFixed(4)} {protocol.symbol}
                </div>
                 {hasBalance && ( // Restore USD approximation
                 <div className="text-xs text-gray-500">
                     ≈ ${(parseFloat(protocol.balance) * 1.2).toFixed(2)} USD
                 </div>
                 )}
            </div>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Live Protocol APYs</h3>
             {/* Restore Live Updates indicator */}
            <div className="flex items-center gap-2">
                
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderProtocolCard('kintsu')}
            {renderProtocolCard('magma')}
        </div>
        
        {/* Restore APY Comparison/Analysis */}
        {apyDifference > 0.5 && ( // Show if difference is somewhat significant
             <div className="p-3 bg-blue-900/20 border border-blue-600/50 rounded-lg flex items-start gap-3">
                <InformationCircleIcon className="h-5 w-5 text-blue-300 mt-0.5 flex-shrink-0"/>
                <div>
                    <p className="text-sm font-medium text-blue-200">
                        {protocols[bestProtocolKey].name} currently offers {apyDifference.toFixed(2)}% higher APY.
                    </p>
                    {apyDifference > 2 && ( // Add emphasis for larger differences
                        <p className="text-xs text-yellow-300 mt-1">
                            A significant difference like this may warrant a rebalance.
                        </p>
                    )}
                </div>
             </div>
        )}
    </div>
  );
}