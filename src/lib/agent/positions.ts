// src/lib/agent/positions.ts
import { Address, formatUnits, parseUnits } from 'viem';
import { publicClient } from '@/lib/viemClients';
import { CONTRACTS } from './config';
import { kintsuStakedMonadAbi, magmaStakeManagerAbi, gMonTokenAbi } from '@/lib/abis/index';

export interface Position {
  protocol: 'Kintsu' | 'Magma';
  balance: bigint;
  balanceFormatted: string;
  valueInMON: bigint;
  valueInMONFormatted: string;
  shares?: bigint; // For Kintsu
  unlockRequests?: UnlockRequest[]; // For Kintsu pending unlocks
}

export interface UnlockRequest {
  unlockIndex: number;
  shares: bigint;
  ready: boolean;
  valueInMON: bigint;
}

export interface UserPositions {
  kintsu: Position;
  magma: Position;
  totalValueMON: bigint;
  totalValueMONFormatted: string;
}

// Type for unlock request from contract
interface ContractUnlockRequest {
  unlockIndex: bigint;
  shares: bigint;
  claimed: boolean;
}

export async function getCurrentPositions(userAddress: Address): Promise<UserPositions> {
  try {
    // Get Kintsu position
    const [kintsuShares, kintsuUnlocks] = await Promise.all([
      getKintsuPosition(userAddress),
      getKintsuUnlockRequests(userAddress)
    ]);

    // Get Magma position  
    const magmaBalance = await getMagmaPosition(userAddress);

    // Calculate total value
    const totalValueMON = kintsuShares.valueInMON + magmaBalance.valueInMON;

    return {
      kintsu: { ...kintsuShares, unlockRequests: kintsuUnlocks },
      magma: magmaBalance,
      totalValueMON,
      totalValueMONFormatted: formatUnits(totalValueMON, 18)
    };

  } catch (error) {
    console.error('Error getting positions:', error);
    throw new Error(`Failed to fetch positions: ${error}`);
  }
}

async function getKintsuPosition(userAddress: Address): Promise<Position> {
  try {
    const [shares, totalSupply] = await Promise.all([
      // User's sMON balance (shares)
      publicClient.readContract({
        address: CONTRACTS.KINTSU_STAKED_MONAD,
        abi: kintsuStakedMonadAbi,
        functionName: 'balanceOf',
        args: [userAddress]
      }) as Promise<bigint>,
      // Total sMON supply  
      publicClient.readContract({
        address: CONTRACTS.KINTSU_STAKED_MONAD,
        abi: kintsuStakedMonadAbi,
        functionName: 'totalSupply'
      }) as Promise<bigint>
    ]);

    // Convert shares to MON value using convertToAssets if available, or 1:1 fallback
    let valueInMON: bigint;
    try {
      valueInMON = await publicClient.readContract({
        address: CONTRACTS.KINTSU_STAKED_MONAD,
        abi: kintsuStakedMonadAbi,
        functionName: 'convertToAssets',
        args: [shares]
      }) as bigint;
    } catch {
      // Fallback to 1:1 conversion if convertToAssets fails
      valueInMON = shares;
    }

    return {
      protocol: 'Kintsu',
      balance: shares,
      balanceFormatted: formatUnits(shares, 18),
      valueInMON,
      valueInMONFormatted: formatUnits(valueInMON, 18),
      shares
    };
  } catch (error) {
    console.warn('Error getting Kintsu position:', error);
    return {
      protocol: 'Kintsu',
      balance: 0n,
      balanceFormatted: '0',
      valueInMON: 0n,
      valueInMONFormatted: '0',
      shares: 0n
    };
  }
}

async function getMagmaPosition(userAddress: Address): Promise<Position> {
  try {
    const gMonBalance = await publicClient.readContract({
      address: CONTRACTS.MAGMA_GMON_TOKEN,
      abi: gMonTokenAbi,
      functionName: 'balanceOf', 
      args: [userAddress]
    }) as bigint;

    // For gMON, assume 1:1 with MON for now (or calculate exchange rate)
    // In production, you'd want to get the actual gMON price from the contract
    const valueInMON = gMonBalance; // Simplified - gMON appreciates vs MON over time

    return {
      protocol: 'Magma',
      balance: gMonBalance,
      balanceFormatted: formatUnits(gMonBalance, 18),
      valueInMON,
      valueInMONFormatted: formatUnits(valueInMON, 18)
    };
  } catch (error) {
    console.warn('Error getting Magma position:', error);
    return {
      protocol: 'Magma',
      balance: 0n,
      balanceFormatted: '0',
      valueInMON: 0n,
      valueInMONFormatted: '0'
    };
  }
}

async function getKintsuUnlockRequests(userAddress: Address): Promise<UnlockRequest[]> {
  try {
    const unlockRequests = await publicClient.readContract({
      address: CONTRACTS.KINTSU_STAKED_MONAD,
      abi: kintsuStakedMonadAbi,
      functionName: 'getUserUnlockRequests',
      args: [userAddress]
    }) as ContractUnlockRequest[];

    return unlockRequests.map((request: ContractUnlockRequest, index: number) => ({
      unlockIndex: Number(request.unlockIndex),
      shares: request.shares,
      ready: !request.claimed, // Simplified - you'd check batch status
      valueInMON: request.shares // Convert using exchange rate
    }));

  } catch (error) {
    console.warn('Could not fetch unlock requests:', error);
    return [];
  }
}

export async function hasMinimumBalance(userAddress: Address, protocol: 'Kintsu' | 'Magma'): Promise<boolean> {
  try {
    const positions = await getCurrentPositions(userAddress);
    const minBalance = parseUnits("0.01", 18); // 0.01 MON minimum
    
    if (protocol === 'Kintsu') {
      return positions.kintsu.valueInMON >= minBalance;
    } else {
      return positions.magma.valueInMON >= minBalance;
    }
  } catch (error) {
    console.error('Error checking minimum balance:', error);
    return false;
  }
}

export async function getTotalBalance(userAddress: Address): Promise<bigint> {
  try {
    const positions = await getCurrentPositions(userAddress);
    return positions.totalValueMON;
  } catch (error) {
    console.error('Error getting total balance:', error);
    return 0n;
  }
}

// Helper function to get protocol APY (placeholder)
export async function getProtocolAPY(protocol: 'Kintsu' | 'Magma'): Promise<number> {
  try {
    if (protocol === 'Kintsu') {
      // Get Kintsu exchange rate change over time
      // This is a placeholder - implement actual APY calculation
      return 5.2; // 5.2% APY
    } else {
      // Get Magma staking rewards rate
      // This is a placeholder - implement actual APY calculation  
      return 4.8; // 4.8% APY
    }
  } catch (error) {
    console.warn(`Error getting ${protocol} APY:`, error);
    return 0;
  }
}
