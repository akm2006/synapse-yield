"use client";
import { useState, useCallback } from "react";
import { MetaMaskSmartAccount, Delegation } from "@metamask/delegation-toolkit";
import { Address } from "viem";
import { createStakingDelegation, saveDelegation, loadDelegation } from "@/utils/delegation";

export function useDelegation(smartAccountAddress?: Address) {
  const [delegation, setDelegation] = useState<Delegation | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDelegation = useCallback(async (
    delegator: MetaMaskSmartAccount,
    delegate: Address,
    maxAmount?: bigint
  ) => {
    if (!smartAccountAddress) {
      setError("Smart account address not available");
      return null;
    }

    setIsCreating(true);
    setError(null);

    try {
      const newDelegation = createStakingDelegation(delegator, delegate, maxAmount);
      
      const signature = await delegator.signDelegation({ delegation: newDelegation });
      
      const signedDelegation = { ...newDelegation, signature };
      
      saveDelegation(smartAccountAddress, signedDelegation);
      setDelegation(signedDelegation);
      
      return signedDelegation;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create delegation";
      setError(errorMsg);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [smartAccountAddress]);

  const loadExistingDelegation = useCallback(() => {
    if (!smartAccountAddress) return null;
    
    const loaded = loadDelegation(smartAccountAddress);
    setDelegation(loaded);
    return loaded;
  }, [smartAccountAddress]);

  return {
    delegation,
    isCreating,
    error,
    createDelegation,
    loadExistingDelegation,
  };
}
