"use client";
import { useState, useEffect } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { toMetaMaskSmartAccount, Implementation } from "@metamask/delegation-toolkit";
import type { Address, WalletClient } from "viem";
import type { MetaMaskSmartAccount } from "@metamask/delegation-toolkit";
import { monadTestnet } from "@/lib/smartAccountClient";

export function useSmartAccount() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient, isLoading: isWalletLoading } = useWalletClient();
  
  const [smartAccount, setSmartAccount] = useState<MetaMaskSmartAccount | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Reset state when wallet disconnects
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
      // Reset state
      setSmartAccount(null);
      setSmartAccountAddress(null);
      setError(null);
      setIsReady(false);
      
      // Check prerequisites
      if (!isConnected || !address || !walletClient || !publicClient || isWalletLoading) {
        return;
      }

      if (!walletClient.account) {
        setError("Wallet client account not available");
        return;
      }

      setIsLoading(true);
      
      try {
        console.log("Creating smart account for address:", address);
        
        // Create signer object
        const signer: { walletClient: WalletClient } = {
          walletClient: walletClient as WalletClient
        };

        // Create MetaMask Smart Account
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

        console.log("Smart account created:", account.address);
        
        setSmartAccount(account);
        setSmartAccountAddress(account.address);
        setIsReady(true);
        
      } catch (err) {
        console.error("Failed to create smart account:", err);
        
        // Provide more specific error messages
        let errorMessage = "Unknown error occurred";
        if (err instanceof Error) {
          if (err.message.includes('network')) {
            errorMessage = "Network connection error. Please check your RPC connection.";
          } else if (err.message.includes('chain')) {
            errorMessage = "Chain configuration error. Please ensure you're connected to Monad testnet.";
          } else if (err.message.includes('account')) {
            errorMessage = "Account creation failed. Please try reconnecting your wallet.";
          } else {
            errorMessage = err.message;
          }
        }
        
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    createSmartAccount();
  }, [address, walletClient, publicClient, isWalletLoading, isConnected]);

  // Manual setter for ready state (used by SmartAccountManager)
  const setSmartAccountReady = (ready: boolean) => {
    setIsReady(ready);
  };

  // Helper function to check if smart account is deployed
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
    checkDeploymentStatus
  };
}