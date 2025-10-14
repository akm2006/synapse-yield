// src/app/api/automation/toggle/route.ts
import { getIronSession } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';
import { sessionOptions, SessionData } from '@/lib/session';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(
    req,
    new NextResponse(),
    sessionOptions
  );

  // 1. Verify Authentication
  if (!session.siwe) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { isEnabled } = await req.json();

    // 2. Validate Input
    if (typeof isEnabled !== 'boolean') {
      return new NextResponse('Invalid input: "isEnabled" must be a boolean.', {
        status: 400,
      });
    }

    await dbConnect();

    // 3. Find User and Update Status
    const userAddress = session.siwe.address;
    const updatedUser = await User.findOneAndUpdate(
      { address: userAddress },
      { $set: { automationEnabled: isEnabled } },
      { new: true } // 'new: true' returns the updated document
    );

    if (!updatedUser) {
      return new NextResponse('User not found.', { status: 404 });
    }

    const status = updatedUser.automationEnabled ? 'enabled' : 'disabled';
    console.log(`Automation ${status} for user: ${userAddress}`);
    
    return NextResponse.json({
      ok: true,
      message: `Automation successfully ${status}.`,
      automationEnabled: updatedUser.automationEnabled,
    });
  } catch (error) {
    console.error('Failed to toggle automation:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return new NextResponse(errorMessage, { status: 500 });
  }
}