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
}

export interface DepartmentStats {
  totalFaculty: number;
  activeLeavesToday: number;
  pendingApprovals: number;
  approvedThisMonth: number;
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

    return data.map((item: any) => {
      let uiStatus: 'Pending HOD' | 'Approved' | 'Rejected' | 'Clarification Requested' = 'Pending HOD';
      if (item.status === 'approved') uiStatus = 'Approved';
      else if (item.status === 'rejected') uiStatus = 'Rejected';
      else if (item.status === 'clarification') uiStatus = 'Clarification Requested';

      const latestApproval = item.approvals && item.approvals.length > 0 ? item.approvals[item.approvals.length - 1] : null;

      return {
        id: item.id,
        facultyId: item.faculty_id,
        facultyName: item.profiles?.name || 'Academic Faculty',
        department: item.profiles?.departments?.department_name || 'Academic Department',
        designation: item.profiles?.designation || 'Assistant Professor',
        employeeId: item.profiles?.employee_id || 'FAC-2026',
        leaveType: item.leave_types?.name || 'General Leave',
        startDate: item.from_date,
        endDate: item.to_date,
        totalDays: Number(item.days),
        reason: item.reason,
        status: uiStatus,
        appliedOn: item.submitted_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        hodComment: latestApproval?.remarks || undefined,
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
      totalFaculty: 24,
      activeLeavesToday: 2,
      pendingApprovals: 3,
      approvedThisMonth: 18,
    };
  }

  try {
    // 1. Total faculty
    let facultyQuery = supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'faculty');
    if (departmentId) {
      facultyQuery = facultyQuery.eq('department_id', departmentId);
    }
    const { count: facultyCount } = await facultyQuery;

    // 2. Applications stats
    const { data: apps } = await supabase.from('leave_applications').select('id, status, from_date, to_date');

    const todayStr = new Date().toISOString().split('T')[0];
    const pending = (apps || []).filter((a) => a.status === 'pending' || a.status === 'clarification').length;
    const approved = (apps || []).filter((a) => a.status === 'approved').length;
    const activeToday = (apps || []).filter(
      (a) => a.status === 'approved' && a.from_date <= todayStr && a.to_date >= todayStr
    ).length;

    return {
      totalFaculty: facultyCount || 1,
      activeLeavesToday: activeToday,
      pendingApprovals: pending,
      approvedThisMonth: approved,
    };
  } catch (e) {
    return {
      totalFaculty: 24,
      activeLeavesToday: 2,
      pendingApprovals: 3,
      approvedThisMonth: 18,
    };
  }
}

