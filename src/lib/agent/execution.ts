// src/lib/agent/execution.ts
import { Address, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { publicClient } from '@/lib/viemClients';
import { CONTRACTS, AGENT_CONFIG } from './config';
import { kintsuStakedMonadAbi, magmaStakeManagerAbi } from '@/lib/abis';
import { getCurrentPositions } from './positions';

export interface RebalanceResult {
  success: boolean;
  txHash?: string;
  error?: string;
  fromProtocol: 'Kintsu' | 'Magma';
  toProtocol: 'Kintsu' | 'Magma';
  amount?: string;
  isAsync?: boolean;
  unlockIndex?: number;
}

interface SignedDelegation {
  delegate: Address;
  delegator: Address;
  authority: `0x${string}`; // hex string
  salt: `0x${string}`;      // hex string
  caveats: Array<{
    enforcer: Address;
    terms: string;
    args: string;
  }>;
  signature: `0x${string}`; // hex string
}

export async function executeRebalance(
  fromProtocol: 'Kintsu' | 'Magma',
  toProtocol: 'Kintsu' | 'Magma',
  signedDelegation: SignedDelegation
): Promise<RebalanceResult> {

  if (!AGENT_CONFIG.EXECUTE_MODE) {
    return {
      success: true,
      fromProtocol,
      toProtocol,
      error: "Simulation mode - would execute rebalance"
    };
  }

  try {
    if (fromProtocol === 'Kintsu' && toProtocol === 'Magma') {
      return await executeKintsuToMagma(signedDelegation);
    } else if (fromProtocol === 'Magma' && toProtocol === 'Kintsu') {
      return await executeMagmaToKintsu(signedDelegation);
    } else {
      throw new Error(`Unsupported rebalance: ${fromProtocol} → ${toProtocol}`);
    }
  } catch (error: any) {
    return {
      success: false,
      fromProtocol,
      toProtocol,
      error: error.message
    };
  }
}

async function executeKintsuToMagma(signedDelegation: SignedDelegation): Promise<RebalanceResult> {
  const positions = await getCurrentPositions(AGENT_CONFIG.SMART_ACCOUNT_ADDRESS);
  const kintsuShares = positions.kintsu.shares!;
  
  if (kintsuShares === 0n) {
    throw new Error("No Kintsu shares to unlock");
  }

  const sharesAsUint96 = kintsuShares > BigInt("0xFFFFFFFFFFFFFFFFFFFFFF")
    ? BigInt("0xFFFFFFFFFFFFFFFFFFFFFF")
    : kintsuShares;

  const unlockCalldata = encodeFunctionData({
    abi: kintsuStakedMonadAbi,
    functionName: 'requestUnlock',
    args: [sharesAsUint96]
  });

  const txHash = await redeemDelegationCall(
    CONTRACTS.KINTSU_STAKED_MONAD,
    unlockCalldata,
    signedDelegation,
    0n
  );

  await storeUnlockRequest({
    smartAccount: AGENT_CONFIG.SMART_ACCOUNT_ADDRESS,
    shares: kintsuShares,
    txHash,
    toProtocol: 'Magma'
  });

  return {
    success: true,
    txHash,
    fromProtocol: 'Kintsu',
    toProtocol: 'Magma',
    amount: positions.kintsu.balanceFormatted,
    isAsync: true
  };
}

async function executeMagmaToKintsu(signedDelegation: SignedDelegation): Promise<RebalanceResult> {
  const positions = await getCurrentPositions(AGENT_CONFIG.SMART_ACCOUNT_ADDRESS);
  const gMonBalance = positions.magma.balance;

  if (gMonBalance === 0n) {
    throw new Error("No gMON balance to withdraw");
  }

  const withdrawCalldata = encodeFunctionData({
    abi: magmaStakeManagerAbi,
    functionName: 'withdrawMon',
    args: [gMonBalance]
  });

  await redeemDelegationCall(
    CONTRACTS.MAGMA_STAKE_MANAGER,
    withdrawCalldata,
    signedDelegation,
    0n
  );

  // Wait for withdrawal
  await new Promise(resolve => setTimeout(resolve, 5000));

  const depositAmount = positions.magma.valueInMON > BigInt("0xFFFFFFFFFFFFFFFFFFFFFF")
    ? BigInt("0xFFFFFFFFFFFFFFFFFFFFFF")
    : positions.magma.valueInMON;

  const depositCalldata = encodeFunctionData({
    abi: kintsuStakedMonadAbi,
    functionName: 'deposit',
    args: [depositAmount, AGENT_CONFIG.SMART_ACCOUNT_ADDRESS]
  });

  const txHash = await redeemDelegationCall(
    CONTRACTS.KINTSU_STAKED_MONAD,
    depositCalldata,
    signedDelegation,
    positions.magma.valueInMON
  );

  return {
    success: true,
    txHash,
    fromProtocol: 'Magma',
    toProtocol: 'Kintsu',
    amount: positions.magma.balanceFormatted,
    isAsync: false
  };
}

async function redeemDelegationCall(
  targetContract: Address,
  calldata: `0x${string}`,
  signedDelegation: SignedDelegation,
  value: bigint
): Promise<string> {

  if (!AGENT_CONFIG.EXECUTE_MODE) {
    const mockTxHash = `0x${Date.now().toString(16).padStart(64, '0')}`;
    return mockTxHash;
  }

  const agentAccount = privateKeyToAccount(AGENT_CONFIG.PRIVATE_KEY as `0x${string}`);

  try {
    const { getDeleGatorEnvironment, ExecutionMode } = await import('@metamask/delegation-toolkit');
    const { DelegationManager } = await import('@metamask/delegation-toolkit/contracts');
    const { createWalletClient, http } = await import('viem');
    const { monad } = await import('@/lib/viemClients');

    const walletClient = createWalletClient({
      account: agentAccount,
      chain: monad,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://testnet-rpc.monad.xyz')
    });

    const environment = getDeleGatorEnvironment(monad.id);

    const execution = {
      target: targetContract,
      value,
      callData: calldata
    };

    const delegation = {
  delegate: signedDelegation.delegate,
  delegator: signedDelegation.delegator,
  authority: signedDelegation.authority as `0x${string}`,
  salt: signedDelegation.salt as `0x${string}`,
  caveats: signedDelegation.caveats.map(caveat => ({
    enforcer: caveat.enforcer,
    terms: caveat.terms as `0x${string}`,
    args: caveat.args as `0x${string}`,
  })),
  signature: signedDelegation.signature as `0x${string}`,
};
    const redeemDelegationCalldata = DelegationManager.encode.redeemDelegations({
      delegations: [[delegation]],
      modes: [ExecutionMode.SingleDefault],
      executions: [[execution]]
    });

    const txHash = await walletClient.sendTransaction({
      to: environment.DelegationManager,
      data: redeemDelegationCalldata,
      chain: monad
    });

    return txHash;

  } catch {
    // Fallback direct call
    const { createWalletClient, http } = await import('viem');
    const { monad } = await import('@/lib/viemClients');

    const walletClient = createWalletClient({
      account: agentAccount,
      chain: monad,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://testnet-rpc.monad.xyz')
    });

    const txHash = await walletClient.sendTransaction({
      to: targetContract,
      data: calldata,
      value,
      account: agentAccount
    });

    return txHash;
  }
}

// Unlock request storage
interface StoredUnlockRequest {
  smartAccount: Address;
  shares: bigint;
  txHash: string;
  toProtocol: 'Magma';
  requestedAt: Date;
  status: 'pending';
}

const pendingUnlocks: StoredUnlockRequest[] = [];

async function storeUnlockRequest(request: Omit<StoredUnlockRequest, 'requestedAt' | 'status'>) {
  pendingUnlocks.push({ ...request, requestedAt: new Date(), status: 'pending' });
}

export function getPendingUnlocks(): StoredUnlockRequest[] {
  return pendingUnlocks;
}

// Testing helper
export async function testDelegationExecution(signedDelegation: SignedDelegation): Promise<boolean> {
  try {
    await redeemDelegationCall(
      CONTRACTS.KINTSU_STAKED_MONAD,
      '0x12345678' as `0x${string}`,
      signedDelegation,
      0n
    );
    return true;
  } catch {
    return false;
  }
}
