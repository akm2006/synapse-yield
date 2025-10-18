// src/components/SmartAccountManager.tsx
'use client';

import { useState } from 'react';
import type { Address } from 'viem';
import { useSmartAccount } from '@/hooks/useSmartAccount'; // Handles derivation logic
import { useLogger } from '@/providers/LoggerProvider';
import { useToasts } from '@/providers/ToastProvider';
import { WalletIcon, SparklesIcon, CheckCircleIcon, CubeTransparentIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface SmartAccountManagerProps {
  onSmartAccountReady: (address: Address) => void;
  // Parent-controlled deployment status (Dashboard should provide these)
  isDeployedFromParent?: boolean | null;
  checkingDeploymentFromParent?: boolean;
}

export default function SmartAccountManager({
  onSmartAccountReady,
  isDeployedFromParent,
  checkingDeploymentFromParent,
}: SmartAccountManagerProps) {
  const [isActivating, setIsActivating] = useState(false); // Changed state name for clarity
  const { addLog } = useLogger();
  const { addToast, removeToast } = useToasts();
  const { smartAccountAddress, isLoading: isSmartAccountLoading } = useSmartAccount();
  // Use only parent-provided values for display/logic. If undefined, treated as unknown/false.
  const isDeployedEffective = isDeployedFromParent ?? null;
  const checkingDeploymentEffective = checkingDeploymentFromParent ?? false;

  // Handle the button click - now primarily focuses on signaling readiness/first use
  const handleActivation = async () => {
    if (!smartAccountAddress) {
      addLog('[ERROR] Smart Account address not yet derived.');
      addToast({ message: 'Waiting for smart account address...', type: 'error' });
      return;
    }

    setIsActivating(true);
    addLog('[ACTION] Preparing Smart Account for first use...');
    let loadingToastId = addToast({ message: 'Preparing smart account...', type: 'loading', duration: 10000 });

    try {
      // We no longer perform local deployment checks here. The Dashboard is the single source
      // of truth and performs deployment verification. We simply notify the parent that the
      // user has initiated activation and show appropriate toasts.
      addLog('[INFO] Activation initiated; parent will perform deployment if needed.');
      addToast({ message: 'Preparing smart account...', type: 'info', duration: 4000 });

      // Notify the parent component that the process is complete (address is ready)
      onSmartAccountReady(smartAccountAddress);
    } catch (err: any) {
      const errorMsg = `Failed during activation initiation: ${err?.message ?? err}`;
      addLog(`[ERROR] ${errorMsg}`);
      addToast({ message: 'Smart account activation failed to start.', type: 'error' });
    } finally {
      setIsActivating(false);
      try { // Attempt to remove loading toast
        removeToast(loadingToastId);
      } catch {}
    }
  };

  // Determine button text and disabled state
  const isLoading = isActivating || isSmartAccountLoading || checkingDeploymentEffective;
  let buttonText = "Initialize Smart Account";
  if (isLoading) {
    buttonText = "Initializing...";
  } else if (isDeployedEffective === true) {
    buttonText = "Account Active"; // Or potentially hide the component entirely based on parent logic
  } else if (isDeployedEffective === false) {
    buttonText = "Activate Account (First Use)";
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-gradient-to-br from-gray-950 via-blue-950/20 to-gray-950 p-8 rounded-2xl border border-blue-800/30 shadow-2xl shadow-black/50 text-center hover:border-blue-700/50 transition-colors duration-300"
    >
      {/* Icon Container */}
      <motion.div
        animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="mx-auto h-16 w-16 mb-6 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-teal-400 shadow-lg shadow-blue-500/30"
      >
        <WalletIcon className="h-8 w-8 text-white" />
      </motion.div>

      {/* Text Content */}
      <h3 className="text-xl font-semibold text-white mb-3">Your Smart Account</h3>
      <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
        This account enables automated yield, gasless transactions, and one-click DeFi actions.
      </p>

      {/* Display Derived Address and Status */}
      {smartAccountAddress && (
        <div className="bg-black/30 rounded-lg p-4 mb-8 border border-white/10">
          <p className="text-xs text-gray-500 mb-1">Smart Account Address</p>
          <p className="font-mono text-sm text-blue-400 break-words mb-2">{smartAccountAddress}</p>
          <div className="flex items-center justify-center gap-2 text-xs">
            {checkingDeploymentEffective ? (
              <>
                 <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full"
                  />
                  <span className="text-yellow-400">Checking Status...</span>
              </>
            ) : isDeployedEffective === true ? (
               <>
                 <CheckCircleIcon className="h-4 w-4 text-green-400" />
                 <span className="text-green-400">Deployed On-Chain</span>
               </>
            ) : isDeployedEffective === false ? (
              <>
                <CubeTransparentIcon className="h-4 w-4 text-orange-400" />
                <span className="text-orange-400">Ready (Not Deployed)</span>
              </>
            ) : (
                 <span className="text-gray-500">Status Unknown</span>
            )}
          </div>
        </div>
      )}

      {/* Action Button - Only show if not yet deployed or status unknown */}
    {isDeployedEffective !== true && (
          <motion.button
            className="group relative w-full bg-gradient-to-r from-blue-600 to-teal-500 font-semibold py-3 px-6 rounded-lg transition duration-300 flex items-center justify-center overflow-hidden text-white shadow-lg hover:shadow-blue-500/40 disabled:opacity-70 disabled:cursor-not-allowed"
            onClick={handleActivation}
            disabled={isLoading || !smartAccountAddress} // Disable until address is derived
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Shine effect on hover */}
            <span className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -translate-x-full group-hover:translate-x-full ease-out" />

            {/* Content */}
            <span className="relative z-10 flex items-center justify-center">
                  {isLoading ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                  />
                  {checkingDeploymentEffective ? 'Checking Status...' : 'Initializing...'}
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  {buttonText}
                </>
              )}
            </span>
          </motion.button>
        )}
         {/* Show message if already deployed instead of button */}
         {isDeployedEffective === true && (
             <div className="text-green-400 text-sm font-medium p-3 bg-green-900/30 rounded-lg border border-green-700/50">
                Smart Account is active and ready. Proceed to Delegation setup.
             </div>
         )}
    </motion.div>
  );
}