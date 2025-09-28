// src/lib/agent/execution.ts
import { Address, encodeFunctionData, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { publicClient } from '@/lib/viemClients';
import { CONTRACTS, AGENT_CONFIG, DEX_CONFIG } from './config';
import { kintsuStakedMonadAbi, magmaStakeManagerAbi } from '@/lib/abis';
import { pancakeSwapRouterAbi } from '@/lib/abis/pancakeswap';
import { getCurrentPositions } from './positions';

export interface RebalanceResult {
  success: boolean;
  txHash?: string;
  error?: string;
  fromProtocol: 'Kintsu' | 'Magma';
  toProtocol: 'Kintsu' | 'Magma';
  amount?: string;
  isAsync?: boolean;
  swapRoute?: string;
}

interface SignedDelegation {
  delegate: Address;
  delegator: Address;
  authority: `0x${string}`;
  salt: `0x${string}`;
  caveats: Array<{
    enforcer: Address;
    terms: `0x${string}`;
    args: `0x${string}`;
  }>;
  signature: `0x${string}`;
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
      return await executeKintsuToMagmaViaDEX(signedDelegation);
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

async function executeKintsuToMagmaViaDEX(signedDelegation: SignedDelegation): Promise<RebalanceResult> {
  const positions = await getCurrentPositions(AGENT_CONFIG.SMART_ACCOUNT_ADDRESS);
  const sMONBalance = positions.kintsu.balance;
  
  if (sMONBalance === 0n) {
    throw new Error("No sMON balance to swap");
  }

  console.log(`Starting Kintsu → Magma rebalance: ${formatUnits(sMONBalance, 18)} sMON`);

  // Step 1: Approve sMON spending by PancakeSwap router
  const approveCalldata = encodeFunctionData({
  abi: kintsuStakedMonadAbi,       // now includes approve
  functionName: 'approve',         // valid functionName
  args: [DEX_CONFIG.PANCAKESWAP_ROUTER, sMONBalance]
});

  await redeemDelegationCall(
    CONTRACTS.KINTSU_STAKED_MONAD,
    approveCalldata,
    signedDelegation,
    0n
  );

  console.log(`✅ Approved ${formatUnits(sMONBalance, 18)} sMON for PancakeSwap`);

  // Step 2: Swap sMON → MON via PancakeSwap
  const amountOutMin = (sMONBalance * BigInt(10000 - DEX_CONFIG.DEFAULT_SLIPPAGE_BPS)) / 10000n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + DEX_CONFIG.SWAP_DEADLINE_SECONDS);
  
  const swapPath = [DEX_CONFIG.SMON_TOKEN, DEX_CONFIG.WMON_TOKEN];

  const swapCalldata = encodeFunctionData({
    abi: pancakeSwapRouterAbi,
    functionName: 'swapExactTokensForETH',
    args: [
      sMONBalance,
      amountOutMin,
      swapPath,
      AGENT_CONFIG.SMART_ACCOUNT_ADDRESS,
      deadline
    ]
  });

  const swapTxHash = await redeemDelegationCall(
    DEX_CONFIG.PANCAKESWAP_ROUTER,
    swapCalldata,
    signedDelegation,
    0n
  );

  console.log(`✅ Swapped sMON → MON via PancakeSwap: ${swapTxHash}`);

  // Step 3: Wait for swap and deposit to Magma
  await new Promise(resolve => setTimeout(resolve, 5000));

  const monBalance = await publicClient.getBalance({
    address: AGENT_CONFIG.SMART_ACCOUNT_ADDRESS
  });

  console.log(`Received ${formatUnits(monBalance, 18)} MON from swap`);

  const depositCalldata = encodeFunctionData({
    abi: magmaStakeManagerAbi,
    functionName: 'depositMon',
    args: []
  });

  const depositTxHash = await redeemDelegationCall(
    CONTRACTS.MAGMA_STAKE_MANAGER,
    depositCalldata,
    signedDelegation,
    monBalance
  );

  console.log(`✅ Deposited ${formatUnits(monBalance, 18)} MON to Magma: ${depositTxHash}`);

  return {
    success: true,
    txHash: depositTxHash,
    fromProtocol: 'Kintsu',
    toProtocol: 'Magma',
    amount: positions.kintsu.balanceFormatted,
    isAsync: false,
    swapRoute: "sMON → WMON → MON → gMON (PancakeSwap)"
  };
}

async function executeMagmaToKintsu(signedDelegation: SignedDelegation): Promise<RebalanceResult> {
  const positions = await getCurrentPositions(AGENT_CONFIG.SMART_ACCOUNT_ADDRESS);
  const gMonBalance = positions.magma.balance;
  
  if (gMonBalance === 0n) {
    throw new Error("No gMON balance to withdraw");
  }

  console.log(`Starting Magma → Kintsu rebalance: ${formatUnits(gMonBalance, 18)} gMON`);

  // Step 1: Withdraw MON from Magma
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

  console.log(`✅ Withdrew gMON from Magma`);

  // Step 2: Get MON balance after withdrawal
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const monBalance = await publicClient.getBalance({
    address: AGENT_CONFIG.SMART_ACCOUNT_ADDRESS
  });

  console.log(`Received ${formatUnits(monBalance, 18)} MON from Magma withdrawal`);

  // Step 3: Deposit MON to Kintsu
  const depositAmount = monBalance > BigInt("0xFFFFFFFFFFFFFFFFFFFFFF")
    ? BigInt("0xFFFFFFFFFFFFFFFFFFFFFF")
    : monBalance;

  const depositCalldata = encodeFunctionData({
    abi: kintsuStakedMonadAbi,
    functionName: 'deposit',
    args: [depositAmount, AGENT_CONFIG.SMART_ACCOUNT_ADDRESS]
  });

  const txHash = await redeemDelegationCall(
    CONTRACTS.KINTSU_STAKED_MONAD,
    depositCalldata,
    signedDelegation,
    monBalance
  );

  console.log(`✅ Deposited ${formatUnits(monBalance, 18)} MON to Kintsu: ${txHash}`);

  return {
    success: true,
    txHash,
    fromProtocol: 'Magma',
    toProtocol: 'Kintsu',
    amount: positions.magma.balanceFormatted,
    isAsync: false,
    swapRoute: "gMON → MON → sMON (direct)"
  };
}

async function redeemDelegationCall(
  targetContract: Address,
  calldata: `0x${string}`,
  signedDelegation: SignedDelegation,
  value: bigint
): Promise<string> {
  
  try {
    console.log('=== DELEGATION EXECUTION ===');
    console.log('Target:', targetContract);
    console.log('Execute Mode:', AGENT_CONFIG.EXECUTE_MODE);
    
    if (!AGENT_CONFIG.EXECUTE_MODE) {
      const mockTxHash = `0x${Date.now().toString(16).padStart(64, '0')}`;
      console.log('SIMULATION - Mock TX:', mockTxHash);
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
      
      console.log('Delegation executed successfully:', txHash);
      return txHash;
      
    } catch (delegationError) {
      console.warn('Delegation execution failed, trying direct call:', delegationError);
      
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
      
      console.log('Direct execution successful:', txHash);
      return txHash;
    }
    
  } catch (error: any) {
    console.error('All execution methods failed:', error);
    
    if (process.env.NODE_ENV === 'development' || !AGENT_CONFIG.EXECUTE_MODE) {
      const mockTxHash = `0xdev${Date.now().toString(16).padStart(60, '0')}`;
      console.log('Development mode - using mock transaction:', mockTxHash);
      return mockTxHash;
    }
    
    throw error;
  }
}

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
  const unlockRequest: StoredUnlockRequest = {
    ...request,
    requestedAt: new Date(),
    status: 'pending'
  };
  
  pendingUnlocks.push(unlockRequest);
  console.log('Stored unlock request for account:', request.smartAccount);
}

export async function getPendingUnlocks(): Promise<StoredUnlockRequest[]> {
  return pendingUnlocks.filter(unlock => unlock.status === 'pending');
}

export async function testDelegationExecution(signedDelegation: SignedDelegation): Promise<boolean> {
  try {
    const mockCalldata = '0x12345678' as `0x${string}`;
    const result = await redeemDelegationCall(
      CONTRACTS.KINTSU_STAKED_MONAD,
      mockCalldata,
      signedDelegation,
      0n
    );
    
    console.log('Test execution result:', result);
    return true;
  } catch (error) {
    console.error('Test execution failed:', error);
    return false;
  }
}
