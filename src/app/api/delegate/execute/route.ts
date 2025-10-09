// src/app/api/delegate/execute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import {
  Hex,
  Address,
  parseUnits,
  encodeFunctionData,
  encodeAbiParameters,
} from "viem";
import {
  toMetaMaskSmartAccount,
  Implementation,
  ExecutionMode,
  Delegation,
} from "@metamask/delegation-toolkit";
import { DelegationManager } from "@metamask/delegation-toolkit/contracts";
import { createPublicClient, http } from "viem";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { monadTestnet } from "@/lib/smartAccountClient";
import { kintsuAbi, magmaAbi, erc20Abi, permit2Abi } from "@/lib/abis";
import { CONTRACTS } from "@/lib/contracts";
import {
  createBundlerClient,
  createPaymasterClient,
} from "viem/account-abstraction";
import { settleUserOperation } from "@/lib/aaClient";
const DELEGATE_PRIVATE_KEY = process.env.DELEGATE_PRIVATE_KEY as Hex;
const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY!;

if (!DELEGATE_PRIVATE_KEY || !PIMLICO_API_KEY) {
  throw new Error("Required environment variables missing");
}

const chainId = 10143;
const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

const bundlerClient = createBundlerClient({
  transport: http(
    `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`
  ),
});

const paymasterClient = createPaymasterClient({
  transport: http(
    `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`
  ),
});

const pimlicoClient = createPimlicoClient({
  transport: http(
    `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_API_KEY}`
  ),
});

// --- Start of refactor ---
// Universal Router ABI for swaps
const universalRouterAbi = [
  {
    type: "function",
    name: "execute",
    stateMutability: "payable",
    inputs: [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

// WMON ABI for wrapping operations
const wmonAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "wad", type: "uint256" }],
    outputs: [],
  },
] as const;

// Helper functions for swap operations
function encodeV3Path(
  tokenIn: Address,
  tokenOut: Address,
  fee: number
): `0x${string}` {
  const feeHex = fee.toString(16).padStart(6, "0");
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
      { name: "recipient", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "bytes" },
      { name: "payerIsUser", type: "bool" },
    ],
    [
      params.recipient,
      params.amountIn,
      params.amountOutMin,
      params.path,
      params.payerIsUser,
    ]
  ) as `0x${string}`;
}

// Helper to ensure token allowances - unchanged (returns call objects)
async function ensureTokenAllowances(
  token: Address,
  amountNeeded: bigint,
  smartAccountAddress: Address
) {
  const requiredCalls: Array<{
    target: Address;
    value: bigint;
    callData: `0x${string}`;
  }> = [];

  // Check ERC20 allowance to Permit2
  const currentErc20 = (await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [smartAccountAddress, CONTRACTS.PERMIT2],
  })) as bigint;

  if (currentErc20 < amountNeeded) {
    const erc20CallData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [CONTRACTS.PERMIT2, 2n ** 256n - 1n],
    });
    requiredCalls.push({ target: token, value: 0n, callData: erc20CallData });
  }

  // Check Permit2 allowance to Universal Router / router-like spender
  try {
    const [pAmount, pExpire] = (await publicClient.readContract({
      address: CONTRACTS.PERMIT2,
      abi: permit2Abi,
      functionName: "allowance",
      args: [smartAccountAddress, token, CONTRACTS.PANCAKESWAP],
    })) as [bigint, number, number];

    const now = Math.floor(Date.now() / 1000);
    const permit2Expired = pExpire > 0 && pExpire <= now;

    if (pAmount < amountNeeded || permit2Expired) {
      const expiration = now + 365 * 24 * 60 * 60; // 1 year
      const permit2CallData = encodeFunctionData({
        abi: permit2Abi,
        functionName: "approve",
        args: [token, CONTRACTS.PANCAKESWAP, 2n ** 160n - 1n, expiration],
      });
      requiredCalls.push({
        target: CONTRACTS.PERMIT2,
        value: 0n,
        callData: permit2CallData,
      });
    }
  } catch {
    // If reading fails, include permit2 approval
    const expiration = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    const permit2CallData = encodeFunctionData({
      abi: permit2Abi,
      functionName: "approve",
      args: [token, CONTRACTS.PANCAKESWAP, 2n ** 160n - 1n, expiration],
    });
    requiredCalls.push({
      target: CONTRACTS.PERMIT2,
      value: 0n,
      callData: permit2CallData,
    });
  }

  return requiredCalls;
}

// A helper to send one execution (one call) using delegation redeemDelegations.
// This packages a single execution into the expected structure and sends it via bundler.
async function sendRedeemExecution({
  execution,
  delegateSA,
  parsedDelegation,
  bundlerClient,
  paymasterClient,
  pimlicoClient,
}: {
  execution: { target: Address; value: bigint; callData: `0x${string}` };
  delegateSA: any;
  parsedDelegation: Delegation;
  bundlerClient: ReturnType<typeof createBundlerClient>;
  paymasterClient: ReturnType<typeof createPaymasterClient>;
  pimlicoClient: ReturnType<typeof createPimlicoClient>;
}) {
  // Build redeem data with a single execution wrapped as [[execution]]
  const redeemData = DelegationManager.encode.redeemDelegations({
    delegations: [[parsedDelegation]],
    modes: [ExecutionMode.SingleDefault],
    executions: [[execution]],
  });

  // get gas price (pimlico)
  const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();

  const userOpHash = await bundlerClient.sendUserOperation({
    account: delegateSA,
    calls: [
      {
        to: delegateSA.address,
        data: redeemData,
        value: execution.value,
      },
    ],
    ...fee,
    paymaster: paymasterClient,
  });

  // wait for receipt
  const { receipt } = await bundlerClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });

  return { userOpHash, txHash: receipt.transactionHash, receipt };
}

export async function POST(request: NextRequest) {
  let body: any;

  try {
    body = await request.json();
    const { userAddress, operation, amount, delegation } = body;

    if (!userAddress || !operation || !delegation) {
      return NextResponse.json(
        { error: "User address, operation, and delegation are required" },
        { status: 400 }
      );
    }

    const validOperations = [
      "stake-magma",
      "unstake-magma",
      "stake-kintsu",
      "unstake-kintsu",
      "magma-withdraw",
      "kintsu-deposit",
      "kintsu-instant-unstake",
      "kintsu-request-unlock",
      "kintsu-redeem",
      "direct-swap",
      "wrap-mon",
      "unwrap-wmon",
      "permit2-approve",
      "permit2-approve-step1",
      "permit2-approve-step2",
    ];

    if (!validOperations.includes(operation)) {
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
    }

    // Create delegate account
    const account = privateKeyToAccount(DELEGATE_PRIVATE_KEY);
    const delegateSA = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [
        account.address as Address,
        [] as string[],
        [] as bigint[],
        [] as bigint[],
      ],
      deploySalt: "0x" as Address,
      signer: { account },
    });

    // Parse delegation (convert maxValue if present)
    const parsedDelegation: Delegation = {
      ...delegation,
      caveat: delegation.caveat
        ? {
            ...delegation.caveat,
            ...(delegation.caveat.maxValue && {
              maxValue: BigInt(delegation.caveat.maxValue),
            }),
          }
        : delegation.caveat,
    };

    // Build calls but separate "approval" calls from "main" executions to run them individually
    const approvalCalls: Array<{
      target: Address;
      value: bigint;
      callData: `0x${string}`;
    }> = [];
    const mainExecutions: Array<{
      target: Address;
      value: bigint;
      callData: `0x${string}`;
    }> = [];

    // Build operation-specific calls
    switch (operation) {
      case "stake-magma": {
        const amountBigInt = parseUnits(amount, 18);
        mainExecutions.push({
          target: CONTRACTS.MAGMA_STAKE,
          value: amountBigInt,
          callData: encodeFunctionData({
            abi: magmaAbi,
            functionName: "depositMon",
            args: body.referralId ? [BigInt(body.referralId)] : [],
          }),
        });
        break;
      }
// Add these cases to the existing switch statement in your execute route

case "kintsu-to-magma-rebalance": {
  const amountBigInt = parseUnits(amount, 18);
  
  // Step 1: Swap sMON → WMON via DEX
  const allowanceCalls = await ensureTokenAllowances(
    CONTRACTS.KINTSU,
    amountBigInt,
    userAddress as Address
  );
  approvalCalls.push(...allowanceCalls);

  const path = encodeV3Path(CONTRACTS.KINTSU, CONTRACTS.WMON, 2500);
  const commands = "0x00" as `0x${string}`;
  const minOut = (amountBigInt * 95n / 100n);
  
  const inputSwap = encodeV3SwapExactInInput({
    recipient: userAddress as Address,
    amountIn: amountBigInt,
    amountOutMin: minOut,
    path,
    payerIsUser: true,
  });

  const swapCallData = encodeFunctionData({
    abi: universalRouterAbi,
    functionName: "execute",
    args: [commands, [inputSwap], BigInt(Math.floor(Date.now() / 1000) + 1800)],
  });

  mainExecutions.push({
    target: CONTRACTS.PANCAKESWAP,
    value: 0n,
    callData: swapCallData,
  });

  // Step 2: Stake WMON → gMON via Magma
  mainExecutions.push({
    target: CONTRACTS.MAGMA_STAKE,
    value: minOut,
    callData: encodeFunctionData({
      abi: magmaAbi,
      functionName: "depositMon",
      args: [],
    }),
  });
  break;
}

case "magma-to-kintsu-rebalance": {
  const amountBigInt = parseUnits(amount, 18);
  
  // Step 1: Unstake gMON → MON via Magma
  mainExecutions.push({
    target: CONTRACTS.MAGMA_STAKE,
    value: 0n,
    callData: encodeFunctionData({
      abi: magmaAbi,
      functionName: "withdrawMon",
      args: [amountBigInt],
    }),
  });

  // Step 2: Stake MON → sMON via Kintsu
  mainExecutions.push({
    target: CONTRACTS.KINTSU,
    value: amountBigInt,
    callData: encodeFunctionData({
      abi: kintsuAbi,
      functionName: "deposit",
      args: [amountBigInt, userAddress as Address],
    }),
  });
  break;
}

      case "permit2-approve-step1": {
        const token: Address = body.token;
        const amountBigInt = BigInt(body.amount);
        const erc20CallData = encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTRACTS.PERMIT2, amountBigInt],
        });
        mainExecutions.push({
          target: token,
          value: 0n,
          callData: erc20CallData,
        });
        break;
      }

      case "permit2-approve-step2": {
        const token: Address = body.token;
        const spender: Address = body.spender;
        const amountBigInt = BigInt(body.amount);
        const expiration = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
        const permit2CallData = encodeFunctionData({
          abi: permit2Abi,
          functionName: "approve",
          args: [token, spender, 2n ** 160n - 1n, expiration],
        });
        mainExecutions.push({
          target: CONTRACTS.PERMIT2,
          value: 0n,
          callData: permit2CallData,
        });
        break;
      }

      case "permit2-approve": {
        const token: Address = body.token;
        const spender: Address = body.spender;
        const amountBigInt = BigInt(body.amount);

        // Split into two sequential operations: ERC20->Permit2, then Permit2->spender
        const erc20CallData = encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTRACTS.PERMIT2, amountBigInt],
        });
        approvalCalls.push({
          target: token,
          value: 0n,
          callData: erc20CallData,
        });

        const expiration = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
        const permit2CallData = encodeFunctionData({
          abi: permit2Abi,
          functionName: "approve",
          args: [token, spender, amountBigInt, expiration],
        });
        mainExecutions.push({
          target: CONTRACTS.PERMIT2,
          value: 0n,
          callData: permit2CallData,
        });
        break;
      }

      case "unstake-magma": {
        const amountBigInt = parseUnits(amount, 18);
        mainExecutions.push({
          target: CONTRACTS.MAGMA_STAKE,
          value: 0n,
          callData: encodeFunctionData({
            abi: magmaAbi,
            functionName: "withdrawMon",
            args: [amountBigInt],
          }),
        });
        break;
      }

      case "stake-kintsu": {
        const amountBigInt = parseUnits(amount, 18);
        mainExecutions.push({
          target: CONTRACTS.KINTSU,
          value: amountBigInt,
          callData: encodeFunctionData({
            abi: kintsuAbi,
            functionName: "deposit",
            args: [amountBigInt, userAddress as Address],
          }),
        });
        break;
      }

      case "magma-withdraw": {
        const amountBigInt = parseUnits(amount, 18);
        mainExecutions.push({
          target: CONTRACTS.MAGMA_STAKE,
          value: 0n,
          callData: encodeFunctionData({
            abi: magmaAbi,
            functionName: "withdrawMon",
            args: [amountBigInt],
          }),
        });
        break;
      }

      case "kintsu-deposit": {
        const amountBigInt = parseUnits(amount, 18);
        mainExecutions.push({
          target: CONTRACTS.KINTSU,
          value: amountBigInt,
          callData: encodeFunctionData({
            abi: kintsuAbi,
            functionName: "deposit",
            args: [amountBigInt, body.receiver as Address],
          }),
        });
        break;
      }

      case "kintsu-request-unlock": {
        const amountBigInt = parseUnits(amount, 18);
        mainExecutions.push({
          target: CONTRACTS.KINTSU,
          value: 0n,
          callData: encodeFunctionData({
            abi: kintsuAbi,
            functionName: "requestUnlock",
            args: [amountBigInt],
          }),
        });
        break;
      }

      case "kintsu-redeem": 
      {
        mainExecutions.push({
          target: CONTRACTS.KINTSU,
          value: 0n,
          callData: encodeFunctionData({
            abi: kintsuAbi,
            functionName: "redeem",
            args: [BigInt(body.unlockIndex), body.receiver as Address],
          }),
        });
        break;
      }

      case "wrap-mon": {
        const amountBigInt = parseUnits(amount, 18);
        mainExecutions.push({
          target: CONTRACTS.WMON,
          value: amountBigInt,
          callData: encodeFunctionData({
            abi: wmonAbi,
            functionName: "deposit",
            args: [],
          }),
        });
        break;
      }

      case "unwrap-wmon": {
        const amountBigInt = parseUnits(amount, 18);
        mainExecutions.push({
          target: CONTRACTS.WMON,
          value: 0n,
          callData: encodeFunctionData({
            abi: wmonAbi,
            functionName: "withdraw",
            args: [amountBigInt],
          }),
        });
        break;
      }

      case "direct-swap": {
        const {
          fromToken,
          toToken,
          amountIn,
          minOut,
          fee,
          recipient,
          deadline,
        } = body;
        const amountInBigInt = BigInt(amountIn);
        const minOutBigInt = BigInt(minOut);

        // get allowance calls separately (do not push into a single batch)
        if (fromToken !== "0x0000000000000000000000000000000000000000") {
          const allowanceCalls = await ensureTokenAllowances(
            fromToken,
            amountInBigInt,
            userAddress as Address
          );
          approvalCalls.push(...allowanceCalls);
        }

        // Build swap execution
        const path = encodeV3Path(fromToken, toToken, fee);
        const commands = "0x00" as `0x${string}`; // V3_SWAP_EXACT_IN
        const inputSwap = encodeV3SwapExactInInput({
          recipient: recipient as Address,
          amountIn: amountInBigInt,
          amountOutMin: minOutBigInt,
          path,
          payerIsUser: true,
        });

        const swapCallData = encodeFunctionData({
          abi: universalRouterAbi,
          functionName: "execute",
          args: [commands, [inputSwap], BigInt(deadline)],
        });

        mainExecutions.push({
          target: CONTRACTS.PANCAKESWAP,
          value:
            fromToken === "0x0000000000000000000000000000000000000000"
              ? amountInBigInt
              : 0n,
          callData: swapCallData,
        });

        break;
      }

      case "kintsu-instant-unstake": {
        const { amountIn, minOut, fee, recipient, unwrap } = body;
        const amountInBigInt = BigInt(amountIn);
        const minOutBigInt = BigInt(minOut);

        // collect allowance calls separately
        const allowanceCalls = await ensureTokenAllowances(
          CONTRACTS.KINTSU,
          amountInBigInt,
          userAddress as Address
        );
        approvalCalls.push(...allowanceCalls);

        // Build swap sMON -> WMON via PancakeSwap
        const path = encodeV3Path(
          CONTRACTS.KINTSU,
          CONTRACTS.WMON,
          fee || 2500
        );
        const commands = "0x00" as `0x${string}`; // V3_SWAP_EXACT_IN
        const inputSwap = encodeV3SwapExactInInput({
          recipient: userAddress as Address,
          amountIn: amountInBigInt,
          amountOutMin: minOutBigInt,
          path,
          payerIsUser: true,
        });

        const swapCallData = encodeFunctionData({
          abi: universalRouterAbi,
          functionName: "execute",
          args: [
            commands,
            [inputSwap],
            BigInt(Math.floor(Date.now() / 1000) + 1800),
          ],
        });

        mainExecutions.push({
          target: CONTRACTS.PANCAKESWAP,
          value: 0n,
          callData: swapCallData,
        });

        // Add unwrap WMON -> MON as a separate execution if requested
        if (unwrap) {
          const withdrawCallData = encodeFunctionData({
            abi: wmonAbi,
            functionName: "withdraw",
            args: [minOutBigInt],
          });
          mainExecutions.push({
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

    // Log diagnostics
    console.log("Approval calls count:", approvalCalls.length);
    console.log("Main executions count:", mainExecutions.length);

    // Execute approval calls first (each separately) then main calls individually
    const opResults: Array<{
      userOpHash: string;
      txHash: string | null | undefined;
      target: Address;
      status?: "success" | "reverted" | null;
      explorerUrl?: string | null;
    }> = [];

    // Validate caveats / allowed targets logging for debugging
    // try {
    //   console.log('Delegation caveats allowed targets:', parsedDelegation.caveats?.map((c: any) => c.terms));
    //   function decodeAllowedTargets(hex: string): string[] {
    //     const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    //     const addresses = [];
    //     for(let i = 0; i + 40 <= cleanHex.length; i += 40) {
    //       addresses.push('0x' + cleanHex.slice(i, i + 40));
    //     }
    //     return addresses;
    //   }
    //   if (parsedDelegation.caveats && parsedDelegation.caveats[0]) {
    //     console.log('Decoded Allowed Targets:', decodeAllowedTargets(parsedDelegation.caveats[0].terms));
    //   }
    // } catch (e) {
    //   console.warn('Failed to decode caveats', e);
    // }

    // send approvals
    for (const appr of approvalCalls) {
      console.log(`Sending approval to ${appr.target}`);
      const res = await sendRedeemExecution({
        execution: appr,
        delegateSA,
        parsedDelegation,
        bundlerClient: bundlerClient as any,
        paymasterClient: paymasterClient as any,
        pimlicoClient: pimlicoClient as any,
      });
      opResults.push({ ...res, target: appr.target });
    }

    // send main executions sequentially
    for (const exec of mainExecutions) {
      console.log(`Sending main execution to ${exec.target}`);

      const res = await sendRedeemExecution({
        execution: exec,
        delegateSA,
        parsedDelegation,
        bundlerClient: bundlerClient as any,
        paymasterClient: paymasterClient as any,
        pimlicoClient: pimlicoClient as any,
      });

      try {
        // Fetch final status from aaClient
        const settled = await settleUserOperation(res.userOpHash);

        // Normalize status to satisfy TS
        const normalizedStatus: "success" | "reverted" | null =
          settled.status === "success"
            ? "success"
            : settled.status === "reverted"
            ? "reverted"
            : null;

        // Push final result
        opResults.push({
          userOpHash: res.userOpHash,
          txHash: settled.transactionHash || res.txHash,
          status: normalizedStatus,
          target: exec.target,
          explorerUrl: settled.explorerUrl,
        });

        console.log(
          `[AAClient] Operation confirmed — TX: ${settled.transactionHash}`
        );
      } catch (settleErr) {
        console.error(
          `[AAClient] Failed to confirm UO ${res.userOpHash}`,
          settleErr
        );

        opResults.push({
          userOpHash: res.userOpHash,
          txHash: res.txHash,
          status: null,
          target: exec.target,
          explorerUrl: null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      error: null,
      operations: opResults.map((r) => ({
        userOpHash: r.userOpHash,
        txHash: r.txHash,
        target: r.target,
        status: r.status,
        explorerUrl: r.explorerUrl,
      })),
      approvalsSent: approvalCalls.length,
      mainCallsSent: mainExecutions.length,
    });
  } catch (error: any) {
  console.error(
    `Failed to execute ${body?.operation || "operation"}:`,
    error
  );
  return NextResponse.json(
    {
      success: false,
      error: error?.message || `Failed to execute ${body?.operation || "operation"}`,
      message: "Operation failed",
      operations: [],
      approvalsSent: 0,
      mainCallsSent: 0,
    },
    { status: 500 }
  );
  }
}
