'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { createWalletClient, custom, Address, walletActions, Account } from 'viem';
import { Implementation, toMetaMaskSmartAccount, getDeleGatorEnvironment } from '@metamask/delegation-toolkit';
import { publicClient, monad } from '@/lib/viemClients';
import DelegateManager from './DelegateManager';
export default function SmartAccountManager() {
  const { address: eoa, isConnected } = useAccount();
  const [smartAccountAddress, setSmartAccountAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const createSmartAccount = async () => {
    if (!eoa || !window.ethereum) {
      setError('Please connect your wallet first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // 1. Create a base client that can talk to MetaMask.
      const baseClient = createWalletClient({
        chain: monad,
        transport: custom(window.ethereum),
      }).extend(walletActions);

      // 2. Create a "Custom Account Bridge" object.
      const customAccount = {
        address: eoa,
        type: 'json-rpc',
        async signMessage({ message }: { message: any }) {
          return await baseClient.signMessage({ message, account: eoa });
        },
        async signTypedData(typedData: any) {
          return await baseClient.signTypedData({ ...typedData, account: eoa });
        },
        async signTransaction(transaction: any) {
          return await baseClient.signTransaction({ ...transaction, account: eoa });
        },
      } as unknown as Account; // Use `as unknown as Account` to override the strict type check.

      // 3. Create the final signer client, providing our custom account bridge.
      const signerClient = createWalletClient({
        account: customAccount,
        chain: monad,
        transport: custom(window.ethereum),
      });

      // 4. Get contract addresses automatically for the Monad chain.
      const environment = getDeleGatorEnvironment(monad.id);
      
      const salt: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000";

      const smartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        signer: signerClient,
        implementation: Implementation.Hybrid,
        deployParams: [eoa, [], [], []],
        deploySalt: salt,
        environment,
      });

      setSmartAccountAddress(smartAccount.address);
    } catch (err: any) {
      setError(`Failed to create Smart Account: ${err.message}`);
      console.error('Smart account creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="text-center w-full mt-6">
      <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg mb-4">
        <p className="font-bold">Wallet Connected!</p>
        <p className="text-xs break-all mt-1">{eoa}</p>
      </div>
      
      {smartAccountAddress ? (
            <>
              <div className="p-3 bg-purple-100 border border-purple-400 text-purple-700 rounded-lg">
                <p className="font-bold">Smart Account Created!</p>
                <p className="text-xs break-all mt-1">{smartAccountAddress}</p>
              </div>
              {/* 2. Add the DelegateManager here */}
              <DelegateManager smartAccountAddress={smartAccountAddress} />
            </>
          ) : (
            <button
              onClick={createSmartAccount}
              disabled={isLoading}
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed w-full"
            >
              {isLoading ? 'Creating...' : 'Step 2: Create Smart Account'}
            </button>
          )}


      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg w-full">
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}