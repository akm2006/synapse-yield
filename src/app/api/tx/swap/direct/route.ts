// src/app/api/tx/swap/direct/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { Address } from 'viem';
import { encodeFunctionData, encodeAbiParameters } from 'viem';
import { getAAClient, settleUserOperation } from '@/lib/aaClient';
import { CONTRACTS } from '@/lib/contracts';
import { ensureTokenAllowancesAA } from '@/lib/ensureAllowancesAA';
import { emitLog, endLog } from '@/lib/logBus';

const UNIVERSAL_ROUTER = CONTRACTS.PANCAKESWAP;

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

const CMD_V3_SWAP_EXACT_IN = '0x00' as `0x${string}`;

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

export async function POST(req: Request) {
  let opId: string | undefined;
  try {
    const body = await req.json();
    const fromToken = body.fromToken as Address;
    const toToken = body.toToken as Address;
    const amountIn = BigInt(body.amountIn as string);
    const minOut = BigInt((body.minOut as string) ?? '0');
    const fee = Number(body.fee ?? 2500);
    const recipient = body.recipient as Address;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(body.deadlineSec ?? 1800));
    opId = body.opId as string | undefined;

    const { client } = await getAAClient();
    const smartAccountAddress = client.account.address;

    const log = (m: string) => opId ? emitLog(opId, m) : console.log(m);

    log(`Direct swap started: ${amountIn.toString()} from ${fromToken} to ${toToken}`);

    // STEP 1: Check allowances and build approval calls
    const approvals = await ensureTokenAllowancesAA(fromToken, amountIn, {
      opId,
      smartAccountAddress
    });

    // STEP 2: Build swap call data
    const path = encodeV3Path(fromToken, toToken, fee);
    const commands = CMD_V3_SWAP_EXACT_IN;
    const inputSwap = encodeV3SwapExactInInput({
      recipient: recipient,
      amountIn,
      amountOutMin: minOut,
      path,
      payerIsUser: true,
    });
    const inputs = [inputSwap] as `0x${string}`[];
    const swapCallData = encodeFunctionData({
      abi: universalRouterAbi,
      functionName: 'execute',
      args: [commands, inputs, deadline],
    });

    // STEP 3: Build complete call array
    const calls: Array<{ to: Address; data: `0x${string}`; value?: bigint }> = [
      ...approvals.requiredCalls, // ERC20 and/or Permit2 approvals
      { to: UNIVERSAL_ROUTER, data: swapCallData }, // The swap
    ];

    log(`Submitting batched UserOperation with ${calls.length} calls (${approvals.requiredCalls.length} approvals + swap)`);

    // STEP 4: Submit batched UserOperation
    const userOpHash = await client.sendUserOperation({ calls });
    log(`UserOperation submitted: ${userOpHash}`);

    // STEP 5: Wait for settlement
    const settled = await settleUserOperation(userOpHash);
    log(`UserOperation settled: tx=${settled.transactionHash} block=${settled.blockNumber}`);

    if (opId) endLog(opId);

    return NextResponse.json({
      ok: true,
      approvals: {
        erc20: approvals.erc20,
        permit2: approvals.permit2,
      },
      userOpHash,
      transactionHash: settled.transactionHash,
      blockNumber: settled.blockNumber ? settled.blockNumber.toString() : null,
      batchedCalls: calls.length,
    });
  } catch (e: any) {
    if (opId) {
      emitLog(opId, `Error: ${e?.message ?? String(e)}`);
      endLog(opId);
    }
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
