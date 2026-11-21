import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DepartmentSummary } from '@/types';
import { UserRole } from '@/types/database';

export interface AdminSystemStats {
  totalDepartments: number;
  totalHods: number;
  totalFaculty: number;
  activeLeavesToday: number;
  databaseStatus: string;
}

export interface StaffMember {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  department_id: string | null;
  department_name: string;
  designation: string;
  role: UserRole;
  created_at: string;
}

export interface CreateStaffAccountPayload {
  name: string;
  email: string;
  password: string;
  employeeId: string;
  designation: string;
  role: 'hod' | 'faculty';
  departmentId: string;
}

/**
 * Fetch all university departments along with HOD name and faculty counts.
 * Prioritizes privileged server API route when accessToken is provided to bypass RLS.
 */
export async function getAdminDepartments(accessToken?: string): Promise<DepartmentSummary[]> {
  const isLive = isSupabaseConfigured();
  if (!isLive) return [];

  // 1. Try privileged server API route if accessToken is available
  if (accessToken) {
    try {
      const res = await fetch('/api/admin/departments', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.departments && Array.isArray(data.departments)) {
          return data.departments as DepartmentSummary[];
        }
      }
    } catch (apiErr) {
      console.warn('Could not fetch departments via server API, using direct query fallback:', apiErr);
    }
  }

  // 2. Direct database query fallback
  try {
    const { data: depts, error } = await supabase
      .from('departments')
      .select(`
        id,
        department_name,
        hod_id,
        profiles:hod_id (
          id,
          name,
          designation,
          email
        )
      `)
      .order('department_name', { ascending: true });

    if (error || !depts) {
      console.error('Error fetching admin departments:', error);
      return [];
    }

    // Get all HOD profiles to resolve unjoined profiles
    const { data: allHods } = await supabase
      .from('profiles')
      .select('id, name, email, designation, department_id, role')
      .eq('role', 'hod');

    // Get faculty count per department
    const { data: facultyMembers } = await supabase
      .from('profiles')
      .select('department_id')
      .eq('role', 'faculty');

    // Get active leaves today
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: activeLeaves } = await supabase
      .from('leave_applications')
      .select('id, faculty_id, profiles:faculty_id(department_id)')
      .eq('status', 'approved')
      .lte('from_date', todayStr)
      .gte('to_date', todayStr);

    return depts.map((d) => {
      const deptFaculty = (facultyMembers || []).filter((f) => f.department_id === d.id).length;
      const deptActiveLeaves = (activeLeaves || []).filter((l) => {
        const prof = l.profiles as unknown as { department_id?: string } | null;
        return prof?.department_id === d.id;
      }).length;

      const joinedProfile = d.profiles as unknown as { id?: string; name?: string; email?: string } | null;
      let effectiveHodId = d.hod_id;
      let effectiveHodName = joinedProfile?.name;
      let effectiveHodEmail = joinedProfile?.email;

      // If joined profile wasn't found by hod_id, match from allHods
      if (!effectiveHodName && d.hod_id && allHods) {
        const matching = allHods.find((h) => h.id === d.hod_id);
        if (matching) {
          effectiveHodName = matching.name;
          effectiveHodEmail = matching.email;
        }
      }

      // If hod_id was null on departments, check if an HOD profile has department_id === d.id
      if (!effectiveHodName && allHods) {
        const matching = allHods.find((h) => h.department_id === d.id);
        if (matching) {
          effectiveHodId = matching.id;
          effectiveHodName = matching.name;
          effectiveHodEmail = matching.email;
        }
      }

      // Generate a short code from department name (e.g., Computer Science & Engineering -> CSE)
      const code =
        d.department_name
          .split(' ')
          .filter((w: string) => !['and', '&', 'of', 'in', 'the'].includes(w.toLowerCase()))
          .map((w: string) => w[0]?.toUpperCase())
          .join('') || 'DEPT';

      return {
        id: d.id,
        name: d.department_name,
        code,
        hodId: effectiveHodId || null,
        hodName: effectiveHodName || 'To Be Assigned',
        hodEmail: effectiveHodEmail || null,
        totalFaculty: deptFaculty,
        activeLeavesToday: deptActiveLeaves,
      };
    });
  } catch (err) {
    console.error('Exception in getAdminDepartments:', err);
    return [];
  }
}

/**
 * Fetch ALL university HODs, Faculty members, and Admins with department names
 */
export async function getAllStaffMembers(): Promise<StaffMember[]> {
  const isLive = isSupabaseConfigured();
  if (!isLive) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        employee_id,
        name,
        email,
        department_id,
        designation,
        role,
        created_at,
        departments:department_id (
          department_name
        )
      `)
      .order('role', { ascending: true })
      .order('name', { ascending: true });

    if (error || !data) {
      console.error('Error fetching all staff members:', error);
      return [];
    }

    return data.map((row) => {
      const deptObj = row.departments as unknown as { department_name?: string } | null;
      return {
        id: row.id,
        employee_id: row.employee_id,
        name: row.name,
        email: row.email,
        department_id: row.department_id,
        department_name: deptObj?.department_name || (row.role === 'admin' ? 'Central Administration' : 'Unassigned'),
        designation: row.designation,
        role: row.role as UserRole,
        created_at: row.created_at,
      };
    });
  } catch (err) {
    console.error('Exception in getAllStaffMembers:', err);
    return [];
  }
}

/**
 * Create a new academic department directly via authenticated Admin RLS policy
 */
export async function createDepartment(
  departmentName: string
): Promise<{ data: { id: string; department_name: string } | null; error: string | null }> {
  const trimmed = departmentName.trim();
  if (!trimmed) {
    return { data: null, error: 'Department name is required.' };
  }

  const isLive = isSupabaseConfigured();
  if (!isLive) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('departments')
      .insert([{ department_name: trimmed }])
      .select('id, department_name')
      .single();

    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        return { data: null, error: `Department "${trimmed}" already exists.` };
      }
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create department.',
    };
  }
}

/**
 * Assign an existing HOD profile to a department.
 * Uses privileged server API route when accessToken is provided to ensure full consistency.
 */
export async function assignDepartmentHod(
  departmentId: string,
  hodProfileId: string,
  accessToken?: string
): Promise<{ success: boolean; error: string | null }> {
  if (!departmentId || !hodProfileId) {
    return { success: false, error: 'Both department and HOD selection are required.' };
  }

  if (accessToken) {
    try {
      const res = await fetch('/api/admin/departments/assign-hod', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          departmentId,
          hodId: hodProfileId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to appoint HOD.' };
      }
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error assigning HOD.',
      };
    }
  }

  try {
    const { error: deptErr } = await supabase
      .from('departments')
      .update({ hod_id: hodProfileId })
      .eq('id', departmentId);

    if (deptErr) {
      return { success: false, error: deptErr.message };
    }

    const { error: profErr } = await supabase
      .from('profiles')
      .update({ department_id: departmentId, role: 'hod' })
      .eq('id', hodProfileId);

    if (profErr) {
      return { success: false, error: profErr.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to assign HOD to department.',
    };
  }
}

/**
 * Check if server-side user provisioning (SUPABASE_SERVICE_ROLE_KEY) is ready
 */
export async function checkUserProvisioningStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/users/create', { method: 'GET', cache: 'no-store' });
    if (!res.ok) return false;
    const data = (await res.json()) as { serviceRoleConfigured?: boolean };
    return Boolean(data.serviceRoleConfigured);
  } catch {
    return false;
  }
}

/**
 * Provision a new HOD or Faculty account via the secure Next.js API Route
 */
export async function createStaffAccount(
  accessToken: string | undefined,
  payload: CreateStaffAccountPayload
): Promise<{ success: boolean; message?: string; error?: string; code?: string }> {
  if (!accessToken) {
    return {
      success: false,
      error: 'Active authenticated session token is missing. Please sign in again.',
    };
  }

  try {
    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as {
      message?: string;
      error?: string;
      code?: string;
    };

    if (!res.ok) {
      return {
        success: false,
        error: data.error || `Failed to create account (HTTP ${res.status}).`,
        code: data.code,
      };
    }

    return {
      success: true,
      message: data.message || 'Account created successfully.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error calling provisioning API.',
    };
  }
}

/**
 * Fetch overall university administration metrics
 */
export async function getAdminSystemStats(): Promise<AdminSystemStats> {
  const isLive = isSupabaseConfigured();
  if (!isLive) {
    return {
      totalDepartments: 4,
      totalHods: 4,
      totalFaculty: 92,
      activeLeavesToday: 6,
      databaseStatus: 'Demo Mode',
    };
  }

  try {
    const { count: deptCount } = await supabase
      .from('departments')
      .select('id', { count: 'exact', head: true });

    const { count: hodCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'hod');

    const { count: facultyCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'faculty');

    const todayStr = new Date().toISOString().split('T')[0];
    const { count: leavesTodayCount } = await supabase
      .from('leave_applications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .lte('from_date', todayStr)
      .gte('to_date', todayStr);

    return {
      totalDepartments: deptCount ?? 0,
      totalHods: hodCount ?? 0,
      totalFaculty: facultyCount ?? 0,
      activeLeavesToday: leavesTodayCount ?? 0,
      databaseStatus: 'Active & Verified (RLS Protected)',
    };
  } catch {
    return {
      totalDepartments: 0,
      totalHods: 0,
      totalFaculty: 0,
      activeLeavesToday: 0,
      databaseStatus: 'Active (Supabase)',
    };
  }
}
