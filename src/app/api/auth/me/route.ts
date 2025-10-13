// src/app/api/auth/me/route.ts
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session'; // Import SessionData
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    // Pass SessionData as a generic type
    const session = await getIronSession<SessionData>(req, new NextResponse(), sessionOptions);

    if (session.siwe) {
        return NextResponse.json(session.siwe);
    }

    return new NextResponse('Unauthorized', { status: 401 });
}