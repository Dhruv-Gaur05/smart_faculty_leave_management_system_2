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
