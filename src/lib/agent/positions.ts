// src/lib/agent/positions.ts
import { Address, formatUnits, parseUnits } from 'viem';
import { publicClient } from '@/lib/viemClients';
import { CONTRACTS } from './config';
import { kintsuStakedMonadAbi, magmaStakeManagerAbi, gMonTokenAbi } from '@/lib/abis';

export interface Position {
  protocol: 'Kintsu' | 'Magma';
  balance: bigint;
  balanceFormatted: string;
  valueInMON: bigint;
  valueInMONFormatted: string;
  shares?: bigint; // For Kintsu
}

export interface UserPositions {
  kintsu: Position;
  magma: Position;
  totalValueMON: bigint;
  totalValueMONFormatted: string;
}

export async function getCurrentPositions(userAddress: Address): Promise<UserPositions> {
  try {
    const kintsuShares = await getKintsuPosition(userAddress);
    const magmaBalance = await getMagmaPosition(userAddress);
    const totalValueMON = kintsuShares.valueInMON + magmaBalance.valueInMON;

    return {
      kintsu: kintsuShares,
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
      publicClient.readContract({
        address: CONTRACTS.KINTSU_STAKED_MONAD,
        abi: kintsuStakedMonadAbi,
        functionName: 'balanceOf',
        args: [userAddress]
      }) as Promise<bigint>,
      publicClient.readContract({
        address: CONTRACTS.KINTSU_STAKED_MONAD,
        abi: kintsuStakedMonadAbi,
        functionName: 'totalSupply'
      }) as Promise<bigint>
    ]);

    let valueInMON: bigint;
    try {
      valueInMON = await publicClient.readContract({
        address: CONTRACTS.KINTSU_STAKED_MONAD,
        abi: kintsuStakedMonadAbi,
        functionName: 'convertToAssets',
        args: [shares]
      }) as bigint;
    } catch {
      valueInMON = shares; // Fallback to 1:1 conversion
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

export async function hasMinimumBalance(userAddress: Address, protocol: 'Kintsu' | 'Magma'): Promise<boolean> {
  try {
    const positions = await getCurrentPositions(userAddress);
    const minBalance = parseUnits("0.01", 18);
    
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

export async function getProtocolAPY(protocol: 'Kintsu' | 'Magma'): Promise<number> {
  try {
    if (protocol === 'Kintsu') {
      return 5.2; // 5.2% APY placeholder
    } else {
      return 4.8; // 4.8% APY placeholder
    }
  } catch (error) {
    console.warn(`Error getting ${protocol} APY:`, error);
    return 0;
  }
}
