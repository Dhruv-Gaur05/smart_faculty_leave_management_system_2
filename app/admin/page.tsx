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
  Shield
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
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
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2 py-0.5 border border-blue-200">
                  Central System Administration
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {adminDisplayName}
                </h2>
                <p className="text-xs text-slate-600">
                  {adminDisplayDesig}
                </p>
              </div>
              <div className="flex flex-col sm:items-end gap-2 text-xs text-slate-600">
                <div className="space-y-0.5 sm:text-right">
                  <p><span className="font-semibold">Admin ID:</span> {adminDisplayEmpId}</p>
                  <p><span className="font-semibold">Email:</span> {user?.email || mockAdminUser.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDeptFormError(null);
                      setNewDeptName('');
                      setIsAddDeptOpen(true);
                    }}
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
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> Add HOD / Faculty
                  </Button>
                </div>
              </div>
            </div>
          </Card>

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
            <div className="bg-white p-4 border border-slate-300 border-l-4 border-l-blue-900">
              <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-900" /> Departments
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalDepartments}</div>
              <div className="text-[11px] text-slate-500 mt-1">Academic Wings</div>
            </div>

            <div className="bg-white p-4 border border-slate-300 border-l-4 border-l-indigo-900">
              <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-900" /> Total HODs
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalHods}</div>
              <div className="text-[11px] text-slate-500 mt-1">Department Heads</div>
            </div>

            <div className="bg-white p-4 border border-slate-300 border-l-4 border-l-slate-800">
              <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-800" /> Total Faculty
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalFaculty}</div>
              <div className="text-[11px] text-slate-500 mt-1">Teaching Personnel</div>
            </div>

            <div className="bg-white p-4 border border-slate-300 border-l-4 border-l-emerald-800">
              <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-800" /> Leaves Today
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.activeLeavesToday}</div>
              <div className="text-[11px] text-slate-500 mt-1">Approved &amp; Active</div>
            </div>
          </div>

          {/* University Departments Directory */}
          <div id="departments">
            <Card
              title="University Departments & HOD Allocation"
              subtitle="Create departments and appoint Heads of Department (HOD)"
              action={
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
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
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 rounded-none"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
                </div>

                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                    <span>Loading departments from live Supabase...</span>
                  </div>
                ) : filteredDepts.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-300 p-4 space-y-2">
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
                  <div className="border border-slate-300 overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Code</th>
                          <th className="py-2.5 px-3">Academic Department</th>
                          <th className="py-2.5 px-3">Appointed HOD</th>
                          <th className="py-2.5 px-3 text-center">Faculty Count</th>
                          <th className="py-2.5 px-3 text-center">Active Leaves</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredDepts.map((dept) => (
                          <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-900">
                              {dept.code}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {dept.name}
                            </td>
                            <td className="py-2.5 px-3">
                              {dept.hodName === 'To Be Assigned' ? (
                                <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 border border-amber-200 text-[10px]">
                                  Unassigned
                                </span>
                              ) : (
                                <span className="text-slate-800 font-medium">{dept.hodName}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                              {dept.totalFaculty}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold ${
                                  dept.activeLeavesToday > 0
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {dept.activeLeavesToday}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setStaffModalDefaultRole('hod');
                                  setIsAddStaffOpen(true);
                                }}
                                className="text-[11px] font-bold text-blue-900 hover:underline"
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
                      className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
                        staffRoleFilter === 'all'
                          ? 'bg-blue-900 text-white border-blue-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      All Staff ({staffMembers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffRoleFilter('hod')}
                      className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
                        staffRoleFilter === 'hod'
                          ? 'bg-indigo-900 text-white border-indigo-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      HODs Only ({hodCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffRoleFilter('faculty')}
                      className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
                        staffRoleFilter === 'faculty'
                          ? 'bg-emerald-800 text-white border-emerald-800'
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
                      className="py-1.5 px-2.5 text-xs border border-slate-300 bg-white focus:outline-none focus:border-blue-900"
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
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 rounded-none"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                    <span>Loading staff directory...</span>
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-300 text-xs text-slate-500">
                    No staff members match the selected filters.
                  </div>
                ) : (
                  <div className="border border-slate-300 overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Employee ID</th>
                          <th className="py-2.5 px-3">Staff Name</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">Department</th>
                          <th className="py-2.5 px-3">Designation</th>
                          <th className="py-2.5 px-3">Institutional Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredStaff.map((member) => (
                          <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                              {member.employee_id}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {member.name}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase border ${
                                  member.role === 'hod'
                                    ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
                                    : member.role === 'admin'
                                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                }`}
                              >
                                {member.role === 'admin' && <Shield className="w-2.5 h-2.5" />}
                                {member.role.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 font-medium">
                              {member.department_name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {member.designation}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                              {member.email}
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
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Department Full Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Electronics & Communication Engineering"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              disabled={creatingDept}
              className="w-full py-2 px-3 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 bg-white"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Department short code (e.g. ECE) is automatically derived from the department name.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddDeptOpen(false)}
              disabled={creatingDept}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={creatingDept}>
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
    </ProtectedRoute>
  );
}
