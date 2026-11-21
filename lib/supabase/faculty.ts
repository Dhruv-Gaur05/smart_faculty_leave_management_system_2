import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Profile, LeaveTypeRow, LeaveApplication, LeaveApplicationStatus, Approval } from '@/types/database';

export interface DetailedLeaveApplication extends LeaveApplication {
  leave_type?: LeaveTypeRow;
  approvals?: (Approval & {
    approver?: {
      name: string;
      designation: string;
      role?: string;
    };
  })[];
}

export interface FacultyProfileWithDept extends Profile {
  department_name?: string;
}

// Fallback seed leave types in case the table is empty or during local demo mode
const DEFAULT_LEAVE_TYPES: LeaveTypeRow[] = [
  {
    id: 'lt-cl',
    name: 'Casual Leave (CL)',
    description: 'Leave for unforeseen personal circumstances and short absences.',
    requires_document: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'lt-el',
    name: 'Earned Leave (EL)',
    description: 'Leaves earned through continuous service for extended vacation or personal commitments.',
    requires_document: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'lt-ml',
    name: 'Medical Leave (ML)',
    description: 'Leave on health grounds, requiring medical documentation from a certified practitioner.',
    requires_document: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'lt-dl',
    name: 'Duty Leave (DL)',
    description: 'Leave for official university assignments, conference presentation, or symposia.',
    requires_document: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'lt-scl',
    name: 'Special Casual Leave (SCL)',
    description: 'Leave for academic governance, sports, or specialized research activities.',
    requires_document: false,
    created_at: new Date().toISOString(),
  },
];

const LOCAL_STORAGE_PREFIX = 'university_faculty_applications_';

export interface FacultyLeaveBalanceItem {
  id?: string;
  type: string;
  shortCode: string;
  total: number;
  used: number;
  pending: number;
  remaining: number;
  border: string;
}

export const ANNUAL_LEAVE_QUOTAS: Record<string, { total: number; border: string; shortCode: string }> = {
  'Casual Leave (CL)': { total: 12, border: 'border-t-blue-900', shortCode: 'CL' },
  'Earned Leave (EL)': { total: 15, border: 'border-t-emerald-800', shortCode: 'EL' },
  'Medical Leave (ML)': { total: 10, border: 'border-t-amber-700', shortCode: 'ML' },
  'Duty Leave (DL)': { total: 10, border: 'border-t-indigo-900', shortCode: 'DL' },
  'Special Casual Leave (SCL)': { total: 10, border: 'border-t-purple-800', shortCode: 'SCL' },
};

/**
 * Dynamically compute official annual leave balances for a faculty member.
 * For any newly created faculty account with 0 applications, used days are strictly 0
 * and all entitlement days are 100% available without any unwarranted reductions.
 */
export function computeFacultyLeaveBalances(
  leaveTypes: LeaveTypeRow[],
  applications: DetailedLeaveApplication[]
): FacultyLeaveBalanceItem[] {
  const typesToUse = leaveTypes && leaveTypes.length > 0 ? leaveTypes : DEFAULT_LEAVE_TYPES;

  return typesToUse.map((lt) => {
    const quotaInfo = ANNUAL_LEAVE_QUOTAS[lt.name] || {
      total: 12,
      border: 'border-t-blue-900',
      shortCode: lt.name.replace(/[^A-Z]/g, '').slice(0, 3) || 'LV',
    };

    // Only approved leaves count as consumed
    const usedDays = (applications || [])
      .filter((app) => {
        if (app.status !== 'approved') return false;
        return app.leave_type_id === lt.id || app.leave_type?.name === lt.name;
      })
      .reduce((sum, app) => sum + Number(app.days || 0), 0);

    // Leaves currently in review
    const pendingDays = (applications || [])
      .filter((app) => {
        if (app.status !== 'pending' && app.status !== 'clarification') return false;
        return app.leave_type_id === lt.id || app.leave_type?.name === lt.name;
      })
      .reduce((sum, app) => sum + Number(app.days || 0), 0);

    const remaining = Math.max(0, quotaInfo.total - usedDays);

    return {
      id: lt.id,
      type: lt.name,
      shortCode: quotaInfo.shortCode,
      total: quotaInfo.total,
      used: usedDays,
      pending: pendingDays,
      remaining,
      border: quotaInfo.border,
    };
  });
}

/**
 * Fetch faculty profile along with department name from Supabase.
 */
export async function getFacultyProfile(facultyId: string): Promise<FacultyProfileWithDept | null> {
  const isLive = isSupabaseConfigured();

  if (isLive) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, departments:department_id(department_name)')
        .eq('id', facultyId)
        .single();

      if (!error && data) {
        const deptName = (data.departments as { department_name?: string } | null)?.department_name || 'Academic Department';
        return {
          ...data,
          department_name: deptName,
        } as FacultyProfileWithDept;
      }
    } catch (err) {
      console.error('Error fetching faculty profile from Supabase:', err);
    }
  }

  return null;
}

/**
 * Fetch available leave categories from Supabase leave_types table.
 */
export async function getLeaveTypes(): Promise<LeaveTypeRow[]> {
  const isLive = isSupabaseConfigured();

  if (isLive) {
    try {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as LeaveTypeRow[];
      }
    } catch (err) {
      console.warn('Could not fetch leave types from Supabase, using defaults:', err);
    }
  }

  return DEFAULT_LEAVE_TYPES;
}

/**
 * Fetch all leave applications submitted by the logged-in faculty member ONLY.
 * Strictly enforces that no other faculty records are returned.
 */
export async function getFacultyApplications(facultyId: string): Promise<DetailedLeaveApplication[]> {
  const isLive = isSupabaseConfigured();

  if (isLive) {
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .select(`
          *,
          leave_types (
            id,
            name,
            description,
            requires_document
          ),
          approvals (
            id,
            leave_id,
            approver_id,
            action,
            remarks,
            action_time
          )
        `)
        .eq('faculty_id', facultyId)
        .order('submitted_at', { ascending: false });

      if (!error && data) {
        return data.map((item) => ({
          ...item,
          leave_type: item.leave_types as unknown as LeaveTypeRow,
          approvals: (item.approvals || []) as unknown as Approval[],
        })) as DetailedLeaveApplication[];
      }

      if (error) {
        console.error('Supabase getFacultyApplications error:', error.message);
      }
    } catch (err) {
      console.error('Failed to load applications from Supabase:', err);
    }
  }

  // Local demo fallback if not connected to live Supabase
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${facultyId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed as DetailedLeaveApplication[];
        }
      } catch (e) {
        console.error('Failed to parse local demo applications:', e);
      }
    }
  }

  return [];
}

/**
 * Fetch a single leave application by ID, strictly verifying ownership by facultyId.
 */
export async function getFacultyApplicationById(
  applicationId: string,
  facultyId: string
): Promise<DetailedLeaveApplication | null> {
  const isLive = isSupabaseConfigured();

  if (isLive) {
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .select(`
          *,
          leave_types (
            id,
            name,
            description,
            requires_document
          ),
          approvals (
            id,
            leave_id,
            approver_id,
            action,
            remarks,
            action_time
          )
        `)
        .eq('id', applicationId)
        .eq('faculty_id', facultyId)
        .single();

      if (!error && data) {
        return {
          ...data,
          leave_type: data.leave_types as unknown as LeaveTypeRow,
          approvals: (data.approvals || []) as unknown as Approval[],
        } as DetailedLeaveApplication;
      }
    } catch (err) {
      console.error('Error fetching application by ID:', err);
    }
  }

  // Local storage fallback for demo testing
  if (typeof window !== 'undefined') {
    const apps = await getFacultyApplications(facultyId);
    const found = apps.find((a) => a.id === applicationId && a.faculty_id === facultyId);
    return found || null;
  }

  return null;
}

/**
 * Submit a new leave application to Supabase.
 */
export async function submitLeaveApplication(params: {
  facultyId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  contactDuringLeave?: string;
}): Promise<{ data: DetailedLeaveApplication | null; error: Error | null }> {
  const isLive = isSupabaseConfigured();

  const applicationPayload = {
    faculty_id: params.facultyId,
    leave_type_id: params.leaveTypeId,
    from_date: params.fromDate,
    to_date: params.toDate,
    days: params.days,
    reason: params.reason.trim(),
    contact_during_leave: params.contactDuringLeave?.trim() || null,
    status: 'pending' as LeaveApplicationStatus,
  };

  if (isLive) {
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .insert([applicationPayload])
        .select(`
          *,
          leave_types (
            id,
            name,
            description,
            requires_document
          )
        `)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const created: DetailedLeaveApplication = {
        ...data,
        leave_type: data.leave_types as unknown as LeaveTypeRow,
        approvals: [],
      };

      return { data: created, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to submit application to Supabase.'),
      };
    }
  }

  // Demo fallback
  try {
    const leaveTypes = await getLeaveTypes();
    const selectedType = leaveTypes.find((t) => t.id === params.leaveTypeId) || DEFAULT_LEAVE_TYPES[0];

    const randomId = `LV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const created: DetailedLeaveApplication = {
      id: randomId,
      faculty_id: params.facultyId,
      leave_type_id: params.leaveTypeId,
      from_date: params.fromDate,
      to_date: params.toDate,
      days: params.days,
      reason: params.reason.trim(),
      contact_during_leave: params.contactDuringLeave?.trim() || null,
      status: 'pending',
      submitted_at: nowIso,
      updated_at: nowIso,
      leave_type: selectedType,
      approvals: [],
    };

    if (typeof window !== 'undefined') {
      const existing = await getFacultyApplications(params.facultyId);
      const updated = [created, ...existing];
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${params.facultyId}`, JSON.stringify(updated));
    }

    return { data: created, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Demo submission failed.'),
    };
  }
}

/**
 * Respond to an HOD clarification request by sending a message and returning
 * the leave application back to 'pending' review status.
 */
export async function respondToClarification(
  applicationId: string,
  message: string,
  accessToken?: string
): Promise<{ success: boolean; error: string | null }> {
  const isLive = isSupabaseConfigured();

  if (isLive && accessToken) {
    try {
      const res = await fetch('/api/faculty/clarification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          applicationId,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to submit clarification response.' };
      }

      return { success: true, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error submitting clarification.';
      return { success: false, error: msg };
    }
  }

  // Demo fallback
  return { success: true, error: null };
}
