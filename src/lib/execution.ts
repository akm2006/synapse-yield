import { privateKeyToAccount } from "viem/accounts";
import {
  Hex,
  Address,
  parseUnits,
  encodeFunctionData,
  encodeAbiParameters,
  createPublicClient,
  http,
  Account,
} from "viem";
import {
  toMetaMaskSmartAccount,
  Implementation,
  ExecutionMode,
  Delegation,
} from "@metamask/delegation-toolkit";
import { DelegationManager } from "@metamask/delegation-toolkit/contracts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import {
  createBundlerClient,
  createPaymasterClient,
} from "viem/account-abstraction";

import { monadTestnet } from "@/lib/smartAccountClient";
import { kintsuAbi, magmaAbi, erc20Abi, permit2Abi } from "@/lib/abis";
import { CONTRACTS } from "@/lib/contracts";
import { settleUserOperation } from "@/lib/aaClient";

// --- Type Definitions ---
interface OperationBody {
  operation: string;
  amount?: string;
  [key: string]: any;
}

interface ExecutionResult {
  success: boolean;
  error: string | null;
  operations: Array<{
    userOpHash: string;
    txHash: string | null | undefined;
    target: Address;
    status?: "success" | "reverted" | null;
    explorerUrl?: string | null;
  }>;
  approvalsSent: number;
  mainCallsSent: number;
}

// --- Environment Variables and Client Setup (Copied from original) ---
const DELEGATE_PRIVATE_KEY = process.env.DELEGATE_PRIVATE_KEY as Hex;
const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY!;

if (!DELEGATE_PRIVATE_KEY || !PIMLICO_API_KEY) {
  throw new Error(
    "Required environment variables missing in execution library"
  );
}

const chainId = 10143;
const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
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

// --- Helper Functions (Identical to original file) ---
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
      const expiration = now + 365 * 24 * 60 * 60;
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
async function sendRedeemExecution({
  execution,
  delegateSA,
  parsedDelegation,
}: {
  execution: { target: Address; value: bigint; callData: `0x${string}` };
  delegateSA: any;
  parsedDelegation: Delegation;
}) {
  const redeemData = DelegationManager.encode.redeemDelegations({
    delegations: [[parsedDelegation]],
    modes: [ExecutionMode.SingleDefault],
    executions: [[execution]],
  });
  const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();
  const userOpHash = await bundlerClient.sendUserOperation({
    account: delegateSA,
    calls: [
      { to: delegateSA.address, data: redeemData, value: execution.value },
    ],
    ...fee,
    paymaster: paymasterClient,
  });
  const { receipt } = await bundlerClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });
  return { userOpHash, txHash: receipt.transactionHash, receipt };
}

// --- DIAGNOSTIC LOGGER --------------------------------------------------
// Helper to convert BigInts to strings for clean JSON output
function convertBigIntsToStrings(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === "bigint") {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntsToStrings);
  }
  if (typeof obj === "object") {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = convertBigIntsToStrings(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

/**
 * Creates and prints a structured diagnostic log for a transaction execution.
 */
function createDiagnosticLog(
  source: 'OLD_ROUTE' | 'NEW_LIBRARY',
  initialBody: any,
  addressForAllowances: Address,
  finalDelegation: Delegation,
  approvalCalls: any[],
  mainExecutions: any[]
) {
  const logObject = {
    source,
    timestamp: new Date().toISOString(),
    context: {
      note:
        "Comparing the 'addressForAllowances' and the contents of 'approvalCalls' and 'mainExecutions' between logs is critical.",
      addressForAllowances,
    },
    initialRequestBody: initialBody,
    finalTransactionPayload: {
      parsedDelegation: convertBigIntsToStrings(finalDelegation),
      approvalCalls: convertBigIntsToStrings(approvalCalls),
      mainExecutions: convertBigIntsToStrings(mainExecutions),
    },
  };

  // Log the structured object as a pretty-printed JSON string
  console.log('--- TRANSACTION DIAGNOSTIC START ---');
  console.log(JSON.stringify(logObject, null, 2));
  console.log('--- TRANSACTION DIAGNOSTIC END ---');
}
// -----------------------------------------------------------------------

// --- Main Exported Function ---
export async function executeDelegatedOperation(
  delegation: any,
  body: OperationBody,
  // The 'userAddress' parameter from the original code is now supplied by the
  // authenticated session, providing a secure source for the user's address.
  userAddress: Address
): Promise<ExecutionResult> {
  const { operation, amount } = body;

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
  ];
  if (!validOperations.includes(operation)) {
    throw new Error(`Invalid operation: ${operation}`);
  }

  const account = privateKeyToAccount(DELEGATE_PRIVATE_KEY);
  const delegateSA = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [account.address as Address, [], [], []],
    deploySalt: "0x" as Address,
    signer: { account },
  });

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

  // --- This switch statement is a direct, 1-to-1 replication of the original working code's logic ---
  switch (operation) {
    case "stake-magma": {
      const amountBigInt = parseUnits(amount!, 18);
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
    case "permit2-approve": {
      const token: Address = body.token;
      const spender: Address = body.spender;
      const amountBigInt = BigInt(body.amount!);
      const erc20CallData = encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [CONTRACTS.PERMIT2, amountBigInt],
      });
      approvalCalls.push({ target: token, value: 0n, callData: erc20CallData });
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
      const amountBigInt = parseUnits(amount!, 18);
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
      const amountBigInt = parseUnits(amount!, 18);
      mainExecutions.push({
        target: CONTRACTS.KINTSU,
        value: amountBigInt,
        callData: encodeFunctionData({
          abi: kintsuAbi,
          functionName: "deposit",
          args: [amountBigInt, userAddress],
        }),
      });
      break;
    }
    case "magma-withdraw": {
      const amountBigInt = parseUnits(amount!, 18);
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
      const amountBigInt = parseUnits(amount!, 18);
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
      const amountBigInt = parseUnits(amount!, 18);
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
    case "kintsu-redeem": {
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
      const amountBigInt = parseUnits(amount!, 18);
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
      const amountBigInt = parseUnits(amount!, 18);
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
      const { fromToken, toToken, amountIn, minOut, fee, recipient, deadline } =
        body;
      const amountInBigInt = BigInt(amountIn);
      const minOutBigInt = BigInt(minOut);
      if (fromToken !== "0x0000000000000000000000000000000000000000") {
        const allowanceCalls = await ensureTokenAllowances(
          fromToken,
          amountInBigInt,
          userAddress
        );
        approvalCalls.push(...allowanceCalls);
      }
      const path = encodeV3Path(fromToken, toToken, fee);
      const commands = "0x00" as `0x${string}`;
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
      const { amountIn, minOut, fee, unwrap } = body;
      const amountInBigInt = BigInt(amountIn);
      const minOutBigInt = BigInt(minOut);
      const allowanceCalls = await ensureTokenAllowances(
        CONTRACTS.KINTSU,
        amountInBigInt,
        userAddress
      );
      approvalCalls.push(...allowanceCalls);
      const path = encodeV3Path(CONTRACTS.KINTSU, CONTRACTS.WMON, fee || 2500);
      const commands = "0x00" as `0x${string}`;
      const inputSwap = encodeV3SwapExactInInput({
        recipient: userAddress,
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
    default: {
      throw new Error(`Invalid operation: ${operation}`);
    }
  }

  const opResults: ExecutionResult["operations"] = [];

  // --- ADD DIAGNOSTIC LOGGING BEFORE SENDING OPS -------------------------
  try {
    createDiagnosticLog(
      'NEW_LIBRARY',
      body,
      userAddress,
      parsedDelegation,
      approvalCalls,
      mainExecutions
    );
  } catch (e) {
    console.warn('Failed to create diagnostic log', e);
  }
  // ----------------------------------------------------------------------

  for (const appr of approvalCalls) {
    console.log(`Sending approval to ${appr.target}`);
    const res = await sendRedeemExecution({
      execution: appr,
      delegateSA,
      parsedDelegation,
    });
    opResults.push({ ...res, target: appr.target });
  }
  for (const exec of mainExecutions) {
    console.log(`Sending main execution to ${exec.target}`);
    const res = await sendRedeemExecution({
      execution: exec,
      delegateSA,
      parsedDelegation,
    });
    try {
      const settled = await settleUserOperation(res.userOpHash);
      const normalizedStatus: "success" | "reverted" | null =
        settled.status === "success"
          ? "success"
          : settled.status === "reverted"
          ? "reverted"
          : null;
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

  return {
    success: true,
    error: null,
    operations: opResults,
    approvalsSent: approvalCalls.length,
    mainCallsSent: mainExecutions.length,
  };
}