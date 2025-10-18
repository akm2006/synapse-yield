// src/components/modules/dashboard/AccountStatusPanel.tsx
'use client';

import { useState, useEffect } from 'react'; // Added useState and useEffect
import { motion } from 'framer-motion';
import { Address } from 'viem';
import {
  InformationCircleIcon,
  CheckCircleIcon,
  CogIcon,
  CubeTransparentIcon, // Icon for counterfactual status
  ClipboardDocumentIcon, // Icon for copy action
} from '@heroicons/react/24/outline';
import { useSmartAccount } from '@/hooks/useSmartAccount'; // Import hook to get deployment status
import { useToasts } from '@/providers/ToastProvider'; // Import for copy feedback

interface AccountStatusPanelProps {
  smartAccountAddress: Address;
  hasDelegation: boolean;
  // Optional props: if provided by a parent, use those instead of running internal checks
  isDeployed?: boolean | null;
  checkingDeployment?: boolean;
}

const AccountStatusPanel: React.FC<AccountStatusPanelProps> = ({
  smartAccountAddress,
  hasDelegation,
  isDeployed: propIsDeployed,
  checkingDeployment: propCheckingDeployment,
}) => {
  // --- Start: Deployment Status Logic (prefer external props) ---
  const { checkDeploymentStatus } = useSmartAccount(); // Get the check function
  const { addToast } = useToasts();

  // Local state only used when parent doesn't provide the values
  const [localIsDeployed, setLocalIsDeployed] = useState<boolean | null>(null);
  const [localCheckingDeployment, setLocalCheckingDeployment] = useState<boolean>(true);

  // If parent didn't supply isDeployed/checkingDeployment, run the internal check
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

    // Only run the internal check when the parent DID NOT provide the prop
    if (propIsDeployed === undefined && smartAccountAddress) {
      checkStatus();
    }

    return () => { isMounted = false; };
  }, [smartAccountAddress, checkDeploymentStatus, propIsDeployed]);
  // --- End: Deployment Status Logic ---

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(smartAccountAddress)
      .then(() => {
        addToast({ message: 'Smart Account address copied!', type: 'success', duration: 3000 });
      })
      .catch(() => {
        addToast({ message: 'Failed to copy address', type: 'error', duration: 3000 });
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }} // Slightly delay after PortfolioSummary
      // Updated styling for Liquid Synapse theme
      className="bg-gradient-to-br from-gray-950 via-blue-950/20 to-gray-950 p-6 rounded-2xl border border-blue-800/30 shadow-xl shadow-black/40 hover:border-blue-700/50 transition-colors duration-300"
    >
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
        {/* Changed icon color to be more thematic */}
        <InformationCircleIcon className="h-6 w-6 text-blue-400" />
        Account Status
      </h3>
      <div className="space-y-5"> {/* Increased spacing */}

        {/* Smart Account Address Section */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/10 group relative"> {/* Added group relative for button */}
          <div className="flex justify-between items-center mb-1">
             <p className="text-xs text-gray-500 uppercase tracking-wider">Smart Account</p>
             {/* Copy Button */}
             <button
                onClick={handleCopyAddress}
                className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-blue-400 bg-gray-800/50 hover:bg-blue-900/40 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Copy address"
              >
               <ClipboardDocumentIcon className="h-4 w-4" />
             </button>
          </div>
          <p className="font-mono text-sm text-blue-300 break-words">{smartAccountAddress}</p>

          {/* Deployment Status Indicator */}
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-center gap-2 text-xs">
             {/* Prefer parent-provided values when available */}
             { (propCheckingDeployment ?? localCheckingDeployment) ? (
              <>
                 <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full"
                  />
                  <span className="text-yellow-400">Checking Status...</span>
              </>
            ) : (propIsDeployed ?? localIsDeployed) === true ? (
               <>
                 <CheckCircleIcon className="h-4 w-4 text-green-400" />
                 <span className="text-green-400 font-medium">Deployed On-Chain</span>
               </>
            ) : (propIsDeployed ?? localIsDeployed) === false ? (
              <>
                <CubeTransparentIcon className="h-4 w-4 text-orange-400" />
                <span className="text-orange-400 font-medium">Ready (Counterfactual)</span>
              </>
            ) : (
                 <span className="text-gray-500">Status Unknown</span> // Fallback
            )}
          </div>
        </div>

        {/* Delegation Status Section */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            hasDelegation
                ? 'bg-gradient-to-r from-green-900/30 to-teal-900/30 border-green-700/50' // Use gradient
                : 'bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-700/50' // Use gradient
          }`}>
          {hasDelegation ? (
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
                <CheckCircleIcon className="h-6 w-6 text-green-300" /> {/* Slightly larger icon */}
              </motion.div>
              <span className="text-sm font-medium text-green-200">Delegation: Active</span>
            </>
          ) : (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              >
                <CogIcon className="h-6 w-6 text-yellow-300" /> {/* Slightly larger icon */}
              </motion.div>
              <span className="text-sm font-medium text-yellow-200">Delegation: Setup Required</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AccountStatusPanel;