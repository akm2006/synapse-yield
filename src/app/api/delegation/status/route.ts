// src/app/api/delegation/status/route.ts
import { getIronSession } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';
import { sessionOptions, SessionData } from '@/lib/session';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  const session = await getIronSession<SessionData>(
    req,
    new NextResponse(),
    sessionOptions
  );

  if (!session.siwe) {
    // If user is not logged in, they don't have a delegation
    return NextResponse.json({ hasDelegation: false });
  }

  try {
    await dbConnect();
    const user = await User.findOne({ address: session.siwe.address }).lean();

    // Check if the user exists and the delegation field is not null/empty
    if (user && user.delegation && Object.keys(user.delegation).length > 0) {
      return NextResponse.json({ hasDelegation: true });
    }

    return NextResponse.json({ hasDelegation: false });
  } catch (error) {
    console.error('Failed to get delegation status:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}