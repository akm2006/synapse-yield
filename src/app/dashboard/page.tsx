"use client";

import { useState, useEffect } from "react";
import type { Address } from "viem";
import { useAuth } from "@/providers/AuthProvider";
import { useSmartAccount } from "@/hooks/useSmartAccount";
import { useLogger } from "@/providers/LoggerProvider";
import { useBalances } from "@/providers/BalanceProvider";
import { motion } from "framer-motion"; // motion is imported but not used, can be removed if you wish

// Import the new and refactored components
import SmartAccountManager from "@/components/SmartAccountManager";
import DelegationManager from "@/components/DelegationManager";
import AutomationManager from "@/components/AutomationManager";
import PortfolioSummary from "@/components/modules/dashboard/PortfolioSummary";
import AccountStatusPanel from "@/components/modules/dashboard/AccountStatusPanel";

import { WalletIcon, CogIcon } from "@heroicons/react/24/outline";

export default function Dashboard() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  // Note: The original file uses `setSmartAccountReady` from the hook
  // Ensure your `useSmartAccount` hook still exports this
  const { smartAccountAddress, setSmartAccountReady } = useSmartAccount();
  const { balances } = useBalances();
  const { addLog } = useLogger();

  const [hasDelegation, setHasDelegation] = useState(false);
  const [checkingDelegation, setCheckingDelegation] = useState(true);

  // This effect only checks for delegation status once the SA address is available
  useEffect(() => {
    if (isAuthenticated && smartAccountAddress) {
      setCheckingDelegation(true);
      fetch("/api/delegation/status")
        .then((res) => res.json())
        .then((data) => {
          setHasDelegation(data.hasDelegation);
          if (data.hasDelegation) {
            addLog("[INFO] Verified existing delegation.");
          }
        })
        .catch((err) => {
          console.error("Failed to check delegation status:", err);
          setHasDelegation(false);
        })
        .finally(() => setCheckingDelegation(false));
    } else {
      // Reset state if not authenticated or no SA address
      setHasDelegation(false);
      setCheckingDelegation(false);
    }
  }, [isAuthenticated, smartAccountAddress, addLog]);

  // Simple loading state for initial auth/session check
  if (
    isAuthLoading ||
    (isAuthenticated && !smartAccountAddress && checkingDelegation)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading Session...</p>
        </div>
      </div>
    );
  }

  // Gate for authentication
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center text-center p-4">
        <div className="max-w-md bg-slate-900/50 p-8 rounded-2xl border border-white/10 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-3">Please Log In</h2>
          <p className="text-gray-400">
            Sign in with your wallet to access your smart account dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Main dashboard render
  return (
    <div className="min-h-screen">
  
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* --- Left Column --- */}
          <div className="lg:col-span-1 space-y-8">
            {!smartAccountAddress ? (
              // Step 1: Create/Derive Smart Account
              <SmartAccountManager
                onSmartAccountReady={(address: Address) => {
                  if (setSmartAccountReady) setSmartAccountReady(true);
                }}
              />
            ) : !hasDelegation ? (
              // Step 2: Create Delegation
              <DelegationManager
                smartAccountAddress={smartAccountAddress}
                onDelegationCreated={() => setHasDelegation(true)}
                isCreating={false}
              />
            ) : (
              // Step 3: Show Account Status and Automation Manager
              <>
                <AccountStatusPanel
                  smartAccountAddress={smartAccountAddress}
                  hasDelegation={hasDelegation}
                  // Add these if you re-introduce deployment checks later:
                  // isDeployed={isDeployed}
                  // checkingDeployment={checkingDeployment}
                />
                {/* *** MOVED AutomationManager HERE *** */}
                <AutomationManager hasDelegation={hasDelegation} />
              </>
            )}
          </div>

          {/* Right Column: Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {smartAccountAddress ? (
              // Show portfolio *as soon as* SA is available
              <>
                <PortfolioSummary balances={balances} />
              </>
            ) : (
              // Placeholder if no SA address
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
                <WalletIcon className="h-12 w-12 text-blue-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Create Your Smart Account
                </h3>
                <p className="text-gray-400 max-w-xs">
                  Follow the steps on the left to activate your Synapse Yield
                  account.
                </p>
              </div>
            )}
            {/* Placeholder if SA address exists but delegation is not done */}
            {smartAccountAddress && !hasDelegation && (
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
                <CogIcon className="h-12 w-12 text-purple-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Setup Delegation
                </h3>
                <p className="text-gray-400 max-w-xs">
                  Complete delegation to unlock your portfolio and automated
                  features.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
