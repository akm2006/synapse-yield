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

    session.siwe = fields;
    await session.save();

    // Return the real response object that now contains the updated session cookie
    return NextResponse.json({ ok: true }, res);

  } catch (error) {
    console.error(error);
    return new NextResponse(String(error), { status: 500 });
  }
}