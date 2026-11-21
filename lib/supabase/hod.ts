import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { LeaveApplicationStatus } from '@/types/database';

export interface HodLeaveApplication {
  id: string;
  facultyId: string;
  facultyName: string;
  department: string;
  designation: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'Pending HOD' | 'Approved' | 'Rejected' | 'Clarification Requested';
  appliedOn: string;
  hodComment?: string;
  approvalsHistory?: Array<{
    action: string;
    remarks?: string | null;
    action_time?: string;
  }>;
}

export interface DepartmentStats {
  totalFaculty: number;
  activeLeavesToday: number;
  pendingApprovals: number;
  approvedThisMonth: number;
}

export interface DepartmentFacultyMember {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  designation: string;
  created_at: string;
}

/**
 * Fetch the HOD's own department name from Supabase
 */
export async function getHodDepartmentInfo(
  departmentId?: string | null
): Promise<{ id: string; department_name: string } | null> {
  if (!departmentId || !isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('departments')
      .select('id, department_name')
      .eq('id', departmentId)
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch faculty members belonging strictly to the HOD's department
 */
export async function getHodDepartmentFaculty(
  departmentId?: string | null
): Promise<DepartmentFacultyMember[]> {
  if (!departmentId || !isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, employee_id, name, email, designation, created_at')
      .eq('department_id', departmentId)
      .eq('role', 'faculty')
      .order('name', { ascending: true });

    if (error || !data) {
      console.error('Error fetching department faculty:', error);
      return [];
    }

    return data as DepartmentFacultyMember[];
  } catch (err) {
    console.error('Exception in getHodDepartmentFaculty:', err);
    return [];
  }
}

/**
 * Fetch all pending and recent leave applications under the HOD's department
 */
export async function getHodDepartmentApplications(): Promise<HodLeaveApplication[]> {
  const isLive = isSupabaseConfigured();
  if (!isLive) return [];

  try {
    const { data, error } = await supabase
      .from('leave_applications')
      .select(`
        id,
        faculty_id,
        from_date,
        to_date,
        days,
        reason,
        status,
        submitted_at,
        leave_types ( name ),
        profiles:faculty_id (
          name,
          employee_id,
          designation,
          department_id,
          departments:department_id ( department_name )
        ),
        approvals ( action, remarks, action_time )
      `)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications for HOD:', error);
      return [];
    }

    if (!data) return [];

    return data.map((item) => {
      let uiStatus: 'Pending HOD' | 'Approved' | 'Rejected' | 'Clarification Requested' = 'Pending HOD';
      if (item.status === 'approved') uiStatus = 'Approved';
      else if (item.status === 'rejected') uiStatus = 'Rejected';
      else if (item.status === 'clarification') uiStatus = 'Clarification Requested';

      const approvalsArr = (item.approvals as unknown as Array<{ action: string; remarks?: string | null; action_time?: string }>) || [];
      const sortedApprovals = [...approvalsArr].sort((a, b) => (a.action_time || '').localeCompare(b.action_time || ''));
      const latestApproval = sortedApprovals.length > 0 ? sortedApprovals[sortedApprovals.length - 1] : null;
      const profileObj = item.profiles as unknown as {
        name?: string;
        employee_id?: string;
        designation?: string;
        departments?: { department_name?: string } | null;
      } | null;
      const leaveTypeObj = item.leave_types as unknown as { name?: string } | null;

      return {
        id: item.id,
        facultyId: item.faculty_id,
        facultyName: profileObj?.name || 'Academic Faculty',
        department: profileObj?.departments?.department_name || 'Academic Department',
        designation: profileObj?.designation || 'Assistant Professor',
        employeeId: profileObj?.employee_id || 'FAC-2026',
        leaveType: leaveTypeObj?.name || 'General Leave',
        startDate: item.from_date,
        endDate: item.to_date,
        totalDays: Number(item.days),
        reason: item.reason,
        status: uiStatus,
        appliedOn: item.submitted_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        hodComment: latestApproval?.remarks || undefined,
        approvalsHistory: sortedApprovals,
      };
    });
  } catch (err) {
    console.error('Exception in getHodDepartmentApplications:', err);
    return [];
  }
}

/**
 * Record HOD decision in Supabase approvals audit and update leave_applications table
 */
export async function recordHodDecision(
  leaveId: string,
  approverId: string,
  action: 'approved' | 'rejected' | 'clarification',
  remarks?: string
): Promise<{ success: boolean; error: string | null }> {
  const isLive = isSupabaseConfigured();
  if (!isLive) {
    return { success: true, error: null };
  }

  try {
    // 1. Insert audit record in approvals table
    const { error: approvalErr } = await supabase.from('approvals').insert([
      {
        leave_id: leaveId,
        approver_id: approverId,
        action,
        remarks: remarks || `Action recorded: ${action}`,
      },
    ]);

    if (approvalErr) {
      console.error('Failed to log approval record:', approvalErr);
      return { success: false, error: approvalErr.message };
    }

    // 2. Update status in leave_applications table
    const dbStatus: LeaveApplicationStatus = action;
    const { error: updateErr } = await supabase
      .from('leave_applications')
      .update({ status: dbStatus })
      .eq('id', leaveId);

    if (updateErr) {
      console.error('Failed to update leave status:', updateErr);
      return { success: false, error: updateErr.message };
    }

    return { success: true, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error during decision';
    return { success: false, error: msg };
  }
}

/**
 * Fetch Department Statistics for HOD dashboard
 */
export async function getDepartmentStats(departmentId?: string | null): Promise<DepartmentStats> {
  const isLive = isSupabaseConfigured();
  if (!isLive) {
    return {
      totalFaculty: 0,
      activeLeavesToday: 0,
      pendingApprovals: 0,
      approvedThisMonth: 0,
    };
  }

  try {
    let facultyCount = 0;
    if (departmentId) {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'faculty')
        .eq('department_id', departmentId);
      facultyCount = count ?? 0;
    }

    // Applications stats (RLS scopes to HOD's department)
    const { data: apps } = await supabase.from('leave_applications').select('id, status, from_date, to_date');

    const todayStr = new Date().toISOString().split('T')[0];
    const pending = (apps || []).filter((a) => a.status === 'pending' || a.status === 'clarification').length;
    const approved = (apps || []).filter((a) => a.status === 'approved').length;
    const activeToday = (apps || []).filter(
      (a) => a.status === 'approved' && a.from_date <= todayStr && a.to_date >= todayStr
    ).length;

    return {
      totalFaculty: facultyCount,
      activeLeavesToday: activeToday,
      pendingApprovals: pending,
      approvedThisMonth: approved,
    };
  } catch {
    return {
      totalFaculty: 0,
      activeLeavesToday: 0,
      pendingApprovals: 0,
      approvedThisMonth: 0,
    };
  }
}
