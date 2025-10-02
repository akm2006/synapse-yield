// src/app/api/tx/fund-smart-account/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { parseUnits, type Address } from 'viem';
import { serverWalletClient, serverPublicClient } from '@/lib/smartAccountClient';

export async function POST(req: Request) {
  try {
    const { to, amount } = (await req.json()) as { to: Address; amount: string };
    if (!to || !amount) {
      return NextResponse.json({ ok: false, error: 'Missing to/amount' }, { status: 400 });
    }
    const value = parseUnits(amount, 18);
    const hash = await serverWalletClient.sendTransaction({ to, value });
    const receipt = await serverPublicClient.waitForTransactionReceipt({ hash });
    return NextResponse.json({ ok: true, hash, blockNumber: receipt.blockNumber.toString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
