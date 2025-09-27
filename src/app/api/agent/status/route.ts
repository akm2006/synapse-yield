// src/app/api/agent/status/route.ts
import { NextResponse } from 'next/server';
import { EXECUTE_MODE, AGENT_PRIVATE_KEY, ENTRYPOINT_ADDRESS } from '@/lib/agent/config';
import { toJSONSafe } from '@/lib/agent/serialize';

const json = (v: any, init?: ResponseInit) =>
  NextResponse.json(toJSONSafe(v), init);

export async function GET() {
  return json({
    success: true,
    status: {
      executeMode: EXECUTE_MODE,
      hasPrivateKey: !!AGENT_PRIVATE_KEY,
      hasEntryPoint: !!ENTRYPOINT_ADDRESS,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
}
