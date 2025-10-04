// src/app/components/SmartAccountManager.tsx
'use client';

import { useState, useEffect } from 'react';
import type { Address } from 'viem';
import { createSmartAccount } from '@/lib/smartAccountClient';

interface SmartAccountManagerProps {
  onSmartAccountReady: (address: Address) => void;
  onLog: (message: string) => void;
}

export default function SmartAccountManager({ onSmartAccountReady, onLog }: SmartAccountManagerProps) {
  const [smartAccountAddress, setSmartAccountAddress] = useState<Address | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSmartAccount = async () => {
    setIsCreating(true);
    setError(null);
    onLog('[INFO] Creating Smart Account...');

    try {
      const { smartAccount, address } = await createSmartAccount();
      
      setSmartAccountAddress(address);
      onSmartAccountReady(address);
      onLog(`[SUCCESS] Smart Account created: ${address}`);
      onLog(`[INFO] Smart Account ready for transactions`);
    } catch (err: any) {
      const errorMsg = `Failed to create Smart Account: ${err.message}`;
      setError(errorMsg);
      onLog(`[ERROR] ${errorMsg}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="mb-6 p-4 border border-gray-300 rounded">
      <h2 className="text-xl font-semibold mb-3">Smart Account</h2>
      
      {!smartAccountAddress ? (
        <div>
          <p className="mb-3 text-gray-600">
            Create a MetaMask Smart Account to enable advanced features and delegations.
          </p>
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded shadow"
            onClick={handleCreateSmartAccount}
            disabled={isCreating}
          >
            {isCreating ? 'Creating Smart Account...' : 'Create Smart Account'}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-2">Smart Account Address:</p>
          <p className="font-mono text-sm bg-gray-500 p-2 rounded break-all">
            {smartAccountAddress}
          </p>
          <div className="mt-2 text-green-600 text-sm">
            ✅ Smart Account ready
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </section>
  );
}
