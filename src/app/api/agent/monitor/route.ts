// src/app/api/agent/monitor/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkAndCompleteUnlocks, getUnlockHistory } from '@/lib/agent/unlockTracker';

export async function GET(request: NextRequest) {
  try {
    const completedUnlocks = await checkAndCompleteUnlocks();
    const history = getUnlockHistory();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      completedUnlocks: completedUnlocks.length,
      pendingUnlocks: history.filter(u => u.status === 'pending').length,
      history: history.slice(0, 10) // Last 10 requests
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'check_unlocks') {
      const completed = await checkAndCompleteUnlocks();
      return NextResponse.json({
        success: true,
        message: `Processed ${completed.length} unlock completions`,
        completed
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Unknown action'
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false, 
      error: error.message
    }, { status: 500 });
  }
}
