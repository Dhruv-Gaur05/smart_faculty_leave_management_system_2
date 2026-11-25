import { NextRequest, NextResponse } from 'next/server';
import {
  getAcademicHolidays,
  saveAcademicHoliday,
  saveBulkAcademicHolidays,
  deleteAcademicHoliday,
} from '@/lib/supabase/calendar';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get('academicYear') || undefined;

    const holidays = await getAcademicHolidays(academicYear);
    return NextResponse.json({ success: true, holidays });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch academic holidays';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if bulk insert
    if (Array.isArray(body.holidays)) {
      const saved = await saveBulkAcademicHolidays(body.holidays);
      return NextResponse.json({ success: true, count: saved.length, holidays: saved });
    }

    // Single holiday insert/update
    const { title, date, type, description, academicYear } = body;
    if (!title || !date) {
      return NextResponse.json(
        { success: false, error: 'Title and Date are required' },
        { status: 400 }
      );
    }

    const saved = await saveAcademicHoliday({
      title,
      date,
      type: type || 'gazetted',
      description,
      academicYear,
    });

    return NextResponse.json({ success: true, holiday: saved });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save academic holiday';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Holiday ID is required' },
        { status: 400 }
      );
    }

    await deleteAcademicHoliday(id);
    return NextResponse.json({ success: true, message: 'Holiday deleted successfully' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete holiday';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
