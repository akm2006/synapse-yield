import { NextRequest, NextResponse } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';
import { Hex, Address, parseUnits, encodeFunctionData, encodeAbiParameters } from 'viem';
import { toMetaMaskSmartAccount, Implementation, ExecutionMode, Delegation } from '@metamask/delegation-toolkit';
import { DelegationManager } from '@metamask/delegation-toolkit/contracts';
import { createPublicClient, http } from 'viem';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { monadTestnet } from '@/lib/smartAccountClient';
import { kintsuAbi, magmaAbi, erc20Abi, permit2Abi } from '@/lib/abis';
import { CONTRACTS } from '@/lib/contracts';
import {
  createBundlerClient,
  createPaymasterClient,
} from 'viem/account-abstraction';

const DELEGATE_PRIVATE_KEY = process.env.DELEGATE_PRIVATE_KEY as Hex;
const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY!;

if (!DELEGATE_PRIVATE_KEY || !PIMLICO_API_KEY) {
  throw new Error('Required environment variables missing');
}

const chainId = 10143;
const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

const bundlerClient = createBundlerClient({
  transport: http(`https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`),
});

const paymasterClient = createPaymasterClient({
  transport: http(`https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`),
});

const pimlicoClient = createPimlicoClient({
  transport: http(`https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`),
});

// --- Start of your changes ---
// Universal Router ABI for swaps
const universalRouterAbi = [
  {
    type: 'function',
    name: 'execute',
    stateMutability: 'payable',
    inputs: [
      { name: 'commands', type: 'bytes' },
      { name: 'inputs', type: 'bytes[]' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

// WMON ABI for wrapping operations
const wmonAbi = [
  { type: 'function', name: 'deposit', stateMutability: 'payable', inputs: [], outputs: [] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ name: 'wad', type: 'uint256' }], outputs: [] },
] as const;

// Helper functions for swap operations
function encodeV3Path(tokenIn: Address, tokenOut: Address, fee: number): `0x${string}` {
  const feeHex = fee.toString(16).padStart(6, '0');
  return `0x${tokenIn.slice(2)}${feeHex}${tokenOut.slice(2)}` as `0x${string}`;
}

function encodeV3SwapExactInInput(params: {
  recipient: Address;
  amountIn: bigint;
  amountOutMin: bigint;
  path: `0x${string}`;
  payerIsUser: boolean;
}): `0x${string}` {
  return encodeAbiParameters(
    [
      { name: 'recipient', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'bytes' },
      { name: 'payerIsUser', type: 'bool' },
    ],
    [params.recipient, params.amountIn, params.amountOutMin, params.path, params.payerIsUser]
  ) as `0x${string}`;
}

// Helper to ensure token allowances
async function ensureTokenAllowances(token: Address, amountNeeded: bigint, smartAccountAddress: Address) {
  const requiredCalls: Array<{ target: Address; value: bigint; callData: `0x${string}` }> = [];
  
  // Check ERC20 allowance to Permit2
  const currentErc20 = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [smartAccountAddress, CONTRACTS.PERMIT2],
  }) as bigint;

  if (currentErc20 < amountNeeded) {
    const erc20CallData = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [CONTRACTS.PERMIT2, 2n ** 256n - 1n], // Max approval
    });
    requiredCalls.push({ target: token, value: 0n, callData: erc20CallData });
  }

  // Check Permit2 allowance to Universal Router
  try {
    const [pAmount, pExpire] = await publicClient.readContract({
      address: CONTRACTS.PERMIT2,
      abi: permit2Abi,
      functionName: 'allowance',
      args: [smartAccountAddress, token, CONTRACTS.PANCAKESWAP],
    }) as [bigint, number, number];

    const now = Math.floor(Date.now() / 1000);
    const permit2Expired = pExpire > 0 && pExpire <= now;
    
    if (pAmount < amountNeeded || permit2Expired) {
      const expiration = now + 365 * 24 * 60 * 60; // 1 year
      const permit2CallData = encodeFunctionData({
        abi: permit2Abi,
        functionName: 'approve',
        args: [token, CONTRACTS.PANCAKESWAP, (2n ** 160n) - 1n, expiration],
      });
      requiredCalls.push({ target: CONTRACTS.PERMIT2, value: 0n, callData: permit2CallData });
    }
  } catch {
    // If reading fails, include permit2 approval
    const expiration = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    const permit2CallData = encodeFunctionData({
      abi: permit2Abi,
      functionName: 'approve',
      args: [token, CONTRACTS.PANCAKESWAP, (2n ** 160n) - 1n, expiration],
    });
    requiredCalls.push({ target: CONTRACTS.PERMIT2, value: 0n, callData: permit2CallData });
  }

  return requiredCalls;
}

export async function POST(request: NextRequest) {
  let body: any;
  
  try {
    body = await request.json();
    const { userAddress, operation, amount, delegation } = body;

    if (!userAddress || !operation || !delegation) {
      return NextResponse.json(
        { error: 'User address, operation, and delegation are required' },
        { status: 400 }
      );
    }

    // Validate operation type
    const validOperations = [
      'stake-magma', 'unstake-magma', 'stake-kintsu', 'unstake-kintsu',
      'magma-withdraw', 'kintsu-deposit', 'kintsu-instant-unstake', 
      'kintsu-request-unlock', 'kintsu-redeem', 'direct-swap', 
      'wrap-mon', 'unwrap-wmon'
    ];

    if (!validOperations.includes(operation)) {
      return NextResponse.json(
        { error: 'Invalid operation' },
        { status: 400 }
      );
    }

    // Create delegate account
    const account = privateKeyToAccount(DELEGATE_PRIVATE_KEY);
    const delegateSA = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [account.address as Address, [] as string[], [] as bigint[], [] as bigint[]],
      deploySalt: "0x" as Address,
      signer: { account },
    });

    // Parse delegation
    const parsedDelegation: Delegation = {
      ...delegation,
      caveat: delegation.caveat ? {
        ...delegation.caveat,
        ...(delegation.caveat.maxValue && { maxValue: BigInt(delegation.caveat.maxValue) }),
      } : delegation.caveat,
    };

    // Create executions based on operation
    let executions: Array<{ target: Address; value: bigint; callData: `0x${string}` }> = [];

   // Replace the problematic switch statement section (around lines 160-240):
// --- Start of your changes ---
switch (operation) {
  case 'stake-magma': {
    const amountBigInt = parseUnits(amount, 18);
    executions.push({
      target: CONTRACTS.MAGMA_STAKE,
      value: amountBigInt,
      callData: encodeFunctionData({
        abi: magmaAbi,
        functionName: 'depositMon',
        args: body.referralId ? [BigInt(body.referralId)] : [],
      }),
    });
    break;
  }

  case 'unstake-magma': {
    const amountBigInt = parseUnits(amount, 18);
    executions.push({
      target: CONTRACTS.MAGMA_STAKE,
      value: 0n,
      callData: encodeFunctionData({
        abi: magmaAbi,
        functionName: 'withdrawMon',
        args: [amountBigInt],
      }),
    });
    break;
  }

  case 'stake-kintsu': {
    const amountBigInt = parseUnits(amount, 18);
    executions.push({
      target: CONTRACTS.KINTSU,
      value: amountBigInt,
      callData: encodeFunctionData({
        abi: kintsuAbi,
        functionName: 'deposit',
        args: [amountBigInt, userAddress as Address],
      }),
    });
    break;
  }

  case 'magma-withdraw': {
    const amountBigInt = parseUnits(amount, 18);
    executions.push({
      target: CONTRACTS.MAGMA_STAKE,
      value: 0n,
      callData: encodeFunctionData({
        abi: magmaAbi,
        functionName: 'withdrawMon',
        args: [amountBigInt],
      }),
    });
    break;
  }

  case 'kintsu-deposit': {
    const amountBigInt = parseUnits(amount, 18);
    executions.push({
      target: CONTRACTS.KINTSU,
      value: amountBigInt,
      callData: encodeFunctionData({
        abi: kintsuAbi,
        functionName: 'deposit',
        args: [amountBigInt, body.receiver as Address],
      }),
    });
    break;
  }

  case 'kintsu-request-unlock': {
    const amountBigInt = parseUnits(amount, 18);
    executions.push({
      target: CONTRACTS.KINTSU,
      value: 0n,
      callData: encodeFunctionData({
        abi: kintsuAbi,
        functionName: 'requestUnlock',
        args: [amountBigInt],
      }),
    });
    break;
  }

  case 'kintsu-redeem': {
    executions.push({
      target: CONTRACTS.KINTSU,
      value: 0n,
      callData: encodeFunctionData({
        abi: kintsuAbi,
        functionName: 'redeem',
        args: [BigInt(body.unlockIndex), body.receiver as Address],
      }),
    });
    break;
  }

  case 'wrap-mon': {
    const amountBigInt = parseUnits(amount, 18);
    executions.push({
      target: CONTRACTS.WMON,
      value: amountBigInt,
      callData: encodeFunctionData({
        abi: wmonAbi,
        functionName: 'deposit',
        args: [],
      }),
    });
    break;
  }

  case 'unwrap-wmon': {
    const amountBigInt = parseUnits(amount, 18);
    // First ensure allowances if needed
    const allowanceCalls = await ensureTokenAllowances(CONTRACTS.WMON, amountBigInt, userAddress as Address);
    executions.push(...allowanceCalls);
    
    executions.push({
      target: CONTRACTS.WMON,
      value: 0n,
      callData: encodeFunctionData({
        abi: wmonAbi,
        functionName: 'withdraw',
        args: [amountBigInt],
      }),
    });
    break;
  }

  case 'direct-swap': {
    const { fromToken, toToken, amountIn, minOut, fee, recipient, deadline } = body;
    const amountInBigInt = BigInt(amountIn);
    const minOutBigInt = BigInt(minOut);
    
    // Ensure token allowances for swaps
    if (fromToken !== '0x0000000000000000000000000000000000000000') {
      const allowanceCalls = await ensureTokenAllowances(fromToken, amountInBigInt, userAddress as Address);
      executions.push(...allowanceCalls);
    }

    // Build swap execution
    const path = encodeV3Path(fromToken, toToken, fee);
    const commands = '0x00' as `0x${string}`; // V3_SWAP_EXACT_IN
    const inputSwap = encodeV3SwapExactInInput({
      recipient: recipient as Address,
      amountIn: amountInBigInt,
      amountOutMin: minOutBigInt,
      path,
      payerIsUser: true,
    });

    const swapCallData = encodeFunctionData({
      abi: universalRouterAbi,
      functionName: 'execute',
      args: [commands, [inputSwap], BigInt(deadline)],
    });

    executions.push({
      target: CONTRACTS.PANCAKESWAP,
      value: fromToken === '0x0000000000000000000000000000000000000000' ? amountInBigInt : 0n,
      callData: swapCallData,
    });
    break;
  }

  case 'kintsu-instant-unstake': {
    const { amountIn, minOut, fee, recipient, unwrap } = body;
    const amountInBigInt = BigInt(amountIn);
    const minOutBigInt = BigInt(minOut);
    
    // Ensure sMON allowances for swapping
    const allowanceCalls = await ensureTokenAllowances(CONTRACTS.KINTSU, amountInBigInt, userAddress as Address);
    executions.push(...allowanceCalls);

    // Build swap sMON -> WMON via PancakeSwap
    const path = encodeV3Path(CONTRACTS.KINTSU, CONTRACTS.WMON, fee || 2500);
    const commands = '0x00' as `0x${string}`; // V3_SWAP_EXACT_IN
    const inputSwap = encodeV3SwapExactInInput({
      recipient: userAddress as Address,
      amountIn: amountInBigInt,
      amountOutMin: minOutBigInt,
      path,
      payerIsUser: true,
    });

    const swapCallData = encodeFunctionData({
      abi: universalRouterAbi,
      functionName: 'execute',
      args: [commands, [inputSwap], BigInt(Math.floor(Date.now() / 1000) + 1800)],
    });

    executions.push({
      target: CONTRACTS.PANCAKESWAP,
      value: 0n,
      callData: swapCallData,
    });

    // Add unwrap WMON -> MON if requested
    if (unwrap) {
      const withdrawCallData = encodeFunctionData({
        abi: wmonAbi,
        functionName: 'withdraw',
        args: [minOutBigInt],
      });
      executions.push({
        target: CONTRACTS.WMON,
        value: 0n,
        callData: withdrawCallData,
      });
    }
    break;
  }

  default:
    throw new Error(`Invalid operation: ${operation}`);
}
// --- End of your changes ---


    // Encode delegation redemption
    const redeemData = DelegationManager.encode.redeemDelegations({
      delegations: [[parsedDelegation]],
      modes: [ExecutionMode.SingleDefault],
      executions: [executions],
    });

    // Execute transaction
    const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();
    
    const userOpHash = await bundlerClient.sendUserOperation({
      account: delegateSA,
      calls: [{
        to: delegateSA.address,
        data: redeemData,
        value: executions.reduce((sum, ex) => sum + ex.value, 0n),
      }],
      ...fee,
      paymaster: paymasterClient,
    });

    const { receipt } = await bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });

    return NextResponse.json({
      success: true,
      txHash: receipt.transactionHash,
      userOpHash,
      batchedCalls: executions.length,
    });

  } catch (error) {
    console.error(`Failed to execute ${body?.operation || 'operation'}:`, error);
    return NextResponse.json(
      { error: `Failed to execute ${body?.operation || 'operation'}` },
      { status: 500 }
    );
  }
}
// --- End of your changes ---
