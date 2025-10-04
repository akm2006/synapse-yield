// src/app/api/tx/wrap/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { Address } from 'viem';
import { encodeFunctionData } from 'viem';
import { getAAClient, settleUserOperation } from '@/lib/aaClient';
import { CONTRACTS } from '@/lib/contracts';
import { emitLog, endLog } from '@/lib/logBus';

const WMON_ABI = [
  { type: 'function', name: 'deposit', stateMutability: 'payable', inputs: [], outputs: [] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ name: 'wad', type: 'uint256' }], outputs: [] },
] as const;

export async function POST(req: Request) {
  let opId: string | undefined;
  try {
    const { action, amount, opId: reqOpId } = await req.json() as {
      action: 'wrap' | 'unwrap';
      amount: string;
      opId?: string;
    };
    opId = reqOpId;
    const amt = BigInt(amount);

    const { client } = await getAAClient();
    const smartAccountAddress = client.account.address;
    const log = (m: string) => opId ? emitLog(opId, m) : console.log(m);

    if (action === 'wrap') {
      log(`Wrapping ${amount} MON to WMON`);
      const data = encodeFunctionData({
        abi: WMON_ABI,
        functionName: 'deposit',
        args: [],
      });
      const userOpHash = await client.sendUserOperation({
        calls: [{ to: CONTRACTS.WMON, data, value: amt }],
      });
      log(`Wrap submitted: ${userOpHash}`);
      const settled = await settleUserOperation(userOpHash);
      log(`Wrap confirmed: ${settled.transactionHash} at block ${settled.blockNumber}`);
      if (opId) endLog(opId);

      return NextResponse.json({
        ok: true,
        userOpHash,
        transactionHash: settled.transactionHash,
        blockNumber: settled.blockNumber?.toString() || null,
      });
    } else {
      log(`Unwrapping ${amount} WMON to MON`);
      const { ensureTokenAllowancesAA } = await import('@/lib/ensureAllowancesAA');
      const approvals = await ensureTokenAllowancesAA(CONTRACTS.WMON, amt, { opId, smartAccountAddress });
      const data = encodeFunctionData({
        abi: WMON_ABI,
        functionName: 'withdraw',
        args: [amt],
      });
      const calls = [...approvals.requiredCalls, { to: CONTRACTS.WMON, data }];
      log(`Submitting ${calls.length} calls for unwrap`);
      const userOpHash = await client.sendUserOperation({ calls });
      log(`Unwrap submitted: ${userOpHash}`);
      const settled = await settleUserOperation(userOpHash);
      log(`Unwrap confirmed: ${settled.transactionHash} at block ${settled.blockNumber}`);
      if (opId) endLog(opId);

      return NextResponse.json({
        ok: true,
        userOpHash,
        transactionHash: settled.transactionHash,
        blockNumber: settled.blockNumber?.toString() || null,
        batchedCalls: calls.length,
      });
    }
  } catch (e: any) {
    if (opId) {
      emitLog(opId, `Error: ${e.message}`);
      endLog(opId);
    }
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
