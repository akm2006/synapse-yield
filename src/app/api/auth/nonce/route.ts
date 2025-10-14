// src/app/api/auth/nonce/route.ts
import { getIronSession } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';
import { generateNonce } from 'siwe';
import { sessionOptions, SessionData } from '@/lib/session';

export async function GET(req: NextRequest) {
  // Create the response object first - this will be returned to client
  const res = new NextResponse();
  
  // Pass the response object to getIronSession
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  session.nonce = generateNonce();
  await session.save();

  // Modify the response body while preserving the Set-Cookie header
  res.headers.set('Content-Type', 'text/plain');
  
  // Return the modified response with the nonce
  return new NextResponse(session.nonce, {
    status: 200,
    headers: res.headers,
  });
}