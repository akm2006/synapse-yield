// src/app/api/auth/verify/route.ts
import { SiweMessage } from 'siwe';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session'; // Import SessionData
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  // Pass SessionData as a generic type
  const session = await getIronSession<SessionData>(req, new NextResponse(), sessionOptions);
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return new NextResponse('Verification failed.', { status: 500 });
  }
}