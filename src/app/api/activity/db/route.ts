import { getIronSession } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';
import { sessionOptions, SessionData } from '@/lib/session';
import dbConnect from '@/lib/db';
import Activity, { IActivity } from '@/models/Activity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getIronSession<SessionData>(
    req,
    new NextResponse(),
    sessionOptions
  );

  if (!session.siwe) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await dbConnect();

    // Fetch all automated rebalance activities
    const dbActivities = await Activity.find({
      isAutomated: true,
      transactionType: 'Rebalance'
    })
      .sort({ timestamp: -1 })
      .limit(200) 
      .lean() as unknown as IActivity[];

    return NextResponse.json({ ok: true, activities: dbActivities });

  } catch (error) {
    console.error('Failed to get DB activities:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}