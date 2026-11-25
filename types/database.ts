// Supabase Database Table Definitions
export type UserRole = 'faculty' | 'hod' | 'admin';
export type LeaveApplicationStatus = 'pending' | 'approved' | 'rejected' | 'clarification';
export type ApprovalAction = 'approved' | 'rejected' | 'clarification';

export interface Department {
  id: string;
  department_name: string;
  hod_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  department_id: string | null;
  designation: string;
  role: UserRole;
  phone?: string | null;
  avatar_url?: string | null;
  signature_url?: string | null;
  room_number?: string | null;
  emergency_contact?: string | null;
  created_at: string;
}

export interface LeaveTypeRow {
  id: string;
  name: string;
  description: string | null;
  requires_document: boolean;
  created_at: string;
}

export interface LeaveApplication {
  id: string;
  faculty_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  days: number;
  reason: string;
  contact_during_leave: string | null;
  status: LeaveApplicationStatus;
  submitted_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  leave_id: string;
  approver_id: string;
  action: ApprovalAction;
  remarks: string | null;
  action_time: string;
}
