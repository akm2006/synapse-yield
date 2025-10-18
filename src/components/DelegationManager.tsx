"use client";
import { useState, useEffect } from "react";
import { Address } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { useSmartAccount } from "@/hooks/useSmartAccount";
import type { Delegation } from "@metamask/delegation-toolkit";
import { useLogger } from '@/providers/LoggerProvider';

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
    // Only fetch if we don't already have the delegate address
    if (delegateAddress || !smartAccountAddress) {
      return;
    }

    const fetchDelegateInfo = async () => {
      setIsLoadingDelegate(true);
      setError(null);

      try {
        console.log("[INFO] Getting delegate account information...");

        const response = await fetch("/api/delegate/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userAddress: smartAccountAddress }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || "Failed to get delegate info");
          } catch {
            throw new Error(errorText || "Failed to get delegate info");
          }
        }

        const { delegateAddress: address } = await response.json();
        setDelegateAddress(address as Address);
        console.log(`[INFO] Delegate account: ${address}`);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to get delegate info";
        setError(errorMsg);
        console.error(`[ERROR] ${errorMsg}`);
      } finally {
        setIsLoadingDelegate(false);
      }
    };

    fetchDelegateInfo();
  }, [smartAccountAddress, delegateAddress]); // Removed addLog from dependencies

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
      const { createStakingDelegation } = await import("@/utils/delegation");
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
      const errorMsg =
        err instanceof Error ? err.message : "Failed to create delegation";
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
      <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="text-2xl mr-3">🔗</div>
          <h3 className="text-xl font-semibold text-yellow-400">
            Connect Wallet Required
          </h3>
        </div>
        <p className="text-gray-300 mb-4">
          Please connect your MetaMask wallet to set up delegation for automated staking operations.
        </p>
        <div className="bg-yellow-800/20 rounded p-3">
          <p className="text-sm text-yellow-200">
            💡 <strong>What you'll get:</strong> Secure, one-click staking without exposing your private keys
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingDelegate) {
    return (
      <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="text-2xl mr-3">⏳</div>
          <h3 className="text-xl font-semibold text-blue-400">
            Initializing Delegation System
          </h3>
        </div>
        <div className="space-y-3">
          <div className="animate-pulse">
            <div className="h-2 bg-blue-500/20 rounded mb-2"></div>
            <div className="h-2 bg-blue-500/10 rounded w-3/4"></div>
          </div>
          <p className="text-gray-300">Getting delegate account information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-purple-900/20 border border-purple-500/50 rounded-lg p-6 mb-6">
      <div className="flex items-center mb-4">
        <div className="text-2xl mr-3">🔐</div>
        <h3 className="text-xl font-semibold text-purple-400">
          Setup Delegation for Automated Staking
        </h3>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <label className="text-sm text-gray-400 block mb-1">Your Smart Account:</label>
            <div className="font-mono text-sm text-green-400 break-all">
              {smartAccountAddress}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              This account will be managed by delegation
            </div>
          </div>
          {delegateAddress && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <label className="text-sm text-gray-400 block mb-1">Delegate Account:</label>
              <div className="font-mono text-sm text-blue-400 break-all">
                {delegateAddress}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Backend account that will execute operations
              </div>
            </div>
          )}
        </div>

        {/* Explanation Panel */}
        <div className="bg-gradient-to-r from-purple-900/10 to-blue-900/10 rounded-lg p-5 border border-purple-500/20">
          <h4 className="font-semibold mb-3 text-purple-300 flex items-center">
            <span className="text-lg mr-2">ℹ️</span>
            What is Delegation?
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-purple-200 mb-2">Security Benefits:</h5>
              <ul className="text-sm text-gray-300 space-y-1">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  No private key exposure to browser
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  Secure, permission-based operations
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  Revoke permissions anytime
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-purple-200 mb-2">User Experience:</h5>
              <ul className="text-sm text-gray-300 space-y-1">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">⚡</span>
                  One-click staking/unstaking
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">⚡</span>
                  No gas fees from your wallet
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">⚡</span>
                  Automated transaction execution
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-red-400 text-lg mr-2">⚠️</span>
              <div>
                <p className="text-red-400 font-medium">Error Creating Delegation</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Create Delegation Button */}
        <div className="space-y-3">
          <button
            onClick={handleCreateDelegation}
            disabled={isCreating || isCreatingDelegation || !delegateAddress || !smartAccount}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition duration-200 flex items-center justify-center"
          >
            {(isCreating || isCreatingDelegation) ? (
              <>
                <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></span>
                Creating Delegation...
              </>
            ) : (
              <>
                <span className="text-lg mr-2">🔐</span>
                Create Staking Delegation
              </>
            )}
          </button>
          <div className="text-center space-y-1">
            <p className="text-xs text-gray-400">
              This will prompt you to sign a delegation in your connected wallet
            </p>
            <p className="text-xs text-gray-500">
              Once created, you'll be able to stake and unstake with a single click
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-green-900/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-green-400 text-lg mr-2">🔒</span>
            <div>
              <p className="text-green-300 font-medium text-sm">Secure by Design</p>
              <p className="text-green-200 text-xs mt-1">
                Your private keys never leave your wallet. Delegations only authorize specific staking operations and can be revoked at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}