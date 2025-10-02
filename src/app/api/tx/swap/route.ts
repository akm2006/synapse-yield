// src/app/api/tx/swap/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getAAClient, settleUserOperation } from '@/lib/aaClient';
import { emitLog, endLog } from '@/lib/logBus';
import type { Address } from 'viem';

export async function POST(req: Request) {
  let opId: string | undefined;
  try {
    const { calls, opId: requestOpId } = await req.json() as {
      calls: Array<{ to: Address; data: `0x${string}`; value?: bigint }>;
      opId?: string;
    };
    opId = requestOpId;

    const log = (m: string) => opId ? emitLog(opId, m) : console.log(m);

    log('[ACTION] Starting swap execution');

    const { client } = await getAAClient();
    log('[ACTION] Got AA client, sending UserOperation');

    // Remove opId from sendUserOperation - it's not a valid parameter
    const userOpHash = await client.sendUserOperation({ calls });
    log(`[UO] UserOperation submitted: ${userOpHash}`);

    const settled = await settleUserOperation(userOpHash);
    log(`[TX] Transaction confirmed: ${settled.transactionHash} at block ${settled.blockNumber}`);

    if (opId) endLog(opId);

    return NextResponse.json({
      ok: true,
      userOpHash,
      transactionHash: settled.transactionHash,
      blockNumber: settled.blockNumber?.toString() || null,
    });
  } catch (e: any) {
    if (opId) {
      emitLog(opId, `Error: ${e.message || e}`);
      endLog(opId);
    }
    return NextResponse.json(
      { ok: false, error: e.message || String(e) },
      { status: 500 }
    );
  }
}
