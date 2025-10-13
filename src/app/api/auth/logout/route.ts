// src/app/api/auth/logout/route.ts
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const session = await getIronSession(req, new NextResponse(), sessionOptions);
    session.destroy();
    return NextResponse.json({ ok: true });
}