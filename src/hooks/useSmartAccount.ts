// src/hooks/useSmartAccount.ts
"use client";
import { useState, useEffect, useCallback } from "react"; // useCallback added
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { toMetaMaskSmartAccount, Implementation } from "@metamask/delegation-toolkit";
import type { Address, WalletClient } from "viem";
import type { MetaMaskSmartAccount } from "@metamask/delegation-toolkit";

export function useSmartAccount() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient, isLoading: isWalletLoading } = useWalletClient();

  const [smartAccount, setSmartAccount] = useState<MetaMaskSmartAccount | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  // Add a key to force re-rendering/re-creating the account object
  const [refreshKey, setRefreshKey] = useState(0);

  // Function to trigger a refresh
  const refreshAccount = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!isConnected) {
      setSmartAccount(null);
      setSmartAccountAddress(null);
      setError(null);
      setIsReady(false);
    }
  }, [isConnected]);

  useEffect(() => {
    async function createSmartAccount() {
      setSmartAccount(null);
      setSmartAccountAddress(null);
      setError(null);
      setIsReady(false);
      
      if (!isConnected || !address || !walletClient || !publicClient || isWalletLoading) {
        return;
      }

      if (!walletClient.account) {
        setError("Wallet client account not available");
        return;
      }

      setIsLoading(true);
      
      try {
        console.log("Creating/re-fetching smart account for address:", address);
        
        const signer: { walletClient: WalletClient } = {
          walletClient: walletClient as WalletClient
        };

        const account = await toMetaMaskSmartAccount({
          client: publicClient,
          implementation: Implementation.Hybrid,
          deployParams: [
            address as Address, 
            [] as string[], 
            [] as bigint[], 
            [] as bigint[]
          ],
          deploySalt: (process.env.NEXT_PUBLIC_SMART_ACCOUNT_SALT || "0x0000000000000000000000000000000000000000000000000000000000000000") as Address,
          signer: signer,
        } as any);

        console.log("Smart account instance ready:", account.address);
        
        setSmartAccount(account);
        setSmartAccountAddress(account.address);
        setIsReady(true);
        
      } catch (err) {
        let errorMessage = "Unknown error occurred";
        if (err instanceof Error) {
            errorMessage = err.message;
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    createSmartAccount();
  // Add refreshKey to the dependency array
  }, [address, walletClient, publicClient, isWalletLoading, isConnected, refreshKey]);

  const setSmartAccountReady = (ready: boolean) => {
    setIsReady(ready);
  };

  const checkDeploymentStatus = async (): Promise<boolean> => {
    if (!smartAccount || !publicClient) return false;
    
    try {
      return await smartAccount.isDeployed();
    } catch (error) {
      console.error("Failed to check deployment status:", error);
      return false;
    }
  };

  return { 
    smartAccount, 
    smartAccountAddress,
    isLoading, 
    error,
    isReady,
    isConnected,
    setSmartAccountReady,
    checkDeploymentStatus,
    refreshAccount, // Expose the refresh function
  };
}