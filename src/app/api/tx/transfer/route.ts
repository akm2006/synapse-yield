// src/app/api/tx/transfer/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { Address } from 'viem';
import { parseUnits, encodeFunctionData } from 'viem';
import { getAAClient, settleUserOperation } from '@/lib/aaClient';
import { CONTRACTS } from '@/lib/contracts';
import { erc20Abi } from '@/lib/abis';
import { emitLog, endLog } from '@/lib/logBus';

export async function POST(req: Request) {
  let opId: string | undefined;
  try {
    const body = await req.json();
    const { to, amount, token, opId: requestOpId } = body as {
      to: Address;
      amount: string;
      token: 'MON' | 'sMON' | 'gMON';
      opId?: string;
    };
    opId = requestOpId;

    const log = (m: string) => (opId ? emitLog(opId, m) : console.log(m));

    // Basic validation
    if (!to || typeof to !== 'string' || !to.startsWith('0x') || to.length !== 42) {
      return NextResponse.json({ ok: false, error: 'Invalid recipient' }, { status: 400 });
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid amount' }, { status: 400 });
    }
    if (token !== 'MON' && token !== 'sMON' && token !== 'gMON') {
      return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 400 });
    }

    const value = parseUnits(amount, 18); // 18-decimals normalized [web:99][web:95]

    log(`[ACTION] Transfer ${amount} ${token} → ${to}`);

    const { client } = await getAAClient(); // AA client for sendUserOperation [web:100][web:109]

    const calls: { to: Address; data?: `0x${string}`; value?: bigint }[] = [];

    if (token === 'MON') {
      // Native MON transfer (value call) [web:100]
      calls.push({ to, value });
    } else {
      // ERC-20 transfer via calldata [web:95][web:102]
      const tokenAddress = (token === 'sMON' ? CONTRACTS.KINTSU : CONTRACTS.GMON) as Address;
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [to, value],
      });
      calls.push({ to: tokenAddress, data });
    }

    const userOpHash = await client.sendUserOperation({ calls }); // Submit AA batch [web:100][web:104]
    log(`[UO] userOpHash: ${userOpHash}`);

    const settled = await settleUserOperation(userOpHash); // Resolve to tx [web:100][web:109]
    log(`[TX] transactionHash: ${settled.transactionHash} block: ${settled.blockNumber}`);

    if (opId) endLog(opId);

    return NextResponse.json({
      ok: true,
      userOpHash,
      transactionHash: settled.transactionHash,
      blockNumber: settled.blockNumber?.toString() || null,
    });
  } catch (e: any) {
    if (opId) {
      emitLog(opId, `Error: ${e?.message ?? String(e)}`);
      endLog(opId);
    }
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
