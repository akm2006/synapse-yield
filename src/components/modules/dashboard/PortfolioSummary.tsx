'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { PresentationChartBarIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { Balances } from '@/providers/BalanceProvider';

interface PortfolioSummaryProps {
  balances: Balances;
}

// --- Token Metadata with Full Tailwind Class Names ---
const tokenInfo = {
  MON: { 
    name: 'Native MON', 
    iconUrl: '/mon.jpeg', 
    barClass: 'bg-gradient-to-r from-purple-500 to-violet-500',
    textClass: 'text-purple-400' 
  },
  sMON: { 
    name: 'Kintsu sMON', 
    iconUrl: '/smon.jpg', 
    barClass: 'bg-gradient-to-r from-cyan-500 to-blue-500',
    textClass: 'text-cyan-400' 
  },
  gMON: { 
    name: 'Magma gMON', 
    iconUrl: '/gmon.png', 
    barClass: 'bg-gradient-to-r from-orange-500 to-amber-500',
    textClass: 'text-orange-400' 
  },
  WMON: { 
    name: 'Wrapped MON', 
    iconUrl: '/mon.jpeg', 
    barClass: 'bg-gradient-to-r from-purple-300 to-violet-400',
    textClass: 'text-purple-300' 
  },
};

// --- Sub-components ---

const StatCard: React.FC<{ label: string; value: string; unit?: string; change?: string; }> = ({ label, value, unit, change }) => (
  <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex-1">
    <p className="text-sm font-medium text-gray-400 mb-1">{label}</p>
    <div className="flex items-baseline gap-2">
      <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
      {unit && <span className="text-xl text-gray-400 font-medium">{unit}</span>}
    </div>
    {change && (
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-400">
        <ArrowTrendingUpIcon className="h-4 w-4" />
        <span>{change}</span>
        <span className="text-gray-500">/ 24h</span>
      </div>
    )}
  </div>
);

const AllocationRow: React.FC<{ iconUrl: string; name: string; value: number; percentage: number; textClass: string; }> = ({ iconUrl, name, value, percentage, textClass }) => (
  <motion.div
    className="flex items-center justify-between py-2"
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
  >
    <div className="flex items-center gap-3">
      <Image src={iconUrl} alt={`${name} icon`} width={32} height={32} className="rounded-full" />
      <div>
        <p className="font-medium text-white">{name}</p>
        <p className="font-mono text-xs text-gray-400">{value.toFixed(4)}</p>
      </div>
    </div>
    <div className="text-right">
      <p className={`font-semibold ${textClass}`}>{percentage.toFixed(2)}%</p>
    </div>
  </motion.div>
);

// --- Main Component ---

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ balances }) => {
  const totalValue = (
    parseFloat(balances.native || '0') +
    parseFloat(balances.kintsu || '0') +
    parseFloat(balances.magma || '0') +
    parseFloat(balances.wmon || '0')
  );

  const blendedApy = totalValue > 0 ? 11.75 : 0;
  const dailyChange = totalValue > 0 ? (0.0125 * totalValue).toFixed(4) : "0.0000";
  const dailyChangePercent = totalValue > 0 ? "+1.25%" : "0.00%";

  const allocation = [
    { key: 'MON', value: parseFloat(balances.native || '0'), ...tokenInfo.MON },
    { key: 'sMON', value: parseFloat(balances.kintsu || '0'), ...tokenInfo.sMON },
    { key: 'gMON', value: parseFloat(balances.magma || '0'), ...tokenInfo.gMON },
    { key: 'WMON', value: parseFloat(balances.wmon || '0'), ...tokenInfo.WMON },
  ].filter(item => item.value > 0.0001).sort((a, b) => b.value - a.value);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
      className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl shadow-black/40"
    >
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
        <h3 className="text-xl font-semibold text-white flex items-center gap-3">
          <PresentationChartBarIcon className="h-6 w-6 text-blue-400" />
          Portfolio Summary
        </h3>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <StatCard label="Total Value" value={totalValue.toFixed(4)} unit="MON" change={`${dailyChange} (${dailyChangePercent})`} />
        <StatCard label="Blended APY" value={`${blendedApy.toFixed(2)}%`} />
      </div>
      
      <div>
        <h4 className="text-base font-medium text-gray-300 mb-4">Asset Allocation</h4>
        {totalValue > 0 ? (
          <div className="space-y-4">
            {/* The Segmented Gradient Bar */}
            <div className="flex h-3 w-full rounded-full bg-slate-800/50 ring-1 ring-inset ring-white/10">
              {allocation.map((item, index) => (
                <motion.div
                  key={item.key + '-bar'}
                  className={`h-full ${item.barClass} ${index < allocation.length -1 ? 'mr-0.5' : ''} first:rounded-l-full last:rounded-r-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / totalValue) * 100}%`}}
                  transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1], delay: 0.2 }}
                  title={`${item.name}: ${((item.value / totalValue) * 100).toFixed(1)}%`}
                />
              ))}
            </div>

            {/* The Detailed Legend */}
            <div className="divide-y divide-white/5">
              {allocation.map((item) => (
                <AllocationRow
                  key={item.key}
                  iconUrl={item.iconUrl}
                  name={item.name}
                  value={item.value}
                  percentage={(item.value / totalValue) * 100}
                  textClass={item.textClass}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500 border border-dashed border-gray-700 rounded-lg">
            <p>No assets deposited.</p>
            <p className="text-xs mt-1">Fund your account on the Portfolio page.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PortfolioSummary;

