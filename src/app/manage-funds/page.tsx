// src/app/manage-funds/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useBalances } from '@/providers/BalanceProvider'; // Provider balances (for SA)
import { useLogger } from '@/providers/LoggerProvider';
import { useToasts } from '@/providers/ToastProvider';
import TokenTransfer from '@/components/TokenTransfer';
import Card from '@/components/common/Card';
import LiquidBackground from '@/components/layout/LiquidBackground';
import { motion } from 'framer-motion';
import {
  ArrowUpCircleIcon,
  PaperAirplaneIcon,
  LockClosedIcon,
  ShieldExclamationIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  WalletIcon, 
  ClipboardDocumentIcon, 
  PencilSquareIcon 
} from '@heroicons/react/24/outline';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseUnits, formatUnits, } from 'viem';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';



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
  <div className="fixed inset-0 flex items-center justify-center z-50">
    <div className="relative w-full max-w-md mx-auto px-6">
      <Card className="backdrop-blur-md bg-slate-900/60 border border-white/10 text-center shadow-2xl">
        <div className="p-8 flex flex-col items-center">
          <div className="mb-4">{icon}</div>
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
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
  </div>
);



// --- Main Page Component ---
export default function ManageFundsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { smartAccountAddress } = useSmartAccount();
  const { balances: saBalances, fetchBalances: fetchSaBalances } = useBalances(); // Renamed to avoid conflict
  const { addLog } = useLogger();
  const { addToast, removeToast } = useToasts();
  const { address: eoaAddress, isConnected } = useAccount(); // Get EOA address

  // Fetch EOA native balance using wagmi's useBalance
  const { data: eoaBalanceData, isLoading: isEoaBalanceLoading } = useBalance({
      address: eoaAddress,
      // chainId: monadTestnet.id // Specify chainId if your config supports multi-chain
  });
  const eoaBalanceFormatted = eoaBalanceData ? parseFloat(formatUnits(eoaBalanceData.value, 18)).toFixed(4) : '0.0000';
  const eoaBalanceNum = eoaBalanceData ? parseFloat(formatUnits(eoaBalanceData.value, 18)) : 0;


  const [fundAmount, setFundAmount] = useState('');
  const toastIdRef = useRef<number | null>(null);
  const [fundAmountError, setFundAmountError] = useState<string | null>(null); // State for funding amount error


  const {
    data: fundTxHash,
    sendTransaction,
    isPending: isSendingFundTx, // Wagmi v2 uses isPending
    error: fundError,
    reset: resetSendTransaction,
  } = useSendTransaction();
  const { isLoading: isConfirmingFundTx, isSuccess: isFundTxSuccess } =
    useWaitForTransactionReceipt({ hash: fundTxHash });


  // --- Validation for Funding Amount ---
  const validateFundAmount = (inputAmount: string) => {
    const numAmount = parseFloat(inputAmount);
     if (!inputAmount) {
         setFundAmountError(null); // Clear error if empty
         return true;
     }
    if (isNaN(numAmount) || numAmount <= 0) {
      setFundAmountError('Enter a positive amount.');
      return false;
    }
    if (eoaBalanceData && numAmount > parseFloat(formatUnits(eoaBalanceData.value, 18))) {
      setFundAmountError('Insufficient balance in wallet.');
      return false;
    }
    setFundAmountError(null);
    return true;
  };

  const handleFundAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFundAmount(value);
    validateFundAmount(value);
  };


  const handleFundSmartAccount = async () => {
    // Re-validate before sending
    if (!validateFundAmount(fundAmount) || !eoaAddress || !smartAccountAddress) {
      addToast({ message: 'Invalid funding details or wallet not ready.', type: 'error' });
      return;
    }
    addLog(`[ACTION] Funding ${fundAmount} MON from EOA to Smart Account`);

    try {
      const amountWei = parseUnits(fundAmount, 18);
      // Initiate transaction
      sendTransaction({ to: smartAccountAddress, value: amountWei });
      // Toasts and logs will be handled by the useEffect hook watching transaction status
    } catch (error: any) {
      addLog(`[ERROR] Failed to initiate funding transaction: ${error.message}`);
      addToast({ message: `Funding failed: ${error.message}`, type: 'error' });
    }
  };

  // Effect for handling funding transaction status updates
  useEffect(() => {
     if (isSendingFundTx) {
      if (toastIdRef.current !== null) removeToast(toastIdRef.current);
      toastIdRef.current = addToast({ message: `Sending ${fundAmount} MON... Check Wallet`, type: 'loading', duration: 60000 });
    }
    if (isConfirmingFundTx) {
      if (toastIdRef.current !== null) removeToast(toastIdRef.current);
      toastIdRef.current = addToast({ message: 'Confirming funding transaction...', type: 'loading', duration: 120000 });
    }
    if (isFundTxSuccess && fundTxHash) {
      if (toastIdRef.current !== null) removeToast(toastIdRef.current);
      addLog(`[SUCCESS] Smart Account funded successfully. Tx: ${fundTxHash}`);
      addToast({ message: 'Funding successful!', type: 'success', txHash: fundTxHash });
      fetchSaBalances(true); // Fetch SA balances silently
      // EOA balance will refetch automatically via useBalance hook
      setFundAmount('');
      setFundAmountError(null); // Clear error on success
      resetSendTransaction();
      toastIdRef.current = null;
    }
    if (fundError) {
      if (toastIdRef.current !== null) removeToast(toastIdRef.current);
      // Wagmi v2 often includes a user rejection message in error.message
      const errorMsg = fundError.message?.includes('User rejected the request')
          ? 'Transaction rejected by user.'
          : fundError.message || 'Unknown funding error';
      addLog(`[ERROR] Funding failed: ${errorMsg}`);
      addToast({ message: `Funding failed: ${errorMsg}`, type: 'error' });
      resetSendTransaction();
      toastIdRef.current = null;
    }
    // Cleanup ref on unmount or dependency change if transaction is pending
    return () => {
      if (toastIdRef.current !== null && (isSendingFundTx || isConfirmingFundTx)) {
         try { removeToast(toastIdRef.current); } catch {}
         toastIdRef.current = null;
      }
    };
    // Ensure all reactive values used are in the dependency array
  }, [isSendingFundTx, isConfirmingFundTx, isFundTxSuccess, fundTxHash, fundError, fundAmount, addLog, addToast, removeToast, fetchSaBalances, resetSendTransaction]);


  const fundingInProgress = isSendingFundTx || isConfirmingFundTx;

  const handleCopyAddress = () => {
    if (!smartAccountAddress) return;
    navigator.clipboard.writeText(smartAccountAddress)
      .then(() => addToast({ message: 'Smart Account address copied!', type: 'success', duration: 3000 }))
      .catch(() => addToast({ message: 'Failed to copy address', type: 'error', duration: 3000 }));
  };


  // --- Loading and Gating Logic ---
 if (isAuthLoading) {
    return (
       <LiquidBackground>
           <div className="min-h-screen flex items-center justify-center text-center">
               <div>
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
               <p className="mt-4 text-gray-400">Loading Session...</p>
               </div>
           </div>
       </LiquidBackground>
   );
 }

  if (!isAuthenticated) {
    return (
      <GatedState
        icon={<ShieldExclamationIcon className="h-12 w-12 mx-auto text-yellow-400" />}
        title="Authentication Required"
        description="Please sign in to manage funds."
        buttonText="Sign In on Dashboard"
        buttonLink="/dashboard"
      />
    );
  }

  if (!smartAccountAddress) {
    return (
      <GatedState
        icon={<LockClosedIcon className="h-12 w-12 mx-auto text-purple-400" />}
        title="Smart Account Required"
        description="Create a smart account on the dashboard to manage funds."
        buttonText="Go to Dashboard"
        buttonLink="/dashboard"
      />
    );
  }


  // --- Main Page Render ---
  return (
    <LiquidBackground>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        {/* Main Content Grid - centered */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">

          {/* Fund Smart Account Card - ENHANCED */}
          <Card delay={0.1}>
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-700/50"> {/* Added divider */}
              <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg bg-slate-800 ring-2 ring-green-500/30">
                <ArrowUpCircleIcon className="h-7 w-7 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Fund Smart Account</h2>
                <p className="text-sm text-gray-400">Add MON from your connected wallet.</p>
              </div>
            </div>

            {/* Content Inside Fund Card */}
            <div className="space-y-5">
                {/* EOA Balance Display */}
                 <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
                    <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                        <span>Connected Wallet Balance</span>
                        <WalletIcon className="h-4 w-4"/>
                    </div>
                    <div className="text-lg font-semibold text-white">
                        {isEoaBalanceLoading ? 'Loading...' : `${eoaBalanceFormatted} MON`}
                    </div>
                 </div>

                 {/* Smart Account Address Display */}
                 <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50 group relative">
                    <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                        <span>To Smart Account Address</span>
                         <button
                            onClick={handleCopyAddress}
                            className="absolute top-2 right-2 p-1 text-gray-500 hover:text-blue-300 bg-slate-700/50 hover:bg-blue-900/30 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Copy address"
                            disabled={!smartAccountAddress}
                        >
                            <ClipboardDocumentIcon className="h-4 w-4" />
                         </button>
                    </div>
                    <div className="font-mono text-sm text-blue-300 break-words">
                        {smartAccountAddress || 'N/A'}
                    </div>
                 </div>

                 {/* Amount Input Section */}
                <div>
                     <label htmlFor="fund-amount" className="block text-sm font-medium text-gray-400 mb-1.5">Amount to Fund</label>
                    <div className="relative">
                        <input
                            id="fund-amount"
                            type="number"
                            step="any"
                            min="0"
                            max={eoaBalanceNum}
                            value={fundAmount}
                            onChange={handleFundAmountChange}
                            placeholder="0.00 MON"
                            className={`w-full pl-4 pr-16 py-3 bg-slate-800/60 border-2 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500/50 transition-all duration-300 disabled:opacity-70 ${
                                fundAmountError ? 'border-red-500/70 focus:border-red-500/70' : 'border-slate-600 hover:border-slate-500 focus:border-green-500'
                            }`}
                            disabled={fundingInProgress || !isConnected}
                            aria-invalid={!!fundAmountError}
                            aria-describedby="fund-amount-error"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold pointer-events-none">MON</span>
                    </div>
                    {fundAmountError && (
                        <p id="fund-amount-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                            <ExclamationTriangleIcon className="h-4 w-4"/> {fundAmountError}
                        </p>
                    )}
                </div>

              {/* Fund Button */}
              <div className="pt-2">
                  <motion.button
                    onClick={handleFundSmartAccount}
                    disabled={fundingInProgress || !fundAmount || parseFloat(fundAmount) <= 0 || !!fundAmountError || !isConnected}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-500 font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center text-white shadow-lg hover:shadow-green-500/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
                    whileHover={{ scale: (fundingInProgress || !fundAmount || parseFloat(fundAmount) <= 0 || !!fundAmountError || !isConnected) ? 1 : 1.02 }}
                    whileTap={{ scale: (fundingInProgress || !fundAmount || parseFloat(fundAmount) <= 0 || !!fundAmountError || !isConnected) ? 1 : 0.98 }}
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {fundingInProgress ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="inline-block w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full mr-3"
                          />
                          {isSendingFundTx ? 'Awaiting Signature...' : 'Confirming...'}
                        </>
                      ) : (
                         <>
                            <ArrowUpCircleIcon className="h-5 w-5 mr-2 -ml-1"/>
                            Fund Smart Account
                         </>
                      )}
                    </span>
                  </motion.button>
                  {/* Signing Hint */}
                  {isSendingFundTx && !isConfirmingFundTx && (
                      <p className="mt-3 text-xs text-cyan-400 text-center flex items-center justify-center gap-1.5 animate-pulse">
                          <PencilSquareIcon className="h-4 w-4"/> Check your wallet to approve the transaction.
                      </p>
                  )}
                  {!isConnected && (
                     <p className="mt-3 text-xs text-yellow-400 text-center">
                         Connect your wallet to fund the account.
                     </p>
                  )}
                </div>
            </div>
          </Card>

          {/* Token Transfer Card */}
          <Card delay={0.2}>
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-700/50"> {/* Added divider */}
              <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg bg-slate-800 ring-2 ring-blue-500/30">
                <PaperAirplaneIcon className="h-7 w-7 text-blue-400 transform -rotate-45" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Transfer From Smart Account</h2>
                <p className="text-sm text-gray-400">Send tokens out from this Smart Account.</p>
              </div>
            </div>
            <TokenTransfer
                smartAccountAddress={smartAccountAddress}
                balances={saBalances}
                disabled={!smartAccountAddress || fundingInProgress} // Also disable if funding is in progress
            />
          </Card>
        </div>
      </main>
    </LiquidBackground>
  );
}