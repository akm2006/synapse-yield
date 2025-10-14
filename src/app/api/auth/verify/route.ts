// src/app/api/auth/verify/route.ts
import { SiweMessage } from 'siwe';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  // Create the response object first
  const res = new NextResponse();
  
  // Pass the real response object to getIronSession
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  
  const { message, signature } = await req.json();

  try {
    if (!session.nonce) {
      return new NextResponse('Nonce not found. Request a new nonce first.', { status: 401 });
    }

    const siweMessage = new SiweMessage(message);
    const { data: fields } = await siweMessage.verify({
      signature,
      nonce: session.nonce,
    });

    if (fields.nonce !== session.nonce) {
      return new NextResponse('Invalid nonce.', { status: 422 });
    }

    await dbConnect();
    let user = await User.findOne({ address: fields.address });
    if (!user) {
      user = new User({ address: fields.address });
      await user.save();
    }

    // Store the SIWE message in the session
    session.siwe = fields;
    
    // Clear the nonce after use (security best practice)
    session.nonce = undefined;
    
    await session.save();

    // Create a new response with the session data
    const response = NextResponse.json({ ok: true });
    
    // Copy the Set-Cookie header from the session response to our new response
    const setCookieHeader = res.headers.get('set-cookie');
    if (setCookieHeader) {
      response.headers.set('set-cookie', setCookieHeader);
    }

    return response;

  } catch (error) {
    console.error('Verification error:', error);
    
    // Return error response with Set-Cookie header to clear any partial session
    const errorResponse = new NextResponse(
      JSON.stringify({ error: 'Verification failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
    
    const setCookieHeader = res.headers.get('set-cookie');
    if (setCookieHeader) {
      errorResponse.headers.set('set-cookie', setCookieHeader);
    }
    
    return errorResponse;
  }
}