import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import type { Address } from 'viem';
import { executeDelegatedOperation } from '@/lib/execution';

export async function POST(request: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<SessionData>(request, res, sessionOptions);

  // 1. Authenticate the user's EOA via the secure session.
  if (!session.siwe) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    // As per your frontend code, 'userAddress' is the Smart Account address.
    const { userAddress } = body;

    // The userAddress (Smart Account) is critical for on-chain logic.
    if (!userAddress) {
        return new NextResponse('`userAddress` (Smart Account address) is required in the request body.', { status: 400 });
    }

    // 2. Use the authenticated EOA to find the user and their delegation in the DB.
    await dbConnect();
    const user = await User.findOne({ address: session.siwe.address });

    if (!user || !user.delegation) {
      return new NextResponse(
        'Delegation not found for this user. Please create a delegation first.',
        { status: 403 }
      );
    }

    // 3. Call the execution library, passing the Smart Account address from the body.
    // This perfectly replicates the logic of your original, working code.
    const result = await executeDelegatedOperation(
      user.delegation,
      body,
      userAddress as Address // Pass the correct Smart Account address
    );

    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Failed to execute operation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to execute operation',
        operations: [],
        approvalsSent: 0,
        mainCallsSent: 0,
      },
      { status: 500 }
    );
  }
}
