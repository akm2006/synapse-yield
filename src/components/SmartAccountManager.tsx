'use client';

import { useState } from 'react';
import type { Address } from 'viem';
import { createServerSmartAccount } from '@/lib/smartAccountClient';
import { useLogger } from '@/providers/LoggerProvider';
import { useToasts } from '@/providers/ToastProvider';
import { WalletIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface SmartAccountManagerProps {
  onSmartAccountReady: (address: Address) => void;
}

export default function SmartAccountManager({ onSmartAccountReady }: SmartAccountManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { addLog } = useLogger();
  const { addToast } = useToasts();

  const handleCreateSmartAccount = async () => {
    setIsCreating(true);
    addLog('[ACTION] Creating Smart Account...');
    addToast({ message: 'Creating your smart account...', type: 'loading' });

    try {
      const { smartAccount, address } = await createServerSmartAccount();
      
      onSmartAccountReady(address);
      addLog(`[SUCCESS] Smart Account created: ${address}`);
      addToast({ message: 'Smart account created successfully!', type: 'success' });
    } catch (err: any) {
      const errorMsg = `Failed to create Smart Account: ${err.message}`;
      addLog(`[ERROR] ${errorMsg}`);
      addToast({ message: 'Smart account creation failed.', type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg text-center"
    >
      <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mb-4">
          <WalletIcon className="h-7 w-7 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Create Your Smart Account</h3>
      <p className="text-sm text-gray-400 mb-6">
        This is the first step to unlock automated yield and one-click actions.
      </p>
      
      <button
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
        onClick={handleCreateSmartAccount}
        disabled={isCreating}
      >
        {isCreating ? (
          <>
            <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></span>
            Creating...
          </>
        ) : (
          <>
            <SparklesIcon className="h-5 w-5 mr-2" />
            Create Account
          </>
        )}
      </button>
    </motion.div>
  );
}
