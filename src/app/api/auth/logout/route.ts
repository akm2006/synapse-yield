// src/app/api/auth/logout/route.ts
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const res = new NextResponse();
    const session = await getIronSession(req, res, sessionOptions);
    
    // Destroy the session
    session.destroy();
    
    console.log('Session destroyed during logout');
    
    // Create response and preserve the Set-Cookie header that destroys the session
    const response = NextResponse.json({ ok: true });
    const setCookieHeader = res.headers.get('set-cookie');
    if (setCookieHeader) {
      response.headers.set('set-cookie', setCookieHeader);
    }
    
    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    // Still return success to allow client-side cleanup to proceed
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}