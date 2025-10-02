// src/app/api/tx/kintsu/redeem/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { encodeFunctionData } from 'viem';
import { getAAClient, settleUserOperation } from '@/lib/aaClient';
import { kintsuAbi } from '@/lib/abis';
import { CONTRACTS } from '@/lib/contracts';
import { emitLog, endLog } from '@/lib/logBus';

export async function POST(req: Request) {
  let opId: string | undefined;
  try {
    const { unlockIndex, receiver, opId: requestOpId } = await req.json();
    opId = requestOpId;

    const log = (m: string) => opId ? emitLog(opId, m) : console.log(m);

    log(`Redeeming unlock index ${unlockIndex} to ${receiver}`);

    const { client } = await getAAClient();
    const data = encodeFunctionData({
      abi: kintsuAbi,
      functionName: 'redeem',
      args: [BigInt(unlockIndex), receiver],
    });

    const userOpHash = await client.sendUserOperation({
      calls: [{ to: CONTRACTS.KINTSU, data }],
    });

    log(`Redeem submitted: ${userOpHash}`);
    const settled = await settleUserOperation(userOpHash);
    log(`Redeem confirmed: ${settled.transactionHash}`);

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
