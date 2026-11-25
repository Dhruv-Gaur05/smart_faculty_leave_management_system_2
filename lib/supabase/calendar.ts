import { AcademicHoliday, LeaveCalculationResult } from '@/types';
import fs from 'fs';
import path from 'path';

// Path to persistent fallback file
const FALLBACK_FILE_PATH = path.join(process.cwd(), 'data', 'academic_holidays.json');

function readFallbackHolidays(): AcademicHoliday[] {
  try {
    if (fs.existsSync(FALLBACK_FILE_PATH)) {
      const data = fs.readFileSync(FALLBACK_FILE_PATH, 'utf-8');
      return JSON.parse(data) as AcademicHoliday[];
    }
  } catch (err) {
    console.warn('Error reading fallback academic holidays:', err);
  }
  return [];
}

function writeFallbackHolidays(holidays: AcademicHoliday[]) {
  try {
    const dir = path.dirname(FALLBACK_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(holidays, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing fallback academic holidays:', err);
  }
}

/**
 * Fetch all academic holidays
 */
export async function getAcademicHolidays(academicYear?: string): Promise<AcademicHoliday[]> {
  try {
    // Attempt Supabase fetch
    const { getSupabaseAdminClient } = await import('@/lib/supabase/server-admin');
    const client = getSupabaseAdminClient();
    const query = client
      .from('academic_holidays')
      .select('*')
      .order('date', { ascending: true });

    if (academicYear) {
      query.eq('academic_year', academicYear);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return (data as Array<{
        id: string;
        title: string;
        date: string;
        type: AcademicHoliday['type'];
        description?: string;
        academic_year?: string;
        created_at: string;
      }>).map((item) => ({
        id: item.id,
        title: item.title,
        date: item.date,
        type: item.type,
        description: item.description,
        academicYear: item.academic_year,
        createdAt: item.created_at,
      }));
    }
  } catch {
    // Supabase query failed or table doesn't exist yet, continue to fallback
  }

  // Fallback to local store
  const allHolidays = readFallbackHolidays();
  if (academicYear) {
    return allHolidays
      .filter((h) => !h.academicYear || h.academicYear === academicYear)
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  return allHolidays.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Save a single academic holiday
 */
export async function saveAcademicHoliday(
  holiday: Omit<AcademicHoliday, 'id' | 'createdAt'>
): Promise<AcademicHoliday> {
  const newHoliday: AcademicHoliday = {
    id: `hol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: holiday.title.trim(),
    date: holiday.date,
    type: holiday.type,
    description: holiday.description?.trim() || '',
    academicYear: holiday.academicYear || '2026-2027',
    createdAt: new Date().toISOString(),
  };

  try {
    const { getSupabaseAdminClient } = await import('@/lib/supabase/server-admin');
    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('academic_holidays')
      .upsert(
        {
          title: newHoliday.title,
          date: newHoliday.date,
          type: newHoliday.type,
          description: newHoliday.description,
          academic_year: newHoliday.academicYear,
        },
        { onConflict: 'date' }
      )
      .select()
      .single();

    if (!error && data) {
      newHoliday.id = data.id;
    }
  } catch {
    // Continue to local sync
  }

  // Always sync local fallback
  const list = readFallbackHolidays();
  const existingIdx = list.findIndex((h) => h.date === newHoliday.date);
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...newHoliday };
  } else {
    list.push(newHoliday);
  }
  writeFallbackHolidays(list);

  return newHoliday;
}

/**
 * Save multiple holidays in bulk (e.g. from PDF auto-reader)
 */
export async function saveBulkAcademicHolidays(
  holidays: Array<Omit<AcademicHoliday, 'id' | 'createdAt'>>
): Promise<AcademicHoliday[]> {
  const saved: AcademicHoliday[] = [];
  const list = readFallbackHolidays();

  for (const h of holidays) {
    const newHoliday: AcademicHoliday = {
      id: `hol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: h.title.trim(),
      date: h.date,
      type: h.type,
      description: h.description?.trim() || '',
      academicYear: h.academicYear || '2026-2027',
      createdAt: new Date().toISOString(),
    };

    try {
      const { getSupabaseAdminClient } = await import('@/lib/supabase/server-admin');
      const client = getSupabaseAdminClient();
      await client.from('academic_holidays').upsert(
        {
          title: newHoliday.title,
          date: newHoliday.date,
          type: newHoliday.type,
          description: newHoliday.description,
          academic_year: newHoliday.academicYear,
        },
        { onConflict: 'date' }
      );
    } catch {
      // Ignored for fallback
    }

    const existingIdx = list.findIndex((item) => item.date === newHoliday.date);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...newHoliday };
      saved.push(list[existingIdx]);
    } else {
      list.push(newHoliday);
      saved.push(newHoliday);
    }
  }

  writeFallbackHolidays(list);
  return saved;
}

/**
 * Delete an academic holiday
 */
export async function deleteAcademicHoliday(id: string): Promise<boolean> {
  try {
    const { getSupabaseAdminClient } = await import('@/lib/supabase/server-admin');
    const client = getSupabaseAdminClient();
    await client.from('academic_holidays').delete().eq('id', id);
  } catch {
    // Continue
  }

  const list = readFallbackHolidays();
  const filtered = list.filter((h) => h.id !== id);
  writeFallbackHolidays(filtered);
  return true;
}

/**
 * Calculate leave duration with smart calendar logic
 * E.g., for Casual Leave (CL), Sundays and Gazetted Holidays are not deducted from balance.
 * For Earned Leave (EL), continuous calendar days are counted.
 */
export async function calculateLeaveDaysWithCalendar(
  fromDateStr: string,
  toDateStr: string,
  leaveTypeName?: string
): Promise<LeaveCalculationResult> {
  const start = new Date(fromDateStr);
  const end = new Date(toDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return {
      totalDays: 0,
      workingDays: 0,
      weekendDays: 0,
      holidayDays: 0,
      holidays: [],
      details: [],
    };
  }

  // Fetch all declared holidays
  const allHolidays = await getAcademicHolidays();
  const holidayMap = new Map<string, AcademicHoliday>();
  allHolidays.forEach((h) => holidayMap.set(h.date, h));

  const details: LeaveCalculationResult['details'] = [];
  let totalDays = 0;
  let weekendDays = 0;
  let holidayDays = 0;
  const holidaysFound: AcademicHoliday[] = [];

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const cur = new Date(start);

  // Is this leave category one that deducts ONLY working days?
  // By standard Indian University ordinances: Casual Leave (CL) & Duty Leave (DL) deduct only working days.
  // Medical Leave (ML) & Earned Leave (EL) count continuous span unless specifically exempt.
  const isCasualOrDuty =
    !leaveTypeName ||
    leaveTypeName.toLowerCase().includes('casual') ||
    leaveTypeName.toLowerCase().includes('duty') ||
    leaveTypeName.toLowerCase().includes('scl');

  while (cur <= end) {
    totalDays++;
    const dateStr = cur.toISOString().split('T')[0];
    const dayOfWeek = cur.getDay(); // 0 is Sunday, 6 is Saturday
    const dayName = dayNames[dayOfWeek];
    const isWeekend = dayOfWeek === 0; // Standard academic Sunday; (and optionally Saturday)
    const holiday = holidayMap.get(dateStr);

    if (isWeekend) {
      weekendDays++;
    }
    if (holiday && !isWeekend) {
      holidayDays++;
      holidaysFound.push(holiday);
    } else if (holiday && isWeekend) {
      holidaysFound.push(holiday);
    }

    // Is this day deductible from quota?
    let isDeductible = true;
    if (isCasualOrDuty) {
      // Exclude Sundays and official holidays
      if (isWeekend || holiday) {
        isDeductible = false;
      }
    }

    details.push({
      date: dateStr,
      dayName,
      isWeekend,
      holiday,
      isDeductible,
    });

    cur.setDate(cur.getDate() + 1);
  }

  const workingDays = details.filter((d) => d.isDeductible).length;

  return {
    totalDays,
    workingDays: isCasualOrDuty ? workingDays : totalDays,
    weekendDays,
    holidayDays,
    holidays: holidaysFound,
    details,
  };
}
