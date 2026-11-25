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
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to calculate leave days' },
      { status: 500 }
    );
  }
}
