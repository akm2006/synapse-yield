// src/app/api/auth/me/route.ts
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  if (session.siwe) {
    // Return response with session cookie headers preserved
    const response = NextResponse.json(session.siwe);
    
    // Copy Set-Cookie header from session response
    const setCookieHeader = res.headers.get('set-cookie');
    if (setCookieHeader) {
      response.headers.set('set-cookie', setCookieHeader);
    }
    
    return response;
  }

  return new NextResponse('Unauthorized', { status: 401 });
}