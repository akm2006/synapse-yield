'use client';

import { motion } from 'framer-motion';
import { Address } from 'viem';
import { InformationCircleIcon, CheckCircleIcon, CogIcon } from '@heroicons/react/24/outline';

interface AccountStatusPanelProps {
  smartAccountAddress: Address;
  hasDelegation: boolean;
}

const AccountStatusPanel: React.FC<AccountStatusPanelProps> = ({ smartAccountAddress, hasDelegation }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-lg"
    >
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-3">
        <InformationCircleIcon className="h-6 w-6 text-gray-400" />
        Account Status
      </h3>
      <div className="space-y-4">
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Smart Account Address</p>
          <p className="font-mono text-sm text-blue-400 break-words">{smartAccountAddress}</p>
        </div>
        <div className={`flex items-center gap-3 p-3 rounded-lg ${hasDelegation ? 'bg-green-900/30' : 'bg-yellow-900/30'}`}>
          {hasDelegation ? (
            <>
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <span className="text-sm font-medium text-green-300">Delegation: Active</span>
            </>
          ) : (
            <>
              <CogIcon className="h-5 w-5 text-yellow-400 animate-pulse" />
              <span className="text-sm font-medium text-yellow-300">Delegation: Setup Required</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AccountStatusPanel;
