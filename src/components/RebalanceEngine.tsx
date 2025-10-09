// src/components/RebalanceEngine.tsx  
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Address } from 'viem';
import { useBalances } from '@/hooks/useBalances';
import { determineRebalanceAction } from '@/utils/yieldOptimizer';
import { CONTRACTS } from '@/lib/contracts';

interface RebalanceEngineProps {
  smartAccountAddress: Address;
  delegation: any;
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
  const [isRebalancing, setIsRebalancing] = useState(false);

  // Fetch real-time balances
  const { balances, isLoading: balancesLoading, fetchBalances } = useBalances(smartAccountAddress);

  // Recalculate rebalancing need whenever balances change
  const rebalanceAnalysis = useMemo(() => {
    const analysis = determineRebalanceAction(balances.kintsu, balances.magma);
    console.log('[RebalanceEngine] Balance update:', {
      kintsu: balances.kintsu,
      magma: balances.magma,
      shouldRebalance: analysis.shouldRebalance,
      amount: analysis.amount
    });
    return analysis;
  }, [balances.kintsu, balances.magma]);

  // Optimal fee helper
  const getOptimalFee = (from: string, to: string): number => {
    if ((from === 'sMON' && to === 'gMON') || (from === 'gMON' && to === 'sMON')) {
      return 500;
    }
    return 2500;
  };

  const executeRebalance = async () => {
    if (!rebalanceAnalysis.shouldRebalance || !delegation) {
      onLog('[ERROR] Cannot rebalance - missing requirements');
      return;
    }
    setIsRebalancing(true);
    onLog('[ACTION] Starting migration via direct swap...');

    try {
      onLog('[INFO] Refreshing balances before execution...');
      await fetchBalances(true);

      const currentAnalysis = determineRebalanceAction(balances.kintsu, balances.magma);
      if (!currentAnalysis.shouldRebalance) {
        onLog('[INFO] Balances are now balanced - no migration needed');
        setIsRebalancing(false);
        return;
      }

      const { fromProtocol, toProtocol, amount } = currentAnalysis;
      if (!fromProtocol || !toProtocol || !amount) {
        throw new Error('Invalid rebalance analysis data');
      }

      const fromToken = fromProtocol === 'kintsu' ? 'sMON' : 'gMON';
      const toToken = toProtocol === 'kintsu' ? 'sMON' : 'gMON';
      const TOKEN_ADDRESSES: Record<string, Address> = {
        sMON: CONTRACTS.KINTSU,
        gMON: CONTRACTS.GMON
      };
      const fromTokenAddr = TOKEN_ADDRESSES[fromToken];
      const toTokenAddr = TOKEN_ADDRESSES[toToken];

      onLog(`[INFO] Migrate: ${amount} ${fromToken} → ${toToken}`);
      onLog(`[INFO] Pre-execution balances - sMON: ${balances.kintsu}, gMON: ${balances.magma}`);
      onLog('[INFO] Executing single-transaction swap via PancakeSwap');

      const amountInWei = BigInt(Math.floor(+amount * 1e18)).toString();
      const minOut = (BigInt(amountInWei) * 95n / 100n).toString();
      const fee = getOptimalFee(fromToken, toToken);
      const deadline = Math.floor(Date.now() / 1000) + 1800;

      const response = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: smartAccountAddress,
          operation: 'direct-swap',
          fromToken: fromTokenAddr,
          toToken: toTokenAddr,
          amountIn: amountInWei,
          minOut,
          fee,
          recipient: smartAccountAddress,
          deadline,
          delegation
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Migration failed');
      }

      const operations = result.operations || [];
      if (operations.length > 0) {
        onLog(`[SUCCESS] Migration completed with ${operations.length} operations`);
        operations.forEach((op: any, i: number) => {
          if (op.userOpHash) onLog(`[UO-${i+1}] ${op.userOpHash}`);
          if (op.txHash) onLog(`[TX-${i+1}] ${op.txHash}`);
        });
      }

      onLog('[SUCCESS] Gas-optimized migration completed!');
      setTimeout(async () => {
        onLog('[INFO] Refreshing balances after migration...');
        await fetchBalances(false);
        onRebalanceComplete();
      }, 3000);

    } catch (error: any) {
      onLog(`[ERROR] Migration failed: ${error.message}`);
    } finally {
      setIsRebalancing(false);
    }
  };

  const renderRebalancePreview = () => {
    if (balancesLoading) {
      return (
        <div className="p-4 bg-gray-700 rounded-lg text-center">
          <div className="text-gray-400 mb-2">⏳</div>
          <div className="text-white font-semibold mb-1">Loading Balances...</div>
          <div className="text-sm text-gray-400">Fetching latest token balances</div>
        </div>
      );
    }

    if (!rebalanceAnalysis.shouldRebalance) {
      return (
        <div className="p-4 bg-gray-700 rounded-lg text-center">
          <div className="text-gray-400 mb-2">⚖️</div>
          <div className="text-white font-semibold mb-1">Portfolio Balanced</div>
          <div className="text-sm text-gray-400">No migration needed at this time</div>
          <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
            sMON: {balances.kintsu} | gMON: {balances.magma}
          </div>
        </div>
      );
    }

    const { fromProtocol, toProtocol, amount, reason } = rebalanceAnalysis;
    const fromToken = fromProtocol === 'kintsu' ? 'sMON' : 'gMON';
    const toToken = toProtocol === 'kintsu' ? 'sMON' : 'gMON';

    return (
      <div className="p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🔄</span>
          <span className="font-semibold text-blue-200">Migrate Ready</span>
        </div>
        <div className="space-y-2 text-sm text-blue-200">
          <div className="flex justify-between">
            <span>Current {fromToken}:</span>
            <span className="font-mono">{balances.kintsu}</span>
          </div>
          <div className="flex justify-between">
            <span>Current {toToken}:</span>
            <span className="font-mono">{balances.magma}</span>
          </div>
          <div className="border-t border-blue-600 pt-2"></div>
          <div className="flex justify-between">
            <span>Migrate Amount:</span>
            <span className="font-mono font-bold text-yellow-400">
              {amount} {fromToken}
            </span>
          </div>
          <div className="pt-2 border-t border-blue-600">
            <span className="text-xs text-blue-300">{reason}</span>
          </div>
        </div>
        <div className="mt-3 p-2 bg-green-900/20 border border-green-600 rounded text-xs text-green-200">
          <div className="flex items-center gap-1">
            <span>⚡</span>
            <span className="font-semibold">Gas Optimized:</span>
          </div>
          <div className="mt-1">Single transaction migration</div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    console.log('[RebalanceEngine] Balances changed:', balances);
    console.log('[RebalanceEngine] Migration needed:', rebalanceAnalysis.shouldRebalance);
    console.log('[RebalanceEngine] Amount to migrate:', rebalanceAnalysis.amount);
  }, [balances, rebalanceAnalysis]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Rebalance Engine</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            balancesLoading
              ? 'bg-blue-400 animate-pulse'
              : rebalanceAnalysis.shouldRebalance
                ? 'bg-yellow-400'
                : 'bg-green-400'
          }`}></div>
          <span className="text-sm text-gray-400">
            {balancesLoading
              ? 'Loading...'
              : rebalanceAnalysis.shouldRebalance
                ? `Migrate ${rebalanceAnalysis.amount || '0'} Ready`
                : 'Optimized'
            }
          </span>
        </div>
      </div>

      {renderRebalancePreview()}

      <button
        onClick={executeRebalance}
        disabled={
          disabled ||
          !rebalanceAnalysis.shouldRebalance ||
          isRebalancing ||
          !delegation ||
          balancesLoading
        }
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
          disabled ||
          !rebalanceAnalysis.shouldRebalance ||
          !delegation ||
          balancesLoading
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : isRebalancing
            ? 'bg-blue-600 text-white cursor-wait'
            : 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
        }`}
      >
        {isRebalancing ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Migrating...
          </div>
        ) : balancesLoading ? (
          'Loading Balances...'
        ) : !delegation ? (
          'Setup Delegation First'
        ) : !rebalanceAnalysis.shouldRebalance ? (
          'No Migration Needed'
        ) : disabled ? (
          'Add Funds to Enable'
        ) : (
          `⚡ Migrate ${rebalanceAnalysis.amount || '0'} tokens`
        )}
      </button>

      {rebalanceAnalysis.shouldRebalance && !balancesLoading && (
        <div className="text-xs text-gray-400 text-center">
          Gas-optimized single transaction via PancakeSwap Universal Router
        </div>
      )}
    </div>
  );
}
