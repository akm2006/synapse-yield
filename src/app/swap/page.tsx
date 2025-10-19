// src/app/swap/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useBalances } from '@/providers/BalanceProvider';
import { useLogger } from '@/providers/LoggerProvider';
import { useToasts } from '@/providers/ToastProvider';
import SwapInterface from '@/components/SwapInterface';
import { useAuth } from '@/providers/AuthProvider';
import {
  ShieldExclamationIcon,
  KeyIcon, 
  LockClosedIcon, 
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import Card from '@/components/common/Card'; // Import Card


const GatedState = ({
  icon,
  title,
  description,
  buttonText,
  buttonLink,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}) => (
  <div className="fixed inset-0 flex items-center justify-center z-50">
    <div className="relative w-full max-w-md mx-auto px-6">
      <Card className="backdrop-blur-md bg-slate-900/60 border border-white/10 text-center shadow-2xl">
        <div className="p-8 flex flex-col items-center">
          <div className="mb-4">{icon}</div>
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-gray-400 mb-8">{description}</p>
          <Link
            href={buttonLink}
            className="group relative inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all duration-300 overflow-hidden"
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 flex items-center gap-2">
              {buttonText}
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </Card>
    </div>
  </div>
);


// --- Main Swap Page Component ---
export default function SwapPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { smartAccountAddress } = useSmartAccount();
  // Fetch balances using the BalanceProvider hook
  const { balances, fetchBalances } = useBalances();
  const { addLog } = useLogger();
  const { addToast } = useToasts(); // Keep addToast if SwapInterface uses it

  const [hasDelegation, setHasDelegation] = useState(false);
  const [checkingDelegation, setCheckingDelegation] = useState(true);

  // Check delegation status - still required for swapping via delegation
  useEffect(() => {
    if (isAuthenticated && smartAccountAddress) {
      setCheckingDelegation(true);
      fetch('/api/delegation/status')
        .then((res) => res.json())
        .then((data) => {
          setHasDelegation(data.hasDelegation);
           if (data.hasDelegation) {
             addLog("[INFO] Verified existing delegation for swaps.");
           } else {
             addLog("[WARN] Delegation not found. Swaps will be disabled.");
           }
        })
        .catch((err) => {
             console.error('Failed to check delegation status:', err);
             addLog(`[ERROR] Failed checking delegation: ${err.message}`);
             setHasDelegation(false); // Assume no delegation on error
        })
        .finally(() => setCheckingDelegation(false));
    } else {
      setHasDelegation(false); // Reset if not authenticated or no SA address
      setCheckingDelegation(false);
    }
  }, [isAuthenticated, smartAccountAddress, addLog]);

  // Loading States
 if (isAuthLoading || (isAuthenticated && !smartAccountAddress && checkingDelegation)) {
    return (
           <div className="min-h-screen flex items-center justify-center text-center">
               <div>
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
               <p className="mt-4 text-gray-400">Loading Swap Interface...</p>
               </div>
           </div>
   );
 }

  // Gated States
  if (!isAuthenticated) {
    return (
      <GatedState
        icon={<ShieldExclamationIcon className="h-12 w-12 mx-auto text-yellow-400" />}
        title="Authentication Required"
        description="Please sign in to access token swapping."
        buttonText="Sign In on Dashboard"
        buttonLink="/dashboard"
      />
    );
  }

  if (!smartAccountAddress) {
    return (
      <GatedState
        icon={<LockClosedIcon className="h-12 w-12 mx-auto text-purple-400" />}
        title="Smart Account Required"
        description="Create a smart account on the dashboard before swapping."
        buttonText="Go to Dashboard"
        buttonLink="/dashboard"
      />
    );
  }

  if (checkingDelegation) {
     // Show loading specifically for delegation check after SA is confirmed
     return (
            <div className="min-h-screen flex items-center justify-center text-center">
                <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
                <p className="mt-4 text-gray-400">Checking Delegation Status...</p>
                </div>
            </div>
     );
  }

  if (!hasDelegation) {
    return (
      <GatedState
        icon={<KeyIcon className="h-12 w-12 mx-auto text-purple-400" />}
        title="Delegation Required"
        description="One-click swaps require delegation. Please set it up on the dashboard."
        buttonText="Setup Delegation"
        buttonLink="/dashboard"
      />
    );
  }

  // --- Main Render ---
  return (
  
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex justify-center"> {/* Centering content */}
    

        <div className="w-full max-w-lg">
              <SwapInterface
                smartAccountAddress={smartAccountAddress}
                balances={balances}
                disabled={!hasDelegation || !smartAccountAddress}
                onBalanceRefresh={() => fetchBalances(false)}
              />
          
        </div>
      </main>
  );
}