// src/components/RebalanceEngine.tsx  
'use client';

import { useState,  useMemo } from 'react';
import type { Address } from 'viem';
import { useBalances } from '@/providers/BalanceProvider';
import { determineRebalanceAction } from '@/lib/yieldOptimizer';
import { CONTRACTS } from '@/lib/contracts';
import { useToasts } from '@/providers/ToastProvider';
import { useLogger } from '@/providers/LoggerProvider';
import { motion } from 'framer-motion';
import { ArrowPathIcon, BoltIcon } from '@heroicons/react/24/outline';
interface RebalanceEngineProps {
  smartAccountAddress: Address;
  delegation: boolean;
  onLog: (message: string) => void;
  onRebalanceComplete: () => void;
  disabled?: boolean;
}

export default function RebalanceEngine({
  smartAccountAddress,
  delegation,
  onLog,
  onRebalanceComplete,
  disabled = false
}: RebalanceEngineProps) {
  const { addToast } = useToasts();
  const { addLog } = useLogger();
  const [isRebalancing, setIsRebalancing] = useState(false);
  const { balances, isLoading: balancesLoading, fetchBalances } = useBalances();

  const rebalanceAnalysis = useMemo(() => {
    return determineRebalanceAction(balances.kintsu, balances.magma);
  }, [balances.kintsu, balances.magma]);

  const getOptimalFee = (from: string, to: string): number => (
    (from === 'sMON' && to === 'gMON') || (from === 'gMON' && to === 'sMON') ? 500 : 2500
  );

  const executeRebalance = async () => {
    if (!rebalanceAnalysis.shouldRebalance || !delegation || !rebalanceAnalysis.amount) {
      addToast({ message: 'Cannot rebalance - missing requirements', type: 'error' });
      return;
    }
    setIsRebalancing(true);
    addLog('[ACTION] Starting portfolio rebalance...');
    addToast({ message: 'Starting rebalance...', type: 'info' });

    try {
      addLog('[INFO] Refreshing balances before execution...');
      await fetchBalances(true);

      const currentAnalysis = determineRebalanceAction(balances.kintsu, balances.magma);
      if (!currentAnalysis.shouldRebalance || !currentAnalysis.amount) {
        addLog('[INFO] Balances are now balanced - no rebalance needed');
        setIsRebalancing(false);
        return;
      }

      const { fromProtocol, toProtocol, amount } = currentAnalysis;
      const fromToken = fromProtocol === 'kintsu' ? 'sMON' : 'gMON';
      const toToken = toProtocol === 'kintsu' ? 'sMON' : 'gMON';
      
      const TOKEN_ADDRESSES: Record<string, Address> = { sMON: CONTRACTS.KINTSU, gMON: CONTRACTS.GMON };
      
      addLog(`[INFO] Rebalance: ${amount} ${fromToken} → ${toToken}`);

      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18)).toString();
      const response = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: smartAccountAddress,
          operation: 'direct-swap',
          fromToken: TOKEN_ADDRESSES[fromToken],
          toToken: TOKEN_ADDRESSES[toToken],
          amountIn: amountInWei,
          minOut: (BigInt(amountInWei) * 95n / 100n).toString(),
          fee: getOptimalFee(fromToken, toToken),
          recipient: smartAccountAddress,
          deadline: Math.floor(Date.now() / 1000) + 1800,
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Rebalance failed');

      const lastOp = result.operations?.[result.operations.length - 1];
      addToast({ message: 'Rebalance completed!', type: 'success', txHash: lastOp?.txHash });
      
      setTimeout(() => {
        onLog('[INFO] Refreshing balances after rebalance...');
        fetchBalances(false);
        onRebalanceComplete();
      }, 3000);

    } catch (error: any) {
      addLog(`[ERROR] Rebalance failed: ${error.message}`);
      addToast({ message: `Rebalance failed: ${error.message}`, type: 'error' });
    } finally {
      setIsRebalancing(false);
    }
  };

  const renderRebalancePreview = () => {
    if (balancesLoading) {
      return (
        <div className="p-4 bg-slate-800/50 rounded-lg text-center text-gray-400">
          <ArrowPathIcon className="h-5 w-5 mx-auto animate-spin mb-2" />
          <p>Loading Balances...</p>
        </div>
      );
    }

    if (!rebalanceAnalysis.shouldRebalance) {
      return (
        <div className="p-4 bg-slate-800/50 rounded-lg text-center">
          <div className="text-green-400 mb-2">✔️</div>
          <div className="text-white font-semibold mb-1">Portfolio Balanced</div>
          <p className="text-sm text-gray-400">No rebalance needed at this time.</p>
        </div>
      );
    }

    const { amount, reason } = rebalanceAnalysis;
    return (
      <div className="p-4 bg-blue-900/20 border-2 border-blue-500/30 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl">🔄</span>
          <span className="font-semibold text-blue-300">Rebalance Recommended</span>
        </div>
        <p className="text-sm text-blue-300 mb-4">{reason}</p>
        <div className="text-xs text-green-300 p-2 bg-green-900/20 border border-green-700/50 rounded flex items-center gap-2">
            <BoltIcon className="h-4 w-4" />
            <span>Single Transaction Swap via PancakeSwap Universal Router</span>
        </div>
      </div>
    );
  };
  
  const isButtonDisabled = disabled || !rebalanceAnalysis.shouldRebalance || isRebalancing || !delegation || balancesLoading;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Rebalance Engine</h3>
      {renderRebalancePreview()}
      <motion.button
        onClick={executeRebalance}
        disabled={isButtonDisabled}
        className="group relative w-full bg-gradient-to-r from-blue-700 via-purple-600 to-teal-700 font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center overflow-hidden text-white shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: isButtonDisabled ? 1 : 1.02 }}
        whileTap={{ scale: isButtonDisabled ? 1 : 0.98 }}
      >
        <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="relative z-10 flex items-center justify-center">
          {isRebalancing ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
              />
              Rebalancing...
            </>
          ) : rebalanceAnalysis.shouldRebalance ? (
            <>
              <BoltIcon className="h-5 w-5 mr-2" />
              Rebalance Portfolio
            </>
          ) : (
            'Portfolio is Balanced'
          )}
        </span>
      </motion.button>
    </div>
  );
}
