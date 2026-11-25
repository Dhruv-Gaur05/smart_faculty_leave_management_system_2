import { LeaveReportFilter, LeaveReportRecord } from '@/types';

// Mock seed applications for comprehensive demonstration in local mode
const DEMO_LEAVE_RECORDS: LeaveReportRecord[] = [
  {
    id: 'app-001',
    applicationId: 'LV-2026-089',
    facultyName: 'Dr. Rajesh Sharma',
    employeeId: 'BTU-FAC-2024-042',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    leaveType: 'Casual Leave (CL)',
    fromDate: '2026-08-25',
    toDate: '2026-08-26',
    totalDays: 2,
    workingDays: 2,
    status: 'pending',
    reason: 'Attending national conference paper presentation session on AI Systems.',
    appliedDate: '2026-08-18',
    contactDuringLeave: '+91 98290 12345',
  },
  {
    id: 'app-002',
    applicationId: 'LV-2026-078',
    facultyName: 'Dr. Priya Mehta',
    employeeId: 'BTU-FAC-2024-015',
    department: 'Computer Science & Engineering',
    designation: 'Assistant Professor',
    leaveType: 'Earned Leave (EL)',
    fromDate: '2026-08-10',
    toDate: '2026-08-14',
    totalDays: 5,
    workingDays: 4,
    status: 'approved',
    sanctionedBy: 'Prof. Ananya Sen (HOD)',
    reason: 'Personal family commitments and travel.',
    appliedDate: '2026-08-01',
    contactDuringLeave: '+91 94140 22334',
  },
  {
    id: 'app-003',
    applicationId: 'LV-2026-065',
    facultyName: 'Prof. Vikram Singh',
    employeeId: 'BTU-FAC-2023-009',
    department: 'Electronics & Communication Engineering',
    designation: 'Professor',
    leaveType: 'Duty Leave (DL)',
    fromDate: '2026-07-20',
    toDate: '2026-07-22',
    totalDays: 3,
    workingDays: 3,
    status: 'approved',
    sanctionedBy: 'Dr. Sunita Verma (Registrar)',
    reason: 'State University Curriculum Revision Committee meeting.',
    appliedDate: '2026-07-10',
    contactDuringLeave: '+91 98291 99887',
  },
  {
    id: 'app-004',
    applicationId: 'LV-2026-054',
    facultyName: 'Dr. Neha Kapoor',
    employeeId: 'BTU-FAC-2024-031',
    department: 'Mechanical Engineering',
    designation: 'Assistant Professor',
    leaveType: 'Medical Leave (ML)',
    fromDate: '2026-07-02',
    toDate: '2026-07-06',
    totalDays: 5,
    workingDays: 4,
    status: 'approved',
    sanctionedBy: 'Prof. Ananya Sen (HOD)',
    reason: 'Viral illness and physician-advised bed rest.',
    appliedDate: '2026-07-01',
    contactDuringLeave: '+91 94145 66778',
  },
  {
    id: 'app-005',
    applicationId: 'LV-2026-041',
    facultyName: 'Dr. Amit Trivedi',
    employeeId: 'BTU-FAC-2024-088',
    department: 'Civil Engineering',
    designation: 'Associate Professor',
    leaveType: 'Special Casual Leave (SCL)',
    fromDate: '2026-06-15',
    toDate: '2026-06-16',
    totalDays: 2,
    workingDays: 2,
    status: 'rejected',
    sanctionedBy: 'Prof. Ananya Sen (HOD)',
    reason: 'Inter-college sports tournament supervision.',
    appliedDate: '2026-06-10',
    contactDuringLeave: '+91 98292 33445',
  },
  {
    id: 'app-006',
    applicationId: 'LV-2026-033',
    facultyName: 'Dr. Rajesh Sharma',
    employeeId: 'BTU-FAC-2024-042',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    leaveType: 'Casual Leave (CL)',
    fromDate: '2026-05-12',
    toDate: '2026-05-13',
    totalDays: 2,
    workingDays: 2,
    status: 'approved',
    sanctionedBy: 'Prof. Ananya Sen (HOD)',
    reason: 'Personal urgent work in Jaipur.',
    appliedDate: '2026-05-08',
    contactDuringLeave: '+91 98290 12345',
  },
];

export interface LeaveReportStats {
  totalApplications: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  clarificationCount: number;
  totalLeaveDays: number;
  totalWorkingDays: number;
  categoryBreakdown: Record<string, number>;
  departmentBreakdown: Record<string, number>;
}

/**
 * Fetch and filter leave report applications
 */
export async function getLeaveReportData(filters: LeaveReportFilter): Promise<{
  records: LeaveReportRecord[];
  stats: LeaveReportStats;
}> {
  let records: LeaveReportRecord[] = [];

  // 1. Try fetching from Supabase
  try {
    const { getSupabaseAdminClient } = await import('@/lib/supabase/server-admin');
    const client = getSupabaseAdminClient();

    let query = client
      .from('leave_applications')
      .select(`
        id,
        from_date,
        to_date,
        days,
        reason,
        contact_during_leave,
        status,
        submitted_at,
        profiles:faculty_id (
          name,
          employee_id,
          designation,
          department_id,
          departments (
            department_name
          )
        ),
        leave_types (
          name
        )
      `)
      .order('submitted_at', { ascending: false });

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      records = (data as unknown as Array<{
        id: string;
        from_date: string;
        to_date: string;
        days: number;
        reason?: string | null;
        contact_during_leave?: string | null;
        status: LeaveReportRecord['status'];
        submitted_at: string;
        profiles?: {
          name?: string;
          employee_id?: string;
          designation?: string;
          department_id?: string;
          departments?: { department_name?: string } | null;
        } | null;
        leave_types?: { name?: string } | null;
      }>).map((item) => {
        const prof = item.profiles || {};
        const dept = prof.departments?.department_name || 'Academic Department';
        return {
          id: item.id,
          applicationId: item.id,
          facultyName: prof.name || 'Faculty Member',
          employeeId: prof.employee_id || 'BTU-FAC',
          department: dept,
          designation: prof.designation || 'Academic Staff',
          leaveType: item.leave_types?.name || 'Leave',
          fromDate: item.from_date,
          toDate: item.to_date,
          totalDays: Number(item.days) || 1,
          workingDays: Number(item.days) || 1,
          status: item.status,
          reason: item.reason || '',
          appliedDate: item.submitted_at?.split('T')[0] || item.from_date,
          contactDuringLeave: item.contact_during_leave || '',
        };
      });
    }
  } catch {
    // Continue to fallback
  }

  // 2. If no DB records or local demo, use fallback seed records
  if (records.length === 0) {
    records = [...DEMO_LEAVE_RECORDS];
  }

  // 3. Apply Filters
  if (filters.year && filters.year !== 'all') {
    records = records.filter((r) => r.fromDate.startsWith(filters.year!));
  }

  if (filters.month && filters.month !== 'all') {
    const paddedMonth = filters.month.padStart(2, '0');
    records = records.filter((r) => {
      const parts = r.fromDate.split('-');
      return parts[1] === paddedMonth;
    });
  }

  if (filters.departmentId && filters.departmentId !== 'all') {
    records = records.filter((r) =>
      r.department.toLowerCase().includes(filters.departmentId!.toLowerCase())
    );
  }

  if (filters.leaveTypeId && filters.leaveTypeId !== 'all') {
    records = records.filter((r) =>
      r.leaveType.toLowerCase().includes(filters.leaveTypeId!.toLowerCase())
    );
  }

  if (filters.status && filters.status !== 'all') {
    records = records.filter((r) => r.status === filters.status);
  }

  // 4. Calculate Aggregate Statistics
  const categoryBreakdown: Record<string, number> = {};
  const departmentBreakdown: Record<string, number> = {};
  let totalLeaveDays = 0;
  let totalWorkingDays = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let pendingCount = 0;
  let clarificationCount = 0;

  for (const r of records) {
    totalLeaveDays += r.totalDays;
    totalWorkingDays += r.workingDays;

    categoryBreakdown[r.leaveType] = (categoryBreakdown[r.leaveType] || 0) + r.totalDays;
    departmentBreakdown[r.department] = (departmentBreakdown[r.department] || 0) + 1;

    if (r.status === 'approved') approvedCount++;
    else if (r.status === 'rejected') rejectedCount++;
    else if (r.status === 'clarification') clarificationCount++;
    else pendingCount++;
  }

  const stats: LeaveReportStats = {
    totalApplications: records.length,
    approvedCount,
    rejectedCount,
    pendingCount,
    clarificationCount,
    totalLeaveDays,
    totalWorkingDays,
    categoryBreakdown,
    departmentBreakdown,
  };

  return { records, stats };
}

/**
 * Generate CSV content with UTF-8 BOM for Microsoft Excel compatibility
 */
export function formatRecordsAsCsv(
  records: LeaveReportRecord[],
  reportTitle: string = 'BTU Faculty Leave Statement'
): string {
  // UTF-8 BOM
  const BOM = '\uFEFF';

  const headers = [
    'S.No',
    'Application ID',
    'Faculty Name',
    'Employee ID',
    'Department',
    'Designation',
    'Leave Category',
    'From Date',
    'To Date',
    'Total Calendar Days',
    'Deductible Days',
    'Review Status',
    'Applied Date',
    'Reason / Station Absence Justification',
    'Contact During Absence',
  ];

  const rows = records.map((r, idx) => [
    idx + 1,
    `"${r.applicationId}"`,
    `"${r.facultyName.replace(/"/g, '""')}"`,
    `"${r.employeeId}"`,
    `"${r.department.replace(/"/g, '""')}"`,
    `"${r.designation.replace(/"/g, '""')}"`,
    `"${r.leaveType.replace(/"/g, '""')}"`,
    r.fromDate,
    r.toDate,
    r.totalDays,
    r.workingDays,
    r.status.toUpperCase(),
    r.appliedDate,
    `"${(r.reason || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`,
    `"${r.contactDuringLeave || ''}"`,
  ]);

  const metaHeader = [
    `"Bikaner Technical University - Academic Administration"`,
    `"${reportTitle}"`,
    `"Generated On: ${new Date().toISOString()}"`,
    '',
  ].join('\r\n');

  const csvBody = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

  return BOM + metaHeader + csvBody;
}
