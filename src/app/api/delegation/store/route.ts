// src/app/api/delegation/store/route.ts
import { getIronSession } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';
import { sessionOptions, SessionData } from '@/lib/session';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(req, new NextResponse(), sessionOptions);

  // 1. Verify Authentication: Ensure the user is signed in.
  if (!session.siwe) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const delegation = await req.json();

    // Basic validation for the delegation object
    if (!delegation || !delegation.signature) {
      return new NextResponse('Invalid delegation object provided.', { status: 400 });
    }

    await dbConnect();

    // 2. Find User and Update Delegation
    const userAddress = session.siwe.address;
    const updatedUser = await User.findOneAndUpdate(
      { address: userAddress },
      { $set: { delegation: delegation } },
      { new: true, upsert: true } // Upsert ensures a user is created if they don't exist
    );

    if (!updatedUser) {
      return new NextResponse('User not found.', { status: 404 });
    }

    console.log(`Delegation stored for user: ${userAddress}`);
    return NextResponse.json({ ok: true, message: 'Delegation stored successfully.' });

  } catch (error) {
    console.error('Failed to store delegation:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new NextResponse(errorMessage, { status: 500 });
  }
}