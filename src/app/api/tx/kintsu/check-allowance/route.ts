// src/app/api/tx/kintsu/check-allowance/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createPublicClient, http, type Address } from 'viem';
import { permit2Abi } from '@/lib/abis';
import { CONTRACTS } from '@/lib/contracts';

const RPC = process.env.NEXT_PUBLIC_RPC_URL!;
const monadTestnet = {
  id: 10143, name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};

const publicClient = createPublicClient({ chain: monadTestnet, transport: http(RPC) });
const PERMIT2 = '0x000000000022d473030f116ddee9f6b43ac78ba3' as Address;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get('owner') as Address;
    const spender = searchParams.get('spender') as Address;
    if (!owner || !spender) {
      return NextResponse.json({ ok: false, error: 'owner and spender required' }, { status: 400 });
    }
    const [allowance, expiration] = await publicClient.readContract({
      address: PERMIT2,
      abi: permit2Abi,
      functionName: 'allowance',
      args: [owner, CONTRACTS.KINTSU as Address, spender],
    });
    return NextResponse.json({ ok: true, allowance: allowance.toString(), expiration: expiration.toString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
