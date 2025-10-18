'use client';

import { useState } from 'react';
import type { Address } from 'viem';
import { useSmartAccount } from '@/hooks/useSmartAccount'; // Handles derivation logic
import { useLogger } from '@/providers/LoggerProvider';
import { useToasts } from '@/providers/ToastProvider';
import { WalletIcon, BoltIcon, CheckCircleIcon, CubeTransparentIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import Card from '@/components/common/Card'; // <-- Import the new Card component

interface SmartAccountManagerProps {
  onSmartAccountReady: (address: Address) => void;
  isDeployedFromParent?: boolean | null;
  checkingDeploymentFromParent?: boolean;
}

export default function SmartAccountManager({
  onSmartAccountReady,
  isDeployedFromParent,
  checkingDeploymentFromParent,
}: SmartAccountManagerProps) {
  const [isActivating, setIsActivating] = useState(false);
  const { addLog } = useLogger();
  const { addToast, removeToast } = useToasts();
  const { smartAccountAddress, isLoading: isSmartAccountLoading } = useSmartAccount();
  
  const isDeployedEffective = isDeployedFromParent ?? null;
  const checkingDeploymentEffective = checkingDeploymentFromParent ?? false;

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
      addLog('[INFO] Activation initiated; parent will perform deployment if needed.');
      addToast({ message: 'Preparing smart account...', type: 'info', duration: 4000 });
      onSmartAccountReady(smartAccountAddress);
    } catch (err: any) {
      const errorMsg = `Failed during activation initiation: ${err?.message ?? err}`;
      addLog(`[ERROR] ${errorMsg}`);
      addToast({ message: 'Smart account activation failed to start.', type: 'error' });
    } finally {
      setIsActivating(false);
      try { 
        removeToast(loadingToastId);
      } catch {}
    }
  };

  const isLoading = isActivating || isSmartAccountLoading || checkingDeploymentEffective;
  let buttonText = "Initialize Smart Account";
  if (isLoading) {
    buttonText = "Initializing...";
  } else if (isDeployedEffective === true) {
    buttonText = "Account Active";
  } else if (isDeployedEffective === false) {
    buttonText = "Activate Account";
  }

  return (
    <Card>
      <div className="text-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto h-16 w-16 mb-6 flex items-center justify-center rounded-full bg-slate-800 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/30"
        >
          <WalletIcon className="h-8 w-8 text-blue-300" />
        </motion.div>

        <h3 className="text-2xl font-bold text-white mb-3">Your Smart Account</h3>
        <p className="text-sm text-gray-400 mb-8 max-w-xs mx-auto">
          This account enables automated yield, gasless transactions, and one-click DeFi actions.
        </p>

        {smartAccountAddress && (
          <div className="bg-black/20 rounded-xl p-4 mb-8 border border-white/10">
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-medium">Smart Account Address</p>
            <p className="font-mono text-sm text-blue-300 break-words mb-3">{smartAccountAddress}</p>
            <div className="border-t border-white/10 pt-3 flex items-center justify-center gap-2 text-xs font-medium">
              {checkingDeploymentEffective ? (
                <>
                   <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="inline-block w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"
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
                  <CubeTransparentIcon className="h-4 w-4 text-cyan-400" />
                  <span className="text-cyan-400">Ready (Counterfactual)</span>
                </>
              ) : (
                   <span className="text-gray-500">Status Unknown</span>
              )}
            </div>
          </div>
        )}

        {isDeployedEffective !== true && (
          <motion.button
            className="group relative w-full bg-gradient-to-r from-blue-700 via-purple-600 to-teal-700 font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center overflow-hidden text-white shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleActivation}
            disabled={isLoading || !smartAccountAddress}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                  <BoltIcon className="h-5 w-5 mr-2" />
                  {buttonText}
                </>
              )}
            </span>
          </motion.button>
        )}
        
        {isDeployedEffective === true && (
          <div className="text-green-300 text-sm font-medium p-4 bg-green-900/30 rounded-xl border-2 border-green-500/40 flex items-center justify-center gap-3">
            <CheckCircleIcon className="h-6 w-6"/>
            <span>Smart Account is Active</span>
          </div>
        )}
      </div>
    </Card>
  );
}

