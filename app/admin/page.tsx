'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CreateStaffModal } from '@/components/users/CreateStaffModal';
import { AcademicCalendarManager } from '@/components/admin/AcademicCalendarManager';
import { LeaveReportManager } from '@/components/reports/LeaveReportManager';
import { DepartmentSummary } from '@/types';
import {
  Building2,
  Users,
  FileCheck,
  Plus,
  UserPlus,
  UserCheck,
  Search,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Copy,
  Check,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { generateSecurePassword } from '@/lib/utils/password';
import {
  getAdminDepartments,
  getAdminSystemStats,
  getAllStaffMembers,
  getSystemAdministrators,
  promoteStaffToAdmin,
  revokeAdminPrivileges,
  createDepartment,
  assignDepartmentHod,
  checkUserProvisioningStatus,
  AdminSystemStats,
  StaffMember
} from '@/lib/supabase/admin';

const mockAdminUser = {
  name: 'Dr. Vikramaditya Rao',
  designation: 'Dean of Academic Affairs / System Admin',
  department: 'Central Administration',
  employeeId: 'ADM-2026-001',
  email: 'admin@university.edu',
};

export default function AdminPortalPage() {
  const { user, profile, session, isLiveSupabase } = useAuth();

  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [administrators, setAdministrators] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<AdminSystemStats>({
    totalDepartments: 0,
    totalHods: 0,
    totalFaculty: 0,
    totalAdmins: 1,
    activeLeavesToday: 0,
    databaseStatus: 'Connecting...',
  });
  const [provisioningReady, setProvisioningReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [deptSearchTerm, setDeptSearchTerm] = useState('');
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<'all' | 'admin' | 'hod' | 'faculty'>('all');
  const [staffDeptFilter, setStaffDeptFilter] = useState<string>('all');

  // Modals & Feedback
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [creatingDept, setCreatingDept] = useState(false);
  const [deptFormError, setDeptFormError] = useState<string | null>(null);

  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffModalDefaultRole, setStaffModalDefaultRole] = useState<'admin' | 'hod' | 'faculty'>('admin');
  const [staffModalDefaultDeptId, setStaffModalDefaultDeptId] = useState<string | undefined>(undefined);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Promote Member to Admin Modal State
  const [isPromoteAdminModalOpen, setIsPromoteAdminModalOpen] = useState(false);
  const [targetPromoteStaff, setTargetPromoteStaff] = useState<StaffMember | null>(null);
  const [selectedPromoteCandidateId, setSelectedPromoteCandidateId] = useState('');
  const [promoteDesignation, setPromoteDesignation] = useState('');
  const [promotingAdmin, setPromotingAdmin] = useState(false);
  const [promoteAdminError, setPromoteAdminError] = useState<string | null>(null);

  // Revoke Admin Access Modal State
  const [isRevokeAdminModalOpen, setIsRevokeAdminModalOpen] = useState(false);
  const [targetRevokeAdmin, setTargetRevokeAdmin] = useState<StaffMember | null>(null);
  const [revokingAdmin, setRevokingAdmin] = useState(false);
  const [revokeAdminError, setRevokeAdminError] = useState<string | null>(null);

  // Appoint / Change HOD Modal State
  const [isAppointHodModalOpen, setIsAppointHodModalOpen] = useState(false);
  const [targetAppointDept, setTargetAppointDept] = useState<DepartmentSummary | null>(null);
  const [selectedHodCandidateId, setSelectedHodCandidateId] = useState('');
  const [appointingHod, setAppointingHod] = useState(false);
  const [appointHodError, setAppointHodError] = useState<string | null>(null);

  // Admin Password Reset Modal State
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [targetStaffMember, setTargetStaffMember] = useState<StaffMember | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetShowPassword, setResetShowPassword] = useState(true);
  const [resetCopied, setResetCopied] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const adminDisplayName = profile?.name || mockAdminUser.name;
  const adminDisplayDesig = profile?.designation || mockAdminUser.designation;
  const adminDisplayEmpId = profile?.employee_id || mockAdminUser.employeeId;

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => setFeedbackBanner(null), 6000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const activeToken = session?.access_token;
      const [liveDepts, systemStats, allStaff, liveAdmins, apiReady] = await Promise.all([
        getAdminDepartments(activeToken),
        getAdminSystemStats(),
        getAllStaffMembers(),
        getSystemAdministrators(activeToken),
        checkUserProvisioningStatus(),
      ]);
      setDepartments(liveDepts);
      setStats(systemStats);
      setStaffMembers(allStaff);
      setAdministrators(liveAdmins);
      setProvisioningReady(apiReady);
    } catch (e) {
      console.error('Error loading admin portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const activeToken = session?.access_token;
    Promise.all([
      getAdminDepartments(activeToken),
      getAdminSystemStats(),
      getAllStaffMembers(),
      getSystemAdministrators(activeToken),
      checkUserProvisioningStatus(),
    ])
      .then(([liveDepts, systemStats, allStaff, liveAdmins, apiReady]) => {
        if (!active) return;
        setDepartments(liveDepts);
        setStats(systemStats);
        setStaffMembers(allStaff);
        setAdministrators(liveAdmins);
        setProvisioningReady(apiReady);
      })
      .catch((e) => {
        console.error('Error loading admin portal data:', e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptFormError(null);
    setCreatingDept(true);

    const { data, error } = await createDepartment(newDeptName);
    setCreatingDept(false);

    if (error || !data) {
      setDeptFormError(error || 'Failed to add department.');
      return;
    }

    setNewDeptName('');
    setIsAddDeptOpen(false);
    showFeedback('success', `Department "${data.department_name}" added successfully.`);
    loadData();
  };

  const handleOpenResetModal = (member: StaffMember) => {
    setTargetStaffMember(member);
    const generated = generateSecurePassword('Uni@');
    setResetNewPassword(generated);
    setResetShowPassword(true);
    setResetError(null);
    setResetSuccess(null);
    setResetCopied(false);
    setIsResetPasswordOpen(true);
  };

  const handleGenerateNewResetPassword = () => {
    const generated = generateSecurePassword('Uni@');
    setResetNewPassword(generated);
    setResetShowPassword(true);
    setResetError(null);
  };

  const handleCopyResetPassword = () => {
    if (!resetNewPassword) return;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(resetNewPassword).then(() => {
        setResetCopied(true);
        setTimeout(() => setResetCopied(false), 3000);
      });
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStaffMember || !resetNewPassword || resetNewPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }

    setResetSubmitting(true);
    setResetError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          targetUserId: targetStaffMember.id,
          newPassword: resetNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || 'Failed to update user password.');
      } else {
        setResetSuccess(`Password updated successfully! Temporary password: ${resetNewPassword}`);
        showFeedback('success', `Password successfully reset for ${targetStaffMember.name} (${targetStaffMember.email}).`);
      }
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Error updating password.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleOpenAppointModal = (dept: DepartmentSummary) => {
    setTargetAppointDept(dept);
    setAppointHodError(null);
    const existingHod = staffMembers.find(
      (m) => m.id === dept.hodId || (m.role === 'hod' && m.department_id === dept.id)
    );
    setSelectedHodCandidateId(existingHod?.id || '');
    setIsAppointHodModalOpen(true);
  };

  const handleConfirmAssignHod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAppointDept) return;
    if (!selectedHodCandidateId) {
      setAppointHodError('Please select a staff member to appoint as HOD, or choose to onboard a new HOD.');
      return;
    }

    setAppointingHod(true);
    setAppointHodError(null);

    const res = await assignDepartmentHod(targetAppointDept.id, selectedHodCandidateId, session?.access_token);
    setAppointingHod(false);

    if (!res.success) {
      setAppointHodError(res.error || 'Failed to appoint HOD.');
      return;
    }

    setIsAppointHodModalOpen(false);
    showFeedback('success', `Appointed Head of Department for "${targetAppointDept.name}" successfully.`);
    loadData();
  };

  const handleOpenPromoteModal = (member?: StaffMember) => {
    if (member) {
      setTargetPromoteStaff(member);
      setSelectedPromoteCandidateId(member.id);
      setPromoteDesignation(
        member.designation ? `${member.designation} & Administrator` : 'System Administrator'
      );
    } else {
      setTargetPromoteStaff(null);
      setSelectedPromoteCandidateId('');
      setPromoteDesignation('');
    }
    setPromoteAdminError(null);
    setIsPromoteAdminModalOpen(true);
  };

  const handleConfirmPromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPromoteCandidateId) {
      setPromoteAdminError('Please choose a staff member to promote.');
      return;
    }

    setPromotingAdmin(true);
    setPromoteAdminError(null);

    const res = await promoteStaffToAdmin(session?.access_token, selectedPromoteCandidateId, promoteDesignation);
    setPromotingAdmin(false);

    if (!res.success) {
      setPromoteAdminError(res.error || 'Failed to promote member to administrator.');
      return;
    }

    setIsPromoteAdminModalOpen(false);
    showFeedback('success', res.message || 'Staff member successfully granted System Administrator privileges.');
    loadData();
  };

  const handleConfirmRevokeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRevokeAdmin) return;

    setRevokingAdmin(true);
    setRevokeAdminError(null);

    const res = await revokeAdminPrivileges(session?.access_token, targetRevokeAdmin.id, 'faculty');
    setRevokingAdmin(false);

    if (!res.success) {
      setRevokeAdminError(res.error || 'Failed to revoke administrator privileges.');
      return;
    }

    setIsRevokeAdminModalOpen(false);
    showFeedback('success', res.message || 'Administrator privileges revoked successfully.');
    loadData();
  };

  const handleSwitchToCreateHod = () => {
    if (!targetAppointDept) return;
    const deptId = targetAppointDept.id;
    setIsAppointHodModalOpen(false);
    setStaffModalDefaultRole('hod');
    setStaffModalDefaultDeptId(deptId);
    setIsAddStaffOpen(true);
  };

  const nonAdminCandidates = useMemo(() => {
    return staffMembers.filter((m) => m.role !== 'admin');
  }, [staffMembers]);

  const filteredDepts = useMemo(() => {
    const q = deptSearchTerm.toLowerCase();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.hodName.toLowerCase().includes(q)
    );
  }, [departments, deptSearchTerm]);

  const filteredStaff = useMemo(() => {
    return staffMembers.filter((m) => {
      if (staffRoleFilter !== 'all' && m.role !== staffRoleFilter) {
        return false;
      }
      if (staffDeptFilter !== 'all' && m.department_id !== staffDeptFilter) {
        return false;
      }
      if (staffSearchTerm.trim()) {
        const q = staffSearchTerm.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.employee_id.toLowerCase().includes(q) ||
          m.designation.toLowerCase().includes(q) ||
          m.department_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [staffMembers, staffRoleFilter, staffDeptFilter, staffSearchTerm]);

  const adminCount = staffMembers.filter((m) => m.role === 'admin').length || administrators.length || 1;
  const hodCount = staffMembers.filter((m) => m.role === 'hod').length;
  const facultyCount = staffMembers.filter((m) => m.role === 'faculty').length;

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex flex-col md:flex-row gap-6">
        <Sidebar
          role="admin"
          userName={adminDisplayName}
          department={mockAdminUser.department}
          designation={adminDisplayDesig}
        />

        <div className="flex-1 space-y-6">
          {/* Admin Header Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white p-6 rounded-2xl border-l-8 border-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30 inline-block mb-1.5 font-mono">
                Central System Administration
              </span>
              <h2 className="text-xl sm:text-2xl font-bold uppercase font-serif tracking-wide text-white">
                {adminDisplayName}
              </h2>
              <p className="text-xs text-blue-200/90 mt-0.5 font-medium">
                {adminDisplayDesig}
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-2 text-xs text-slate-300">
              <div className="space-y-0.5 sm:text-right font-medium">
                <p><span className="text-slate-400">Admin ID:</span> <span className="font-mono text-white font-bold">{adminDisplayEmpId}</span></p>
                <p><span className="text-slate-400">Email:</span> <span className="text-slate-200">{user?.email || mockAdminUser.email}</span></p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setStaffModalDefaultRole('admin');
                    setStaffModalDefaultDeptId(undefined);
                    setIsAddStaffOpen(true);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs rounded-lg"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-300" /> + New Admin
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDeptFormError(null);
                    setNewDeptName('');
                    setIsAddDeptOpen(true);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Department
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setStaffModalDefaultRole('hod');
                    setIsAddStaffOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-xs px-3.5 py-1.5 rounded-lg shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Add HOD / Faculty
                </Button>
              </div>
            </div>
          </div>

          {/* Service Role Configuration Banner (Visible only when key is pending) */}
          {isLiveSupabase && provisioningReady === false && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Account Provisioning Setup Ready — Waiting for Service Role Key</p>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  You can already create departments and view all HODs &amp; Faculty members below. To enable creating brand-new login accounts directly from the portal, add{' '}
                  <code className="font-mono bg-amber-100 px-1 font-semibold">SUPABASE_SERVICE_ROLE_KEY</code> inside{' '}
                  <code className="font-mono bg-amber-100 px-1">.env.local</code> and restart the Next.js server.
                </p>
              </div>
            </div>
          )}

          {/* Action Feedback Notification */}
          {feedbackBanner && (
            <div
              className={`p-3 border text-xs flex items-center gap-2 ${
                feedbackBanner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {feedbackBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              )}
              <span>{feedbackBanner.text}</span>
            </div>
          )}

          {/* System Overview Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-blue-950 shadow-xs">
              <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-900" /> System Admins
              </div>
              <div className="text-2xl font-bold text-slate-950 mt-1">{adminCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Co-Administrators</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-blue-900 shadow-xs">
              <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-blue-900" /> Departments
              </div>
              <div className="text-2xl font-bold text-slate-950 mt-1">{stats.totalDepartments}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Academic Divisions</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-indigo-900 shadow-xs">
              <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1 uppercase tracking-wider">
                <UserCheck className="w-3.5 h-3.5 text-indigo-900" /> Total HODs
              </div>
              <div className="text-2xl font-bold text-slate-950 mt-1">{stats.totalHods}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Department Heads</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-slate-800 shadow-xs">
              <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1 uppercase tracking-wider">
                <Users className="w-4 h-4 text-slate-800" /> Total Faculty
              </div>
              <div className="text-2xl font-bold text-slate-950 mt-1">{stats.totalFaculty}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Teaching Personnel</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-emerald-700 shadow-xs">
              <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1 uppercase tracking-wider">
                <FileCheck className="w-3.5 h-3.5 text-emerald-700" /> Leaves Today
              </div>
              <div className="text-2xl font-bold text-slate-950 mt-1">{stats.activeLeavesToday}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Sanctioned &amp; Active</div>
            </div>
          </div>

          {/* University System Administrators Directory & Governance */}
          <div id="administrators">
            <Card
              title="University System Administrators & Multi-Admin Governance"
              subtitle="All authorized system administrators with central governance, staff provisioning, and leave policy authority"
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenPromoteModal()}
                    className="text-xs rounded-lg border-blue-300 text-blue-900 hover:bg-blue-50"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1 text-blue-900" /> Promote Existing Member
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setStaffModalDefaultRole('admin');
                      setStaffModalDefaultDeptId(undefined);
                      setIsAddStaffOpen(true);
                    }}
                    className="bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-lg shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add New Administrator
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                    <span>Loading authorized administrators...</span>
                  </div>
                ) : administrators.length === 0 ? (
                  <div className="py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 p-4 space-y-2">
                    <Shield className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">No additional administrators found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {administrators.map((admin) => {
                      const isCurrentUser = admin.id === user?.id || admin.email === user?.email;
                      return (
                        <div
                          key={admin.id}
                          className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                            isCurrentUser
                              ? 'bg-blue-50/60 border-blue-300 shadow-xs ring-1 ring-blue-900/10'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-950 text-amber-400 flex items-center justify-center font-bold shadow-2xs shrink-0">
                                  <Shield className="w-5 h-5 text-amber-300" />
                                </div>
                                <div className="truncate">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 text-xs truncate" title={admin.name}>
                                      {admin.name}
                                    </span>
                                    {isCurrentUser && (
                                      <span className="text-[9px] font-bold bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded border border-blue-200">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-blue-900 font-semibold block truncate">
                                    {admin.designation}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[9px] font-mono font-bold bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded shrink-0">
                                ADMIN
                              </span>
                            </div>

                            <div className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500">Employee ID:</span>
                                <span className="font-mono font-bold text-slate-900">{admin.employee_id}</span>
                              </div>
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500">Official Email:</span>
                                <span className="font-mono text-slate-800 truncate max-w-[170px]" title={admin.email}>
                                  {admin.email}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500">Unit:</span>
                                <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                                  {admin.department_name}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                                <span>Appointed on:</span>
                                <span>{new Date(admin.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-emerald-700 font-bold flex items-center gap-1 text-[10px]">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Full Authority
                            </span>
                            {!isCurrentUser && administrators.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetRevokeAdmin(admin);
                                  setRevokeAdminError(null);
                                  setIsRevokeAdminModalOpen(true);
                                }}
                                className="text-rose-700 hover:text-rose-900 font-bold hover:underline cursor-pointer text-[11px]"
                              >
                                Revoke Privileges
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                {isCurrentUser ? 'Active Session' : 'Primary Admin'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* University Departments Directory */}
          <div id="departments">
            <Card
              title="University Departments & HOD Allocation"
              subtitle="Create departments and appoint Heads of Department (HOD)"
              action={
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={loadData} disabled={loading} className="text-xs rounded-lg">
                    <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setDeptFormError(null);
                      setNewDeptName('');
                      setIsAddDeptOpen(true);
                    }}
                    className="bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> New Department
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search departments by name, code, or appointed HOD..."
                    value={deptSearchTerm}
                    onChange={(e) => setDeptSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 font-medium shadow-2xs"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                    <span>Loading departments from live Supabase...</span>
                  </div>
                ) : filteredDepts.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 p-4 space-y-2">
                    <Building2 className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">
                      No departments found in the database yet.
                    </p>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setDeptFormError(null);
                        setNewDeptName('');
                        setIsAddDeptOpen(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Create First Department
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-3.5">Code</th>
                          <th className="py-3 px-3.5">Academic Department</th>
                          <th className="py-3 px-3.5">Appointed HOD</th>
                          <th className="py-3 px-3.5 text-center">Faculty Count</th>
                          <th className="py-3 px-3.5 text-center">Active Leaves</th>
                          <th className="py-3 px-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredDepts.map((dept) => (
                          <tr key={dept.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-3 px-3.5 font-mono font-bold text-blue-900">
                              {dept.code}
                            </td>
                            <td className="py-3 px-3.5 font-semibold text-slate-900">
                              {dept.name}
                            </td>
                            <td className="py-3 px-3.5">
                              {dept.hodName === 'To Be Assigned' ? (
                                <span className="text-amber-800 font-bold bg-amber-50 px-2.5 py-1 border border-amber-300 rounded text-[11px] inline-flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-amber-700" />
                                  Unassigned
                                </span>
                              ) : (
                                <div>
                                  <span className="text-slate-900 font-bold text-xs block">
                                    {dept.hodName}
                                  </span>
                                  {dept.hodEmail && (
                                    <span className="text-[10px] text-slate-500 font-mono block">
                                      {dept.hodEmail}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-center font-bold text-slate-900">
                              {dept.totalFaculty}
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                  dept.activeLeavesToday > 0
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {dept.activeLeavesToday}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => handleOpenAppointModal(dept)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                {dept.hodName === 'To Be Assigned' ? 'Appoint HOD' : 'Change HOD'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setStaffModalDefaultRole('faculty');
                                  setStaffModalDefaultDeptId(dept.id);
                                  setIsAddStaffOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                + Add Faculty
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Academic Calendar & Declared Public Holidays */}
          <div id="calendar">
            <AcademicCalendarManager />
          </div>

          {/* Monthly & Annual Faculty Leave Reports */}
          <div id="reports">
            <LeaveReportManager />
          </div>

          {/* Complete University Staff Directory (ALL HODs & Faculty Members) */}
          <div id="directory">
            <Card
              title="All University HODs & Faculty Directory"
              subtitle="Central registry of all Heads of Department and Faculty personnel across the institution"
              action={
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setStaffModalDefaultRole('faculty');
                    setIsAddStaffOpen(true);
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Onboard Staff
                </Button>
              }
            >
              <div className="space-y-4">
                {/* Role Filter Tabs + Department Dropdown + Search */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setStaffRoleFilter('all')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        staffRoleFilter === 'all'
                          ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      All Staff ({staffMembers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffRoleFilter('admin')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        staffRoleFilter === 'admin'
                          ? 'bg-blue-950 text-white border-blue-950 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Admins Only ({adminCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffRoleFilter('hod')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        staffRoleFilter === 'hod'
                          ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      HODs Only ({hodCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffRoleFilter('faculty')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        staffRoleFilter === 'faculty'
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Faculty Only ({facultyCount})
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 flex-1 lg:max-w-md">
                    <select
                      value={staffDeptFilter}
                      onChange={(e) => setStaffDeptFilter(e.target.value)}
                      className="py-2 px-3 text-xs border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 font-medium shadow-2xs"
                    >
                      <option value="all">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>

                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search name, ID, email..."
                        value={staffSearchTerm}
                        onChange={(e) => setStaffSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 font-medium shadow-2xs"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                    <span>Loading staff directory...</span>
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-600 font-medium">
                    No staff members match the selected filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-3.5">Employee ID</th>
                          <th className="py-3 px-3.5">Staff Name</th>
                          <th className="py-3 px-3.5">Role</th>
                          <th className="py-3 px-3.5">Department</th>
                          <th className="py-3 px-3.5">Designation</th>
                          <th className="py-3 px-3.5">Institutional Email</th>
                          <th className="py-3 px-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredStaff.map((member) => (
                          <tr key={member.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                              {member.employee_id}
                            </td>
                            <td className="py-3 px-3.5 font-semibold text-slate-900">
                              {member.name}
                            </td>
                            <td className="py-3 px-3.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                                  member.role === 'admin'
                                    ? 'bg-blue-950 text-amber-300 border-amber-400/50 shadow-2xs'
                                    : member.role === 'hod'
                                    ? 'bg-indigo-100/90 text-indigo-950 border-indigo-400'
                                    : 'bg-emerald-100/90 text-emerald-950 border-emerald-400'
                                }`}
                              >
                                {member.role === 'admin' && <Shield className="w-2.5 h-2.5 text-amber-300" />}
                                {member.role === 'admin' ? 'SYSTEM ADMIN' : member.role.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-slate-800 font-medium">
                              {member.department_name}
                            </td>
                            <td className="py-3 px-3.5 text-slate-700 font-medium">
                              {member.designation}
                            </td>
                            <td className="py-3 px-3.5 font-mono text-xs text-slate-600 font-medium">
                              {member.email}
                            </td>
                            <td className="py-3 px-3.5 text-right whitespace-nowrap space-x-1.5">
                              {member.role !== 'admin' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPromoteModal(member)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-md transition-colors cursor-pointer shadow-2xs"
                                  title="Promote this member to System Administrator"
                                >
                                  <ShieldCheck className="w-3 h-3 text-amber-700" />
                                  <span>Make Admin</span>
                                </button>
                              ) : member.id !== user?.id && administrators.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetRevokeAdmin(member);
                                    setRevokeAdminError(null);
                                    setIsRevokeAdminModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-800 hover:text-rose-950 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-md transition-colors cursor-pointer shadow-2xs"
                                  title="Revoke administrator privileges"
                                >
                                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                                  <span>Revoke</span>
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleOpenResetModal(member)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-blue-900 hover:text-blue-950 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer shadow-2xs"
                                title="Reset & generate password for staff member"
                              >
                                <KeyRound className="w-3 h-3 text-blue-900" />
                                <span>Reset Password</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Department Modal */}
      <Modal
        isOpen={isAddDeptOpen}
        onClose={() => setIsAddDeptOpen(false)}
        title="Add Academic Department"
        subtitle="Create a new university department in PostgreSQL database"
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          {deptFormError && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{deptFormError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Department Full Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Electronics & Communication Engineering"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              disabled={creatingDept}
              className="w-full py-2.5 px-3.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 font-medium shadow-2xs"
            />
            <p className="text-[11px] text-slate-600 mt-1.5 font-medium">
              Department short code (e.g. ECE) will be automatically generated from the department title.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddDeptOpen(false)}
              disabled={creatingDept}
              className="text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={creatingDept} className="bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-lg shadow-sm">
              {creatingDept ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Department
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Appoint / Change Department HOD Modal */}
      <Modal
        isOpen={isAppointHodModalOpen}
        onClose={() => setIsAppointHodModalOpen(false)}
        title={`Appoint Head of Department — ${targetAppointDept?.name || 'Department'}`}
        subtitle="Designate academic leadership for this department"
      >
        <div className="space-y-5">
          {appointHodError && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-950 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span>{appointHodError}</span>
            </div>
          )}

          {/* Option 1: Select an Existing Staff Member */}
          <form onSubmit={handleConfirmAssignHod} className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                Option A: Appoint from Existing Staff Roster
              </label>
              <p className="text-[11px] text-slate-600">
                Select an existing HOD or faculty member to appoint as Head of Department for{' '}
                <strong>{targetAppointDept?.name}</strong>:
              </p>

              <select
                value={selectedHodCandidateId}
                onChange={(e) => setSelectedHodCandidateId(e.target.value)}
                className="w-full py-2.5 px-3 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 font-medium shadow-2xs"
              >
                <option value="">-- Choose Existing Staff Member --</option>
                {staffMembers
                  .filter((m) => m.role !== 'admin')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role.toUpperCase()} — {m.department_name} — {m.email})
                    </option>
                  ))}
              </select>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={appointingHod || !selectedHodCandidateId}
                  className="bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-lg px-4"
                >
                  {appointingHod ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Appointing...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Confirm HOD Appointment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-300 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              OR
            </span>
            <div className="border-t border-slate-300 w-full" />
          </div>

          {/* Option 2: Onboard a New HOD */}
          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Option B: Onboard a New HOD Account
              </h4>
              <p className="text-[11px] text-amber-900 mt-0.5">
                Create new institutional login credentials pre-locked to{' '}
                <strong>{targetAppointDept?.name}</strong>.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSwitchToCreateHod}
              className="bg-white hover:bg-amber-100 text-amber-950 border-amber-400 font-bold text-xs shrink-0 rounded-lg shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Onboard New HOD
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add HOD or Faculty Modal */}
      <CreateStaffModal
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        onSuccess={(msg) => {
          showFeedback('success', msg);
          loadData();
        }}
        accessToken={session?.access_token}
        mode="admin"
        defaultRole={staffModalDefaultRole}
        defaultDepartmentId={staffModalDefaultDeptId}
        departments={departments.map((d) => ({ id: d.id, name: d.name }))}
      />

      {/* Admin Reset Staff Password Modal */}
      <Modal
        isOpen={isResetPasswordOpen}
        onClose={() => setIsResetPasswordOpen(false)}
        title="Reset Staff Password"
        subtitle={`Generate or assign a new password for ${targetStaffMember?.name || 'Staff Member'}`}
      >
        <form onSubmit={handleConfirmResetPassword} className="space-y-4">
          {resetError && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2 rounded-lg">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{resetError}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-start gap-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Password Reset Confirmed</p>
                <p className="mt-0.5">{resetSuccess}</p>
                <p className="mt-1 text-[11px] text-emerald-800 font-medium">
                  Please provide this temporary password to the staff member.
                </p>
              </div>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
            <p><span className="font-semibold text-slate-700">Staff Member:</span> {targetStaffMember?.name}</p>
            <p><span className="font-semibold text-slate-700">Role &amp; Dept:</span> <span className="uppercase font-bold text-slate-800">{targetStaffMember?.role}</span> — {targetStaffMember?.department_name}</p>
            <p><span className="font-semibold text-slate-700">Email:</span> <span className="font-mono text-slate-800">{targetStaffMember?.email}</span></p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                New Password <span className="text-rose-600">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateNewResetPassword}
                  className="text-[11px] font-bold text-blue-900 hover:text-blue-950 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Generate Strong</span>
                </button>
                {resetNewPassword && (
                  <button
                    type="button"
                    onClick={handleCopyResetPassword}
                    className="text-[11px] font-bold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {resetCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                type={resetShowPassword ? 'text' : 'password'}
                required
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                disabled={resetSubmitting}
                className="w-full pl-9 pr-10 py-2.5 text-xs bg-white text-slate-900 border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg font-mono font-medium shadow-2xs"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setResetShowPassword(!resetShowPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label={resetShowPassword ? 'Hide password' : 'Show password'}
              >
                {resetShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetPasswordOpen(false)}
              disabled={resetSubmitting}
              className="text-xs rounded-lg"
            >
              Close
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={resetSubmitting || !resetNewPassword || resetNewPassword.length < 6}
              className="bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-lg shadow-sm"
            >
              {resetSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Confirm Password Reset
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Promote Staff Member to System Administrator Modal */}
      <Modal
        isOpen={isPromoteAdminModalOpen}
        onClose={() => setIsPromoteAdminModalOpen(false)}
        title="Promote Member to System Administrator"
        subtitle="Grant full executive governance and system administration authority to an existing staff member"
      >
        <form onSubmit={handleConfirmPromoteAdmin} className="space-y-4">
          {promoteAdminError && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2 rounded-lg">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{promoteAdminError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Select Staff Member to Promote <span className="text-rose-600">*</span>
            </label>
            <select
              value={selectedPromoteCandidateId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedPromoteCandidateId(id);
                const cand = staffMembers.find((m) => m.id === id);
                setTargetPromoteStaff(cand || null);
                if (cand) {
                  setPromoteDesignation(
                    cand.designation ? `${cand.designation} & Administrator` : 'System Administrator'
                  );
                }
              }}
              required
              disabled={promotingAdmin}
              className="w-full py-2.5 px-3.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 font-medium shadow-2xs"
            >
              <option value="">-- Choose an Existing Staff Member --</option>
              {nonAdminCandidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.employee_id}) — {m.role.toUpperCase()} in {m.department_name}
                </option>
              ))}
            </select>
          </div>

          {targetPromoteStaff && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Role:</span>
                <span className="font-bold text-slate-900 uppercase">{targetPromoteStaff.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Department:</span>
                <span className="font-semibold text-slate-900">{targetPromoteStaff.department_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Institutional Email:</span>
                <span className="font-mono text-slate-800">{targetPromoteStaff.email}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Administrative Designation / Title <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Professor & Joint Administrator or Dean of Academic Affairs"
              value={promoteDesignation}
              onChange={(e) => setPromoteDesignation(e.target.value)}
              disabled={promotingAdmin}
              className="w-full py-2.5 px-3.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 font-medium shadow-2xs"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Institutional Authority:</strong> Granting System Administrator privileges allows this user full authority to manage all university departments, staff profiles, HOD appointments, password resets, and university leave policies.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPromoteAdminModalOpen(false)}
              disabled={promotingAdmin}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={promotingAdmin || !selectedPromoteCandidateId}
              className="bg-blue-900 hover:bg-blue-950 text-white font-bold"
            >
              {promotingAdmin ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Promoting...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Grant Admin Privileges
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Revoke Admin Access Modal */}
      <Modal
        isOpen={isRevokeAdminModalOpen}
        onClose={() => setIsRevokeAdminModalOpen(false)}
        title="Revoke System Administrator Access"
        subtitle={`Demote ${targetRevokeAdmin?.name || 'Administrator'} back to faculty status`}
      >
        <form onSubmit={handleConfirmRevokeAdmin} className="space-y-4">
          {revokeAdminError && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2 rounded-lg">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{revokeAdminError}</span>
            </div>
          )}

          <p className="text-xs text-slate-700 leading-relaxed">
            Are you sure you want to revoke System Administrator privileges from{' '}
            <strong>{targetRevokeAdmin?.name}</strong> (<span className="font-mono text-slate-900">{targetRevokeAdmin?.email}</span>)?
          </p>

          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <span className="text-[11px] leading-relaxed">
              This user will lose central administration access immediately and be converted back to a regular Faculty member.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRevokeAdminModalOpen(false)}
              disabled={revokingAdmin}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={revokingAdmin}
              className="bg-rose-700 hover:bg-rose-800 text-white font-bold"
            >
              {revokingAdmin ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Revoking...
                </>
              ) : (
                'Confirm Revoke Privileges'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </ProtectedRoute>
  );
}
