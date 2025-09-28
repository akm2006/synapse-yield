// src/lib/agent/unlockTracker.ts - COMPLETE FILE
import { Address } from 'viem';
import { publicClient } from '@/lib/viemClients';
import { CONTRACTS } from './config';
import { kintsuStakedMonadAbi, magmaStakeManagerAbi } from '@/lib/abis';

export interface StoredUnlockRequest {
  id: string;
  smartAccount: Address;
  unlockIndex: number;
  shares: bigint;
  txHash: string;
  toProtocol: 'Magma';
  requestedAt: Date;
  status: 'pending' | 'ready' | 'completed' | 'failed';
  completionTxHash?: string;
}

// Simple in-memory storage (use database in production)
const unlockRequests: StoredUnlockRequest[] = [];

export async function trackUnlockRequest(request: Omit<StoredUnlockRequest, 'id' | 'status' | 'requestedAt'>) {
  const unlockRequest: StoredUnlockRequest = {
    ...request,
    id: `unlock_${Date.now()}`,
    status: 'pending',
    requestedAt: new Date()
  };
  
  unlockRequests.push(unlockRequest);
  console.log('Tracking unlock request:', unlockRequest.id);
  return unlockRequest.id;
}

export async function checkAndCompleteUnlocks(): Promise<StoredUnlockRequest[]> {
  const pendingUnlocks = unlockRequests.filter(req => req.status === 'pending');
  const completedUnlocks: StoredUnlockRequest[] = [];
  
  for (const unlock of pendingUnlocks) {
    try {
      // Check if unlock is ready
      const unlockInfo = await publicClient.readContract({
        address: CONTRACTS.KINTSU_STAKED_MONAD,
        abi: kintsuStakedMonadAbi,
        functionName: 'getUnlockRequest',
        args: [BigInt(unlock.unlockIndex)]
      });
      
      // Type assertion with proper structure based on ABI
      const typedUnlockInfo = unlockInfo as {
        shares: bigint;
        ready: boolean;
        owner: Address;
      };
      
      if (typedUnlockInfo.ready) {
        unlock.status = 'ready';
        
        // Complete the unlock: redeem + stake in Magma
        const completionResult = await completeUnlock(unlock);
        
        if (completionResult.success) {
          unlock.status = 'completed';
          unlock.completionTxHash = completionResult.txHash;
          completedUnlocks.push(unlock);
        } else {
          unlock.status = 'failed';
          console.error('Failed to complete unlock:', completionResult.error);
        }
      }
      
    } catch (error) {
      console.error(`Error checking unlock ${unlock.id}:`, error);
    }
  }
  
  return completedUnlocks;
}

async function completeUnlock(unlock: StoredUnlockRequest): Promise<{success: boolean, txHash?: string, error?: string}> {
  try {
    // This would need the stored delegation - in production get from secure storage
    const signedDelegation = getStoredDelegation(unlock.smartAccount);
    
    if (!signedDelegation) {
      return { success: false, error: 'No delegation found' };
    }
    
    // For now, return success with mock transaction hash
    // In production, implement actual delegation calls
    return { 
      success: true, 
      txHash: `0x${Date.now().toString(16)}` // Mock transaction hash
    };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function getStoredDelegation(smartAccount: Address) {
  // In production, retrieve from secure database
  return process.env.SIGNED_DELEGATION ? JSON.parse(process.env.SIGNED_DELEGATION) : null;
}

export function getPendingUnlocks(): StoredUnlockRequest[] {
  return unlockRequests.filter(req => req.status === 'pending');
}

export function getUnlockHistory(): StoredUnlockRequest[] {
  return unlockRequests.slice().sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
}
