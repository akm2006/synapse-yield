// src/app/api/agent/metrics/route.ts
import { NextResponse } from 'next/server';
import { getAllMetrics } from '@/lib/agent/metrics';
import { toJSONSafe } from '@/lib/agent/serialize';

const json = (v: any, init?: ResponseInit) =>
  NextResponse.json(toJSONSafe(v), init);

export async function GET() {
  try {
    const metrics = await getAllMetrics();
    
    return json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return json(
      { 
        success: false, 
        error: error.message ?? String(error) 
      },
      { status: 500 }
    );
  }
}
