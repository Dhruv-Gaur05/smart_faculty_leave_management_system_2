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

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  designation: string;
  employeeId: string;
  phone?: string;
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
