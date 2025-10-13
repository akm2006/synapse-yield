// src/app/api/auth/nonce/route.ts
import { getIronSession } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';
import { generateNonce } from 'siwe';
import { sessionOptions, SessionData } from '@/lib/session';

export async function GET(req: NextRequest) {
  // Create the response object first
  const res = new NextResponse();
  
  // Pass the real response object to getIronSession
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  session.nonce = generateNonce();
  await session.save();

  // Return the response with the nonce as the body
  res.headers.set('Content-Type', 'text/plain');
  return new Response(session.nonce, { status: 200, headers: res.headers });
}