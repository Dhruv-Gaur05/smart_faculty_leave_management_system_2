import { NextRequest, NextResponse } from 'next/server';
import { calculateLeaveDaysWithCalendar } from '@/lib/supabase/calendar';

export async function POST(req: NextRequest) {
  try {
    const { fromDate, toDate, leaveType } = await req.json();

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { success: false, error: 'From Date and To Date are required' },
        { status: 400 }
      );
    }

    const result = await calculateLeaveDaysWithCalendar(fromDate, toDate, leaveType);
    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to calculate leave days';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
