export type UserRole = 'faculty' | 'hod' | 'admin';

export type LeaveType =
  | 'Casual Leave (CL)'
  | 'Earned Leave (EL)'
  | 'Medical Leave (ML)'
  | 'Duty Leave (DL)'
  | 'Special Casual Leave (SCL)';

export type LeaveStatus =
  | 'Pending HOD'
  | 'Approved'
  | 'Rejected'
  | 'Clarification Requested';

export type LeaveApplicationStatus = 'pending' | 'approved' | 'rejected' | 'clarification';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  designation: string;
  employeeId: string;
  phone?: string;
  avatarUrl?: string;
  signatureUrl?: string;
  roomNumber?: string;
  emergencyContact?: string;
  joiningDate?: string;
}

export interface LeaveRequest {
  id: string;
  facultyId: string;
  facultyName: string;
  department: string;
  designation: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  hodComment?: string;
  contactDuringLeave?: string;
  documentUrl?: string;
  clarificationResponse?: string;
  approvalsHistory?: Array<{
    action: string;
    remarks?: string | null;
    action_time?: string;
  }>;
}

export interface LeaveCategoryBalance {
  total: number;
  used: number;
  remaining: number;
}

export interface LeaveBalance {
  casualLeave: LeaveCategoryBalance;
  earnedLeave: LeaveCategoryBalance;
  medicalLeave: LeaveCategoryBalance;
  dutyLeave: LeaveCategoryBalance;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
  hodId?: string | null;
  hodName: string;
  hodEmail?: string | null;
  totalFaculty: number;
  activeLeavesToday: number;
}

export type HolidayType = 'gazetted' | 'restricted' | 'vacation' | 'exam';

export interface AcademicHoliday {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: HolidayType;
  description?: string;
  academicYear?: string;
  createdAt?: string;
}

export interface LeaveCalculationResult {
  totalDays: number;
  workingDays: number;
  weekendDays: number;
  holidayDays: number;
  holidays: AcademicHoliday[];
  details: Array<{
    date: string;
    dayName: string;
    isWeekend: boolean;
    holiday?: AcademicHoliday;
    isDeductible: boolean;
  }>;
}

export type NotificationType =
  | 'leave_applied'
  | 'leave_approved'
  | 'leave_rejected'
  | 'clarification'
  | 'info'
  | 'system';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface LeaveReportFilter {
  year?: string;
  month?: string; // "all" or "01" - "12"
  departmentId?: string;
  leaveTypeId?: string;
  status?: string;
}

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

export interface LeaveReportRecord {
  id: string;
  applicationId: string;
  facultyName: string;
  employeeId: string;
  department: string;
  designation: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  workingDays: number;
  status: LeaveApplicationStatus;
  sanctionedBy?: string;
  reason: string;
  appliedDate: string;
  contactDuringLeave?: string;
}

export interface GatePassInfo {
  passNumber: string;
  applicationId: string;
  facultyName: string;
  employeeId: string;
  designation: string;
  department: string;
  phone?: string;
  avatarUrl?: string;
  leaveType: string;
  departureDate: string;
  expectedReturnDate: string;
  totalDays: number;
  reason: string;
  sanctionedBy: string;
  sanctionedDate: string;
  hodSignatureUrl?: string;
  facultySignatureUrl?: string;
}
