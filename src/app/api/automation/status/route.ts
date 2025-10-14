// src/app/api/automation/status/route.ts
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

  // 1. Verify Authentication
  if (!session.siwe) {
    return NextResponse.json(
      { automationEnabled: false },
      { status: 401, statusText: 'Unauthorized' }
    );
  }

  try {
    await dbConnect();
    const userAddress = session.siwe.address;
    const user = await User.findOne({ address: userAddress }).lean(); // .lean() is faster for read-only

    if (!user) {
      return NextResponse.json(
        { automationEnabled: false },
        { status: 404, statusText: 'User not found' }
      );
    }

    return NextResponse.json({
      ok: true,
      automationEnabled: user.automationEnabled || false,
    });
  } catch (error) {
    console.error('Failed to get automation status:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}