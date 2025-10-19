// src/app/manage-funds/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useBalances } from '@/providers/BalanceProvider';
import { useLogger } from '@/providers/LoggerProvider';
import { useToasts } from '@/providers/ToastProvider';
import TokenTransfer from '@/components/TokenTransfer'; // Assuming this component will also be themed
import Card from '@/components/common/Card';
import LiquidBackground from '@/components/layout/LiquidBackground';
import { motion } from 'framer-motion';
import {
  ArrowUpCircleIcon,
  PaperAirplaneIcon,
  LockClosedIcon,
  ShieldExclamationIcon,
  ArrowRightIcon,
  BanknotesIcon, // Keep relevant icon import
} from '@heroicons/react/24/outline';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';


// --- Gated State Component (Themed) ---
// (Remains the same as the previous version)
const GatedState = ({
  icon,
  title,
  description,
  buttonText,
  buttonLink,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}) => (
  <LiquidBackground>
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <div className="p-6">
          {icon}
          <h2 className="text-2xl font-bold text-white mb-2 mt-4">{title}</h2>
          <p className="text-gray-400 mb-8">{description}</p>
          <Link
            href={buttonLink}
            className="group relative inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all duration-300 overflow-hidden"
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 flex items-center gap-2">
              {buttonText}
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </Card>
    </div>
  </LiquidBackground>
);

// --- Main Page Component ---
export default function ManageFundsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { smartAccountAddress } = useSmartAccount();
  const { balances, fetchBalances } = useBalances(); // Using the BalanceProvider hook
  const { addLog } = useLogger();
  const { addToast, removeToast } = useToasts();
  const { address: eoaAddress } = useAccount();

  const [fundAmount, setFundAmount] = useState('');
  const toastIdRef = useRef<number | null>(null);

  const {
    data: fundTxHash,
    sendTransaction,
    isPending: isSendingFundTx,
    error: fundError,
    reset: resetSendTransaction,
  } = useSendTransaction();
  const { isLoading: isConfirmingFundTx, isSuccess: isFundTxSuccess } =
    useWaitForTransactionReceipt({ hash: fundTxHash });

  const handleFundSmartAccount = async () => {
    // ... (handleFundSmartAccount logic remains the same)
    if (!eoaAddress || !smartAccountAddress || !fundAmount || parseFloat(fundAmount) <= 0) {
      addToast({ message: 'Invalid funding details.', type: 'error' });
      return;
    }
    addLog(`[ACTION] Funding ${fundAmount} MON from EOA to Smart Account`);

    try {
      const amountWei = parseUnits(fundAmount, 18);
      sendTransaction({ to: smartAccountAddress, value: amountWei });
    } catch (error: any) {
      addLog(`[ERROR] Failed to initiate funding: ${error.message}`);
      addToast({ message: `Funding failed: ${error.message}`, type: 'error' });
    }
  };

  // Effect for handling funding transaction status updates
  useEffect(() => {
    // ... (useEffect logic remains the same)
    if (isSendingFundTx) {
      if (toastIdRef.current !== null) removeToast(toastIdRef.current);
      toastIdRef.current = addToast({
        message: `Sending ${fundAmount} MON...`,
        type: 'loading',
        duration: 60000,
      });
    }

    if (isConfirmingFundTx) {
      if (toastIdRef.current !== null) removeToast(toastIdRef.current);
      toastIdRef.current = addToast({
        message: 'Confirming funding transaction...',
        type: 'loading',
        duration: 120000,
      });
    }

    if (isFundTxSuccess && fundTxHash) {
      if (toastIdRef.current !== null) removeToast(toastIdRef.current);
      addLog(`[SUCCESS] Smart Account funded successfully. Tx: ${fundTxHash}`);
      addToast({
        message: 'Funding successful!',
        type: 'success',
        txHash: fundTxHash,
      });
      fetchBalances(true);
      setFundAmount('');
      resetSendTransaction();
      toastIdRef.current = null;
    }

    if (fundError) {
      if (toastIdRef.current !== null) removeToast(toastIdRef.current);
      addLog(`[ERROR] Funding failed: ${fundError.message}`);
     addToast({ message: `Funding failed: ${fundError.message}`, type: 'error' });;
      resetSendTransaction();
      toastIdRef.current = null;
    }
    return () => {
      if (toastIdRef.current !== null && (isSendingFundTx || isConfirmingFundTx)) {
         try { removeToast(toastIdRef.current); } catch {}
         toastIdRef.current = null;
      }
    };
  }, [
    isSendingFundTx,
    isConfirmingFundTx,
    isFundTxSuccess,
    fundTxHash,
    fundError,
    addLog,
    addToast,
    fetchBalances,
    fundAmount,
    removeToast,
    resetSendTransaction
  ]);


  const fundingInProgress = isSendingFundTx || isConfirmingFundTx;

  // --- Loading and Gating Logic ---
  // ... (Loading and GatedState logic remains the same)
  if (isAuthLoading) {
    return (
       <LiquidBackground>
           <div className="min-h-screen flex items-center justify-center text-center">
               <div>
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
               <p className="mt-4 text-gray-400">Loading...</p>
               </div>
           </div>
       </LiquidBackground>
   );
 }

  if (!isAuthenticated) {
    return <GatedState icon={<ShieldExclamationIcon className="h-12 w-12 mx-auto text-yellow-400"/>} title="Authentication Required" description="Please sign in to manage funds." buttonText="Sign In on Homepage" buttonLink="/" />;
  }

  if (!smartAccountAddress) {
    return <GatedState icon={<LockClosedIcon className="h-12 w-12 mx-auto text-purple-400"/>} title="Smart Account Required" description="Create a smart account on the dashboard to manage funds." buttonText="Go to Dashboard" buttonLink="/dashboard" />;
  }

  // --- Main Page Render ---
  return (
    <LiquidBackground>
      {/* Increased top padding slightly to compensate for removed header */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24"> {/* Adjusted pt from 12 to 16 */}

        {/* Removed the header section */}
        {/* <div className="text-center mb-12"> ... </div> */}

        {/* Main Content Grid - centered */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Fund Smart Account Card - Themed */}
          <Card delay={0.1}>
             {/* ... Card content remains the same */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg bg-slate-800 ring-2 ring-green-500/30">
                <ArrowUpCircleIcon className="h-7 w-7 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Fund Smart Account</h2>
                <p className="text-sm text-gray-400">Add MON from your connected wallet.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="0.00 MON"
                  className="w-full pl-4 pr-16 py-3 bg-slate-800/50 border-2 border-slate-700 rounded-xl text-white placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/50 transition-all duration-300 disabled:opacity-60"
                  disabled={fundingInProgress}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">MON</span>
              </div>
              <motion.button
                onClick={handleFundSmartAccount}
                disabled={fundingInProgress || !fundAmount || parseFloat(fundAmount) <= 0}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-500 font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center text-white shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: fundingInProgress ? 1 : 1.02 }}
                whileTap={{ scale: fundingInProgress ? 1 : 0.98 }}
              >
                <span className="relative z-10 flex items-center justify-center">
                  {fundingInProgress ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                      />
                      {isSendingFundTx ? 'Sending...' : 'Confirming...'}
                    </>
                  ) : (
                    'Fund Smart Account'
                  )}
                </span>
              </motion.button>
            </div>
          </Card>

          {/* Token Transfer Card - Themed */}
          <Card delay={0.2}>
             {/* ... Card content remains the same */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg bg-slate-800 ring-2 ring-blue-500/30">
                <PaperAirplaneIcon className="h-7 w-7 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Transfer From Smart Account</h2>
                <p className="text-sm text-gray-400">Send tokens out from your Smart Account.</p>
              </div>
            </div>
            <TokenTransfer
                smartAccountAddress={smartAccountAddress}
                balances={balances}
                disabled={!smartAccountAddress}
            />
          </Card>
        </div>
      </main>
    </LiquidBackground>
  );
}