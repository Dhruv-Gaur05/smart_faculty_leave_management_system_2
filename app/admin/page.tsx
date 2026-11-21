'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CreateStaffModal } from '@/components/users/CreateStaffModal';
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
  createDepartment,
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
  const [stats, setStats] = useState<AdminSystemStats>({
    totalDepartments: 0,
    totalHods: 0,
    totalFaculty: 0,
    activeLeavesToday: 0,
    databaseStatus: 'Connecting...',
  });
  const [provisioningReady, setProvisioningReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [deptSearchTerm, setDeptSearchTerm] = useState('');
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<'all' | 'hod' | 'faculty'>('all');
  const [staffDeptFilter, setStaffDeptFilter] = useState<string>('all');

  // Modals & Feedback
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [creatingDept, setCreatingDept] = useState(false);
  const [deptFormError, setDeptFormError] = useState<string | null>(null);

  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffModalDefaultRole, setStaffModalDefaultRole] = useState<'hod' | 'faculty'>('hod');
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const fetchAdminPayload = async () => {
    const [liveDepts, systemStats, allStaff, apiReady] = await Promise.all([
      getAdminDepartments(),
      getAdminSystemStats(),
      getAllStaffMembers(),
      checkUserProvisioningStatus(),
    ]);
    return { liveDepts, systemStats, allStaff, apiReady };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { liveDepts, systemStats, allStaff, apiReady } = await fetchAdminPayload();
      setDepartments(liveDepts);
      setStats(systemStats);
      setStaffMembers(allStaff);
      setProvisioningReady(apiReady);
    } catch (e) {
      console.error('Error loading admin portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchAdminPayload()
      .then(({ liveDepts, systemStats, allStaff, apiReady }) => {
        if (!active) return;
        setDepartments(liveDepts);
        setStats(systemStats);
        setStaffMembers(allStaff);
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
  }, []);

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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-l-4 border-l-blue-900 shadow-xs">
              <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-blue-900" /> Departments
              </div>
              <div className="text-2xl font-bold text-slate-950 mt-1.5">{stats.totalDepartments}</div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">Academic Divisions</div>
            </div>

            <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-l-4 border-l-indigo-900 shadow-xs">
              <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wider">
                <UserCheck className="w-4 h-4 text-indigo-900" /> Total HODs
              </div>
              <div className="text-2xl font-bold text-slate-950 mt-1.5">{stats.totalHods}</div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">Department Heads</div>
            </div>

            <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-l-4 border-l-slate-800 shadow-xs">
              <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wider">
                <Users className="w-4 h-4 text-slate-800" /> Total Faculty
              </div>
              <div className="text-2xl font-bold text-slate-950 mt-1.5">{stats.totalFaculty}</div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">Teaching Personnel</div>
            </div>

            <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-l-4 border-l-emerald-700 shadow-xs">
              <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wider">
                <FileCheck className="w-4 h-4 text-emerald-700" /> Leaves Today
              </div>
              <div className="text-2xl font-bold text-slate-950 mt-1.5">{stats.activeLeavesToday}</div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">Sanctioned &amp; Active</div>
            </div>
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
                                <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 border border-amber-200 rounded text-[10px]">
                                  Unassigned
                                </span>
                              ) : (
                                <span className="text-slate-800 font-medium">{dept.hodName}</span>
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
                            <td className="py-3 px-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setStaffModalDefaultRole('hod');
                                  setIsAddStaffOpen(true);
                                }}
                                className="text-xs font-bold text-blue-900 hover:underline cursor-pointer"
                              >
                                {dept.hodName === 'To Be Assigned' ? '+ Appoint HOD' : 'Add Staff'}
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
                                  member.role === 'hod'
                                    ? 'bg-indigo-100/90 text-indigo-950 border-indigo-400'
                                    : member.role === 'admin'
                                    ? 'bg-rose-100/90 text-rose-950 border-rose-400'
                                    : 'bg-emerald-100/90 text-emerald-950 border-emerald-400'
                                }`}
                              >
                                {member.role === 'admin' && <Shield className="w-2.5 h-2.5" />}
                                {member.role.toUpperCase()}
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
                            <td className="py-3 px-3.5 text-right whitespace-nowrap">
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
    </ProtectedRoute>
  );
}
