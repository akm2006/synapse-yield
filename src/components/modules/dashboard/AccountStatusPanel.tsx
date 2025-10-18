// src/components/modules/dashboard/AccountStatusPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Address } from 'viem';
import {
  InformationCircleIcon,
  CheckCircleIcon,
  CogIcon,
  CubeTransparentIcon,
  ClipboardDocumentIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useToasts } from '@/providers/ToastProvider';
import Card from '@/components/common/Card'; // <-- Import the new Card component

interface AccountStatusPanelProps {
  smartAccountAddress: Address;
  hasDelegation: boolean;
  isDeployed?: boolean | null;
  checkingDeployment?: boolean;
}

const AccountStatusPanel: React.FC<AccountStatusPanelProps> = ({
  smartAccountAddress,
  hasDelegation,
  isDeployed: propIsDeployed,
  checkingDeployment: propCheckingDeployment,
}) => {
  const { checkDeploymentStatus } = useSmartAccount();
  const { addToast } = useToasts();

  const [localIsDeployed, setLocalIsDeployed] = useState<boolean | null>(null);
  const [localCheckingDeployment, setLocalCheckingDeployment] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      if (!isMounted) return;
      setLocalCheckingDeployment(true);
      try {
        const deployed = await checkDeploymentStatus();
        if (isMounted) setLocalIsDeployed(deployed);
      } catch (err) {
        console.error('Failed to check deployment status (panel):', err);
        if (isMounted) setLocalIsDeployed(null);
      } finally {
        if (isMounted) setLocalCheckingDeployment(false);
      }
    };

    if (propIsDeployed === undefined && smartAccountAddress) {
      checkStatus();
    }

    return () => { isMounted = false; };
  }, [smartAccountAddress, checkDeploymentStatus, propIsDeployed]);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(smartAccountAddress)
      .then(() => {
        addToast({ message: 'Smart Account address copied!', type: 'success', duration: 3000 });
      })
      .catch(() => {
        addToast({ message: 'Failed to copy address', type: 'error', duration: 3000 });
      });
  };

  const isCheckingEffective = propCheckingDeployment ?? localCheckingDeployment;
  const isDeployedEffective = propIsDeployed ?? localIsDeployed;

  return (
    <Card delay={0.2}>
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
        <InformationCircleIcon className="h-6 w-6 text-blue-400" />
        Account Status
      </h3>
      <div className="space-y-6">

        {/* Smart Account Address Section */}
        <div className="bg-black/20 rounded-xl p-4 border border-white/10 group relative transition-all duration-300 hover:border-white/20">
          <div className="flex justify-between items-center mb-1">
             <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Smart Account</p>
             <button
                onClick={handleCopyAddress}
                className="absolute top-2.5 right-2.5 p-1.5 text-gray-500 hover:text-blue-300 bg-slate-800/50 hover:bg-blue-900/30 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Copy address"
              >
               <ClipboardDocumentIcon className="h-4 w-4" />
             </button>
          </div>
          <p className="font-mono text-sm text-blue-300 break-words">{smartAccountAddress}</p>

          {/* Deployment Status Indicator */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-center gap-2 text-xs font-medium">
             { isCheckingEffective ? (
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

        {/* Delegation Status Section */}
        <div className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 ${
            hasDelegation
                ? 'bg-gradient-to-r from-green-500/10 to-teal-500/10 border-green-500/40'
                : 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/40'
          }`}>
          {hasDelegation ? (
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
                <LockClosedIcon className="h-7 w-7 text-green-300" />
              </motion.div>
              <div>
                <span className="text-base font-semibold text-green-200">Delegation Active</span>
                <p className="text-xs text-gray-400">One-click actions are enabled.</p>
              </div>
            </>
          ) : (
            <>
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <CogIcon className="h-7 w-7 text-purple-300" />
              </motion.div>
              <div>
                <span className="text-base font-semibold text-purple-200">Delegation Required</span>
                <p className="text-xs text-gray-400">Setup needed for automation.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AccountStatusPanel;
