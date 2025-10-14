// src/app/api/keeper/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runKeeper } from '@/scripts/keeper';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const result = await runKeeper();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Keeper API route error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}