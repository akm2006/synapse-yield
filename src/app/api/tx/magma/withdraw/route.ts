// src/app/api/tx/magma/withdraw/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { Address } from 'viem';
import { encodeFunctionData, parseUnits } from 'viem';
import { getAAClient, settleUserOperation } from '@/lib/aaClient';
import { magmaAbi } from '@/lib/abis';
import { CONTRACTS } from '@/lib/contracts';
import { emitLog, endLog } from '@/lib/logBus';

export async function POST(req: Request) {
  let opId: string | undefined;
  try {
    const { amount, opId: requestOpId } = await req.json();
    opId = requestOpId;
    const value = parseUnits(amount, 18);

    const log = (m: string) => opId ? emitLog(opId, m) : console.log(m);

    log(`Withdrawing ${amount} gMON from Magma`);

    const { client } = await getAAClient();
    const data = encodeFunctionData({
      abi: magmaAbi,
      functionName: 'withdrawMon',
      args: [value],
    });

    const userOpHash = await client.sendUserOperation({
      calls: [{ to: CONTRACTS.MAGMA_STAKE as Address, data }],
    });

    log(`Withdraw submitted: ${userOpHash}`);
    const settled = await settleUserOperation(userOpHash);
    log(`Withdraw confirmed: ${settled.transactionHash} at block ${settled.blockNumber}`);

    if (opId) endLog(opId);

    return NextResponse.json({
      ok: true,
      userOpHash,
      transactionHash: settled.transactionHash,
      blockNumber: settled.blockNumber ? settled.blockNumber.toString() : null,
    });
  } catch (e: any) {
    if (opId) {
      emitLog(opId, `Error: ${e?.message ?? String(e)}`);
      endLog(opId);
    }
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
