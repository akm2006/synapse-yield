// src/app/api/tx/magma/stake/route.ts - DEPRECATED ROUTE
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  console.warn('⚠️  DEPRECATED: /api/tx/magma/stake is deprecated. Use /api/delegate/execute instead.');
  
  return NextResponse.json({
    ok: false,
    error: '🔒 SECURITY: Direct EOA usage disabled. Use delegation flow instead.',
    deprecated: true,
    migration: {
      newEndpoint: '/api/delegate/execute',
      operation: 'stake-magma',
      requiredFields: ['userAddress', 'operation', 'amount', 'delegation'],
      securityImprovement: 'Private keys are now server-side only with delegation-based permissions.',
      example: {
        method: 'POST',
        url: '/api/delegate/execute',
        body: {
          userAddress: 'USER_SMART_ACCOUNT_ADDRESS',
          operation: 'stake-magma',
          amount: '0.01',
          delegation: 'SIGNED_DELEGATION_OBJECT'
        }
      }
    }
  }, { status: 410 }); // Gone - Permanently removed
}

export async function GET() {
  return NextResponse.json({
    deprecated: true,
    message: 'This endpoint has been replaced by the secure delegation flow',
    newEndpoint: '/api/delegate/execute',
    securityNotice: 'Private keys are no longer exposed to frontend for enhanced security'
  }, { status: 410 });
}