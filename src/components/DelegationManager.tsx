"use client";
import { useState, useEffect } from "react";
import { Address } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { useSmartAccount } from "@/hooks/useSmartAccount";
import type { Delegation } from "@metamask/delegation-toolkit";
import { useLogger } from '@/providers/LoggerProvider';
import Card from '@/components/common/Card';
import { motion } from 'framer-motion';
import { LockClosedIcon, InformationCircleIcon, ExclamationTriangleIcon, LinkIcon } from '@heroicons/react/24/outline';

interface DelegationManagerProps {
  smartAccountAddress: Address;
  onDelegationCreated: (delegation: Delegation) => void;
  isCreating: boolean;
}

export default function DelegationManager({
  smartAccountAddress,
  onDelegationCreated,
  isCreating,
}: DelegationManagerProps) {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { smartAccount } = useSmartAccount();
  const { addLog } = useLogger();
  const [delegateAddress, setDelegateAddress] = useState<Address | null>(null);
  const [isLoadingDelegate, setIsLoadingDelegate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingDelegation, setIsCreatingDelegation] = useState(false);

  useEffect(() => {
    if (delegateAddress || !smartAccountAddress) {
      return;
    }

    const fetchDelegateInfo = async () => {
      setIsLoadingDelegate(true);
      setError(null);
      try {
        addLog("[INFO] Getting delegate account information...");
        const response = await fetch("/api/delegate/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userAddress: smartAccountAddress }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to get delegate info");
        }

        const { delegateAddress: address } = await response.json();
        setDelegateAddress(address as Address);
        addLog(`[INFO] Delegate account: ${address}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to get delegate info";
        setError(errorMsg);
        addLog(`[ERROR] ${errorMsg}`);
      } finally {
        setIsLoadingDelegate(false);
      }
    };

    fetchDelegateInfo();
  }, [smartAccountAddress, delegateAddress, addLog]);

  const handleCreateDelegation = async () => {
    if (!smartAccount || !delegateAddress || !walletClient || !smartAccountAddress) {
      setError("Missing required components for delegation creation");
      addLog("[ERROR] Prerequisites for delegation not met.");
      return;
    }

    setError(null);
    setIsCreatingDelegation(true);
    addLog("[ACTION] Creating delegation signature...");

    try {
      const { createStakingDelegation } = await import("@/lib/delegation");
      addLog("[INFO] Preparing delegation for staking operations...");
      const delegation = createStakingDelegation(smartAccount, delegateAddress);

      addLog("[ACTION] Please sign the delegation in your wallet...");
      const signature = await smartAccount.signDelegation({ delegation });

      const signedDelegation = { ...delegation, signature };

      addLog("[ACTION] Storing delegation securely on the server...");
      const storeResponse = await fetch("/api/delegation/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signedDelegation),
      });

      if (!storeResponse.ok) {
        const errorText = await storeResponse.text();
        throw new Error(`Failed to store delegation: ${errorText}`);
      }

      addLog("[SUCCESS] Delegation created and stored securely!");
      addLog("[INFO] You can now perform one-click staking/unstaking operations");
      onDelegationCreated(signedDelegation);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create delegation";
      setError(errorMsg);
      addLog(`[ERROR] Delegation creation failed: ${errorMsg}`);

      if (errorMsg.includes("User denied")) {
        addLog("[INFO] Delegation signature was cancelled by user");
      }
    } finally {
      setIsCreatingDelegation(false);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <div className="text-center p-4">
          <LinkIcon className="h-12 w-12 mx-auto text-yellow-400 mb-4" />
          <h3 className="text-xl font-semibold text-yellow-300">
            Connect Wallet Required
          </h3>
          <p className="text-gray-400 mt-2">
            Please connect your wallet to set up delegation.
          </p>
        </div>
      </Card>
    );
  }

  if (isLoadingDelegate) {
    return (
      <Card>
        <div className="text-center p-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="mx-auto"
          >
            <LockClosedIcon className="h-12 w-12 mx-auto text-blue-400 mb-4" />
          </motion.div>
          <h3 className="text-xl font-semibold text-blue-300">
            Initializing Delegation
          </h3>
          <p className="text-gray-400 mt-2">Fetching secure delegate information...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg bg-slate-800 ring-2 ring-purple-500/30">
            <LockClosedIcon className="h-7 w-7 text-purple-300" />
        </div>
        <div>
            <h3 className="text-xl font-semibold text-white">
            Setup Secure Delegation
            </h3>
            <p className="text-sm text-gray-400">Enable one-click and automated actions.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
        <div className="space-y-4">
          <div className="bg-black/20 rounded-lg p-3 border border-white/10">
            <label className="text-xs text-gray-400 block uppercase font-medium">Your Smart Account</label>
            <div className="font-mono text-sm text-green-400 break-all mt-1">
              {smartAccountAddress}
            </div>
          </div>
          {delegateAddress && (
            <div className="bg-black/20 rounded-lg p-3 border border-white/10">
              <label className="text-xs text-gray-400 block uppercase font-medium">Delegate Account</label>
              <div className="font-mono text-sm text-blue-400 break-all mt-1">
                {delegateAddress}
              </div>
            </div>
          )}
        </div>

        {/* Explanation Panel */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-white/10">
          <h4 className="font-semibold mb-3 text-white flex items-center gap-2">
            <InformationCircleIcon className="h-5 w-5 text-cyan-400" />
            What is Delegation?
          </h4>
          <p className="text-sm text-gray-400">
            You are signing a message that grants our secure backend wallet (the Delegate) permission to perform specific actions on your Smart Account&apos;s behalf. Your keys never leave your wallet.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-medium">Error Creating Delegation</p>
              <p className="text-red-400 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Create Delegation Button */}
        <div className="pt-4 border-t border-white/10">
          <motion.button
            onClick={handleCreateDelegation}
            disabled={isCreating || isCreatingDelegation || !delegateAddress || !smartAccount}
            className="group relative w-full bg-gradient-to-r from-blue-700 via-purple-600 to-teal-700 font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center overflow-hidden text-white shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 flex items-center justify-center">
              {(isCreating || isCreatingDelegation) ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                  />
                  Creating Delegation...
                </>
              ) : (
                <>
                  <LockClosedIcon className="h-5 w-5 mr-2" />
                  Create Staking Delegation
                </>
              )}
            </span>
          </motion.button>
          <p className="text-center text-xs text-gray-500 mt-3">
            You will be prompted to sign a message in your wallet.
          </p>
        </div>
      </div>
    </Card>
  );
}
