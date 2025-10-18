// src/components/onboarding/OnboardingModal.tsx
'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Address, parseUnits, formatUnits } from 'viem';
import { useAccount } from 'wagmi';
import {
  XMarkIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CurrencyDollarIcon, // Step 1: Fund
  BoltIcon, // Step 2: Activate
  KeyIcon, // Step 3: Delegate
  ClipboardDocumentIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useBalances } from '@/providers/BalanceProvider';
import { useToasts } from '@/providers/ToastProvider';
import { useLogger } from '@/providers/LoggerProvider';
import DelegationManager from '@/components/DelegationManager';
import Link from 'next/link';

// --- Configuration ---
const MIN_FUNDING_THRESHOLD_MON = 0.2;
const MIN_FUNDING_THRESHOLD_WEI = parseUnits(MIN_FUNDING_THRESHOLD_MON.toString(), 18);

// --- Types ---
interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void; // Function to signal completion/closing
  initialStep: number;
  smartAccountAddress: Address;
  isDeployed: boolean | null;
  hasDelegation: boolean;
  onDelegationCreated: () => void; // Callback when delegation finishes
  onFundingComplete?: () => void; // <-- FIX: ADDED THIS PROP
  onDeploymentComplete?: () => void; // <-- FIX: ADDED THIS PROP
}

const steps = [
  { id: 1, title: 'Fund Account', icon: CurrencyDollarIcon },
  { id: 2, title: 'Activate Account', icon: BoltIcon },
  { id: 3, title: 'Setup Delegation', icon: KeyIcon },
];

export function OnboardingModal({
  isOpen,
  onClose,
  initialStep,
  smartAccountAddress,
  isDeployed: initialIsDeployed,
  hasDelegation,
  onDelegationCreated,
  onFundingComplete, // <-- FIX: ADDED THIS PROP
  onDeploymentComplete, // <-- FIX: ADDED THIS PROP
}: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isDeployed, setIsDeployed] = useState(initialIsDeployed);

  // Hooks for step actions
  const { balances, fetchBalances, isLoading: isBalanceLoading } = useBalances();
  const { checkDeploymentStatus, isLoading: isSALoading } = useSmartAccount();
  const { addToast, removeToast } = useToasts();
  const { addLog } = useLogger();
  const { address: eoaAddress } = useAccount();

  // Loading states for actions within the modal
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [isCheckingDeployment, setIsCheckingDeployment] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [fundAmount, setFundAmount] = useState('');

  // Update internal deployment state if prop changes
  useEffect(() => {
    setIsDeployed(initialIsDeployed);
  }, [initialIsDeployed]);
  
  // Update currentStep if initialStep prop changes
  useEffect(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  // --- Helper to ensure correct chain ---
   const ensureMonadChain = async () => {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error("No wallet provider found");
    const monadHex = process.env.NEXT_PUBLIC_CHAIN_ID || '0x279f'; // 10143
    const chainId = await eth.request({ method: 'eth_chainId' });
    if (chainId !== monadHex) {
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: monadHex }],
        });
      } catch {
        try {
            await eth.request({
            method: 'wallet_addEthereumChain',
            params: [
                {
                chainId: monadHex,
                chainName: 'Monad Testnet',
                nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
                rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL!],
                blockExplorerUrls: ['https://testnet.monadexplorer.com'],
                },
            ],
            });
        } catch (addError) {
             throw new Error("Failed to switch/add Monad Testnet to wallet.");
        }
      }
      const newChainId = await eth.request({ method: 'eth_chainId' });
      if (newChainId !== monadHex) {
          throw new Error("User rejected chain switch or add operation.");
      }
    }
  };


  // --- Step Action Handlers ---
  const handleFundAccount = async () => {
    if (!smartAccountAddress || !eoaAddress) { /* ... error handling ... */ return; }
    const eth = (window as any).ethereum;
    if (!eth) { /* ... error handling ... */ return; }

    const amountToFund = fundAmount || MIN_FUNDING_THRESHOLD_MON.toString();
    const valueWei = parseUnits(amountToFund, 18);
    if (valueWei <= 0n) { /* ... error handling ... */ return; }
    const valueHex = valueWei.toString(16);

    setIsFunding(true);
    addLog(`[ONBOARDING][ACTION] Funding Smart Account: ${amountToFund} MON from ${eoaAddress}`);
    let loadingToastId: number | null = null;
    try {
      await ensureMonadChain();
      loadingToastId = addToast({ message: `Sending ${amountToFund} MON...`, type: 'loading', duration: 60000 });
      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{ from: eoaAddress, to: smartAccountAddress, value: '0x' + valueHex }],
      });
      addLog(`[ONBOARDING][TX] Funding transaction submitted: ${txHash}`);
      if (loadingToastId != null) removeToast(loadingToastId);
      addToast({ message: 'Funding transaction sent!', type: 'success', txHash, duration: 8000 });
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Delay
      await handleCheckBalance(true); // Check balance and notify parent
      setFundAmount('');
    } catch (err: any) {
      addLog(`[ONBOARDING][ERROR] Funding failed: ${err?.message || String(err)}`);
      if (loadingToastId != null) { try { removeToast(loadingToastId); } catch {} }
      addToast({ message: `Funding failed: ${err?.message || String(err)}`, type: 'error' });
    } finally {
      setIsFunding(false);
    }
  };


  const handleCheckBalance = async (notifyParent = false) => {
    setIsCheckingBalance(true);
    addLog('[ONBOARDING] Checking account balance...');
    // Fetch balances silently (updates context)
    await fetchBalances(true); 
    // Now read the updated balance *from the context variable*
    const updatedBalanceWei = parseUnits(balances.native || '0', 18); // <-- FIX: Use context `balances` here

    if (updatedBalanceWei >= MIN_FUNDING_THRESHOLD_WEI) {
      addLog('[ONBOARDING] Funding requirement met.');
      addToast({ message: 'Account funded!', type: 'success', duration: 3000 });
      if (notifyParent && onFundingComplete) onFundingComplete(); // Notify dashboard
    } else {
      addLog('[ONBOARDING] Funding requirement not yet met.');
      addToast({ message: `Account still needs funding (min ${MIN_FUNDING_THRESHOLD_MON} MON).`, type: 'info', duration: 4000 });
    }
    setIsCheckingBalance(false);
  };
   const handleCheckDeployment = async () => {
    setIsCheckingDeployment(true);
    addLog('[ONBOARDING] Checking account deployment status...');
    const deployed = await checkDeploymentStatus();
    setIsDeployed(deployed); // Update internal state
    if (deployed) {
      addLog('[ONBOARDING] Account activation confirmed.');
      addToast({ message: 'Account activated!', type: 'success', duration: 3000 });
      if (onDeploymentComplete) onDeploymentComplete(); // Notify dashboard
    } else {
      addLog('[ONBOARDING] Account activation not detected yet.');
      addToast({ message: 'Activation transaction not confirmed. Please wait and try again.', type: 'info', duration: 5000 });
    }
    setIsCheckingDeployment(false);
  };

  const handleDelegationComplete = () => {
    addLog('[ONBOARDING] Delegation setup complete.');
    addToast({ message: 'Setup complete! You\'re ready.', type: 'success' });
    onDelegationCreated(); // Notify parent
    onClose(); // Close modal
  };

   const handleCopyAddress = () => {
    navigator.clipboard.writeText(smartAccountAddress)
      .then(() => addToast({ message: 'Smart Account address copied!', type: 'success', duration: 3000 }))
      .catch(() => addToast({ message: 'Failed to copy address', type: 'error', duration: 3000 }));
  };


  // --- Render Step Content --- (No changes here)
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Fund Account
        return (
          <div className="space-y-6 text-center">
             <div className="mx-auto h-16 w-16 mb-4 flex items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-400 shadow-lg shadow-green-500/30">
               <CurrencyDollarIcon className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">Step 1: Fund Your Smart Account</h4>
            <p className="text-sm text-gray-400">
              Send at least {MIN_FUNDING_THRESHOLD_MON} MON from your connected wallet to your Smart Account to cover setup.
            </p>
             <div className="bg-black/40 rounded-xl p-4 border border-white/10 group relative text-left">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Your Smart Account Address:</p>
                    <button onClick={handleCopyAddress} className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-blue-400 bg-gray-800/50 hover:bg-blue-900/40 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label="Copy address">
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                </div>
                <p className="font-mono text-sm text-blue-300 break-words">{smartAccountAddress}</p>
            </div>
            <div className="space-y-3 pt-4">
                 <label htmlFor="fundAmount" className="block text-sm font-medium text-gray-300 text-left">Amount to Fund (MON)</label>
                 <input
                    id="fundAmount"
                    type="number" min="0.001" step="0.01"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    placeholder={`e.g., ${MIN_FUNDING_THRESHOLD_MON}`}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    disabled={isFunding}
                 />
                 <motion.button
                    onClick={handleFundAccount}
                    disabled={isFunding || !eoaAddress}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-500 font-semibold py-3 px-6 rounded-lg transition duration-300 flex items-center justify-center text-white shadow-lg hover:shadow-green-500/40 disabled:opacity-70 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
                 >
                    {isFunding ? (
                        <> <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" /> Sending Funds...</>
                    ) : (
                        `Send ${fundAmount || MIN_FUNDING_THRESHOLD_MON} MON from Wallet`
                    )}
                </motion.button>
            </div>
             <div className="flex items-center gap-4 py-2">
                 <hr className="flex-grow border-t border-gray-700"/>
                 <span className="text-xs text-gray-500">OR</span>
                 <hr className="flex-grow border-t border-gray-700"/>
             </div>
            <motion.button
              onClick={() => handleCheckBalance(true)} // Pass true to notify parent
              disabled={isCheckingBalance || isBalanceLoading || isFunding}
              className="w-full bg-gray-700/50 hover:bg-gray-600/50 border border-white/10 font-medium py-3 px-6 rounded-lg transition duration-300 flex items-center justify-center text-gray-300 hover:text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
            >
              {isCheckingBalance || isBalanceLoading ? (
                <> <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" /> Checking Balance...</>
              ) : (
                'I Already Sent Funds - Check Balance'
              )}
            </motion.button>
          </div>
        );
      case 2: // Activate Account
        return (
          <div className="space-y-6 text-center">
             <div className="mx-auto h-16 w-16 mb-4 flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 shadow-lg shadow-orange-500/30">
               <BoltIcon className="h-8 w-8 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white">Step 2: Activate Your Account</h4>
            <p className="text-sm text-gray-400">
              Your account is funded but needs one transaction to be deployed on-chain.
            </p>
             <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded-lg text-xs text-yellow-300 flex items-start gap-2">
                <InformationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5"/>
                 <span>Go to the <Link href="/swap" className="font-semibold underline hover:text-yellow-200">Swap Page</Link>, select the 'Transfer' tab, and send a tiny amount (e.g., 0.001 MON) from your Smart Account to any address.</span>
             </div>
             <motion.button
              onClick={handleCheckDeployment}
              disabled={isCheckingDeployment || isSALoading}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-teal-500 font-semibold py-3 px-6 rounded-lg transition duration-300 flex items-center justify-center text-white shadow-lg hover:shadow-blue-500/40 disabled:opacity-70 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
            >
              {isCheckingDeployment || isSALoading ? (
                 <> <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" /> Checking Status...</>
              ) : (
                'I Sent the Transfer - Check Status'
              )}
            </motion.button>
             <p className="text-xs text-gray-500">Wait a few seconds after sending the transfer before checking the status.</p>
          </div>
        );
      case 3: // Setup Delegation
        return (
          <div className="space-y-6 text-left">
             <div className="flex items-center gap-4 mb-4">
                 <div className="h-16 w-16 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-400 shadow-lg shadow-purple-500/30">
                 <KeyIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h4 className="text-xl font-semibold text-white">Step 3: Setup Secure Delegation</h4>
                    <p className="text-sm text-gray-400 mt-1">
                    Grant permission for automated actions without sharing your keys.
                    </p>
                </div>
            </div>
            <DelegationManager
              smartAccountAddress={smartAccountAddress}
              onDelegationCreated={handleDelegationComplete}
              isCreating={false}
            />
          </div>
        );
      default:
        return <div>Loading step...</div>;
    }
  };

  // --- Modal JSX --- (No changes here)
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={() => { /* No close on overlay click */ }}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-blue-950/20 to-gray-900 p-6 md:p-8 text-left align-middle shadow-2xl shadow-black/50 border border-blue-800/50 transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white mb-2">
                  Liquid Synapse Setup ({currentStep}/{steps.length})
                </Dialog.Title>

                <div className="flex items-start mb-6">
                    {steps.map((step, index) => (
                        <Fragment key={step.id}>
                            <div className="flex flex-col items-center flex-shrink-0 w-16">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${currentStep >= step.id ? 'border-blue-500 bg-blue-500/30' : 'border-gray-700 bg-gray-800'}`}>
                                    {currentStep > step.id ? <CheckCircleIcon className="h-5 w-5 text-blue-300" /> : <step.icon className={`h-4 w-4 ${currentStep === step.id ? 'text-blue-300' : 'text-gray-500'}`} />}
                                </div>
                                <p className={`mt-1 text-xs text-center ${currentStep >= step.id ? 'text-blue-300 font-medium' : 'text-gray-500'}`}>{step.title}</p>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`flex-grow h-0.5 mt-4 transition-colors duration-300 ${currentStep > step.id ? 'bg-blue-500' : 'bg-gray-700'}`} />
                            )}
                        </Fragment>
                    ))}
                </div>

                 <AnimatePresence mode="wait">
                    <motion.div
                       key={currentStep}
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       transition={{ duration: 0.3 }}
                    >
                        {renderStepContent()}
                    </motion.div>
                </AnimatePresence>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}