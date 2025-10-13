// src/app/api/delegation/get/route.ts
import { getIronSession } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';
import { sessionOptions, SessionData } from '@/lib/session';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  const session = await getIronSession<SessionData>(req, new NextResponse(), sessionOptions);

  if (!session.siwe) {
    return NextResponse.json({ hasDelegation: false });
  }

  try {
    await dbConnect();
    const user = await User.findOne({ address: session.siwe.address });

    if (user && user.delegation) {
      return NextResponse.json({ hasDelegation: true });
    }

    return NextResponse.json({ hasDelegation: false });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}