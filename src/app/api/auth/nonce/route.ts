// src/app/api/auth/nonce/route.ts
import { SiweMessage } from 'siwe';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session'; // Import SessionData
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Pass SessionData as a generic type
  const session = await getIronSession<SessionData>(req, new NextResponse(), sessionOptions);

  const nonce = new SiweMessage({
    domain: new URL(req.url).hostname,
    address: '0x0000000000000000000000000000000000000000',
    statement: 'Sign in to Synapse Yield',
    uri: new URL(req.url).origin,
    version: '1',
    chainId: 1,
  }).nonce;

  session.nonce = nonce;
  await session.save();

  return NextResponse.json({ nonce });
}