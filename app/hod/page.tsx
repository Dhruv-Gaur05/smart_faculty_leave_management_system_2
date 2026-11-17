'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CreateStaffModal } from '@/components/users/CreateStaffModal';
import { LeaveRequest } from '@/types';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  Calendar,
  Clock,
  FileCheck,
  Loader2,
  RefreshCw,
  UserPlus,
  AlertCircle,
  KeyRound,
  FileText
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getHodDepartmentApplications,
  recordHodDecision,
  getDepartmentStats,
  getHodDepartmentInfo,
  getHodDepartmentFaculty,
  DepartmentStats,
  DepartmentFacultyMember
} from '@/lib/supabase/hod';
import { checkUserProvisioningStatus } from '@/lib/supabase/admin';

const mockHodUser = {
  name: 'Prof. Ananya Sen',
  designation: 'Head of Department',
  department: 'Unassigned Department',
  employeeId: 'HOD-CSE-001',
  email: 'hod@university.edu',
};

const initialPendingRequests: LeaveRequest[] = [
  {
    id: 'LV-2026-089',
    facultyId: 'FAC-CSE-2024-042',
    facultyName: 'Dr. Rajesh Sharma',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    employeeId: 'FAC-CSE-2024-042',
    leaveType: 'Casual Leave (CL)',
    startDate: '2026-08-25',
    endDate: '2026-08-26',
    totalDays: 2,
    reason: 'Attending national conference paper presentation session on AI Systems.',
    status: 'Pending HOD',
    appliedOn: '2026-08-18',
  },
];

export default function HodPortalPage() {
  const { user, profile, session, isLiveSupabase } = useAuth();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [departmentFaculty, setDepartmentFaculty] = useState<DepartmentFacultyMember[]>([]);
  const [departmentInfo, setDepartmentInfo] = useState<{ id: string; department_name: string } | null>(null);
  const [stats, setStats] = useState<DepartmentStats>({
    totalFaculty: 0,
    activeLeavesToday: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
  });
  const [provisioningReady, setProvisioningReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<LeaveRequest | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [recordFilter, setRecordFilter] = useState<'all' | 'pending' | 'reviewed'>('all');

  // Add Faculty Modal
  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState(false);

  const hodDisplayName = profile?.name || mockHodUser.name;
  const hodDisplayDesig = profile?.designation || mockHodUser.designation;
  const hodDisplayEmpId = profile?.employee_id || mockHodUser.employeeId;
  const hodDisplayEmail = user?.email || mockHodUser.email;
  const hodDisplayDept =
    departmentInfo?.department_name ||
    (profile?.department_id ? 'Assigned Department' : 'No Department Assigned');

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setActionFeedback({ type, text });
    setTimeout(() => setActionFeedback(null), 6000);
  };

  const deptId = profile?.department_id || null;

  const fetchHodPayload = async (targetDeptId: string | null) => {
    const [liveApps, deptStats, deptMeta, facultyRoster, apiReady] = await Promise.all([
      getHodDepartmentApplications(),
      getDepartmentStats(targetDeptId),
      getHodDepartmentInfo(targetDeptId),
      getHodDepartmentFaculty(targetDeptId),
      checkUserProvisioningStatus(),
    ]);
    return { liveApps, deptStats, deptMeta, facultyRoster, apiReady };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { liveApps, deptStats, deptMeta, facultyRoster, apiReady } = await fetchHodPayload(deptId);

      if (!isLiveSupabase && liveApps.length === 0) {
        setRequests(initialPendingRequests);
      } else {
        setRequests(liveApps as LeaveRequest[]);
      }

      setStats(deptStats);
      setDepartmentInfo(deptMeta);
      setDepartmentFaculty(facultyRoster);
      setProvisioningReady(apiReady);
    } catch (e) {
      console.error('Error loading HOD portal data:', e);
      if (!isLiveSupabase) {
        setRequests(initialPendingRequests);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchHodPayload(deptId)
      .then(({ liveApps, deptStats, deptMeta, facultyRoster, apiReady }) => {
        if (!active) return;
        if (!isLiveSupabase && liveApps.length === 0) {
          setRequests(initialPendingRequests);
        } else {
          setRequests(liveApps as LeaveRequest[]);
        }
        setStats(deptStats);
        setDepartmentInfo(deptMeta);
        setDepartmentFaculty(facultyRoster);
        setProvisioningReady(apiReady);
      })
      .catch((e) => {
        console.error('Error loading HOD portal data:', e);
        if (active && !isLiveSupabase) {
          setRequests(initialPendingRequests);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [deptId, isLiveSupabase]);

  const handleDecision = async (
    id: string,
    newStatus: 'Approved' | 'Rejected' | 'Clarification Requested'
  ) => {
    setProcessingId(id);
    let dbAction: 'approved' | 'rejected' | 'clarification' = 'approved';
    if (newStatus === 'Rejected') dbAction = 'rejected';
    if (newStatus === 'Clarification Requested') dbAction = 'clarification';

    const remarks = commentInput || `Updated by HOD (${newStatus})`;

    if (user?.id) {
      const result = await recordHodDecision(id, user.id, dbAction, remarks);
      if (!result.success) {
        showFeedback('error', `Failed to update application: ${result.error || 'Database error'}`);
        setProcessingId(null);
        return;
      }
    }

    setRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? { ...req, status: newStatus, hodComment: remarks }
          : req
      )
    );

    showFeedback('success', `Application ${id} status updated to "${newStatus}" and recorded in Supabase audit.`);
    setSelectedItem(null);
    setCommentInput('');
    setProcessingId(null);
  };

  const filteredRequests = requests.filter((r) => {
    if (recordFilter === 'pending') {
      return r.status === 'Pending HOD' || r.status === 'Clarification Requested';
    }
    if (recordFilter === 'reviewed') {
      return r.status === 'Approved' || r.status === 'Rejected';
    }
    return true;
  });

  return (
    <ProtectedRoute allowedRoles={['hod']}>
      <div className="flex flex-col md:flex-row gap-6">
        <Sidebar
          role="hod"
          userName={hodDisplayName}
          department={hodDisplayDept}
          designation={hodDisplayDesig}
        />

        <div className="flex-1 space-y-6">
          {/* HOD Header Banner */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2 py-0.5 border border-blue-200">
                  Department Executive Control
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {hodDisplayName}
                </h2>
                <p className="text-xs text-slate-600">
                  {hodDisplayDesig} | {hodDisplayDept}
                </p>
              </div>
              <div className="flex flex-col sm:items-end gap-2 text-xs text-slate-600">
                <div className="space-y-0.5 sm:text-right">
                  <p><span className="font-semibold">HOD ID:</span> {hodDisplayEmpId}</p>
                  <p><span className="font-semibold">Email:</span> {hodDisplayEmail}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadData}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!profile?.department_id}
                    onClick={() => setIsAddFacultyOpen(true)}
                    title={!profile?.department_id ? 'Department must be assigned by Admin first' : 'Add faculty to your department'}
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Dept Faculty
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Unassigned Department Warning */}
          {isLiveSupabase && !loading && !profile?.department_id && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">No Department Assigned to Your HOD Account</p>
                <p className="text-[11px] mt-0.5 leading-relaxed">
                  Please ask your System Administrator to appoint your account to an academic department in the Admin Portal so you can manage your department&apos;s faculty roster and approve leave applications.
                </p>
              </div>
            </div>
          )}

          {/* Service Role Configuration Banner (Visible when key is pending) */}
          {isLiveSupabase && profile?.department_id && provisioningReady === false && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Faculty Onboarding Ready — Waiting for Service Role Key</p>
                <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                  Once <code className="font-mono bg-amber-100 px-1 font-semibold">SUPABASE_SERVICE_ROLE_KEY</code> is added to{' '}
                  <code className="font-mono bg-amber-100 px-1">.env.local</code>, you will be able to onboard new faculty members directly into{' '}
                  <strong>{hodDisplayDept}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Department Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 border border-slate-300">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-900" /> Dept Faculty
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {stats.totalFaculty} <span className="text-xs font-normal text-slate-500">Members</span>
              </div>
            </div>

            <div className="bg-white p-4 border border-slate-300">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-700" /> Pending Approvals
              </div>
              <div className="text-2xl font-bold text-amber-700 mt-1">
                {requests.filter((r) => r.status === 'Pending HOD').length}{' '}
                <span className="text-xs font-normal text-slate-500">Requests</span>
              </div>
            </div>

            <div className="bg-white p-4 border border-slate-300">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-700" /> On Leave Today
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {stats.activeLeavesToday} <span className="text-xs font-normal text-slate-500">Faculty</span>
              </div>
            </div>

            <div className="bg-white p-4 border border-slate-300">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-blue-900" /> Approved Applications
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {requests.filter((r) => r.status === 'Approved').length}{' '}
                <span className="text-xs font-normal text-slate-500">Total</span>
              </div>
            </div>
          </div>

          {/* Global Action Feedback Notification */}
          {actionFeedback && (
            <div
              className={`p-3 border text-xs flex items-center space-x-2 ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              )}
              <span>{actionFeedback.text}</span>
            </div>
          )}

          {/* Pending Faculty Applications Queue */}
          <div id="approvals">
            <div id="records" />
            <Card
              title="Faculty Leave Review Queue"
              subtitle={`Evaluate leave applications from ${hodDisplayDept}`}
              action={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRecordFilter('all')}
                    className={`px-2.5 py-1 text-[11px] font-bold border ${
                      recordFilter === 'all'
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    All ({requests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordFilter('pending')}
                    className={`px-2.5 py-1 text-[11px] font-bold border ${
                      recordFilter === 'pending'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordFilter('reviewed')}
                    className={`px-2.5 py-1 text-[11px] font-bold border ${
                      recordFilter === 'reviewed'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Reviewed
                  </button>
                </div>
              }
            >
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                  <span>Loading live applications from Supabase database...</span>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-300 p-4 space-y-1">
                  <FileText className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    No leave applications found in this category.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    When faculty members from your department submit leave applications, they will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 p-4 border border-slate-300 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {item.facultyName}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({item.designation})
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            ID: <span className="font-mono">{item.employeeId}</span> | Applied: {item.appliedOn}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono bg-slate-200 px-2 py-0.5 text-slate-800">
                            {item.id}
                          </span>
                          <Badge status={item.status} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 font-semibold block">Leave Category:</span>
                          <span className="text-slate-800 font-medium">{item.leaveType}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-semibold block">Requested Dates:</span>
                          <span className="text-slate-800 font-medium">
                            {item.startDate} to {item.endDate} ({item.totalDays} Days)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-semibold block">Academic Justification:</span>
                          <span className="text-slate-800 italic">&quot;{item.reason}&quot;</span>
                        </div>
                      </div>

                      {item.hodComment && (
                        <div className="text-xs bg-white p-2 border border-slate-200 text-slate-700">
                          <span className="font-semibold text-slate-900">HOD Remark:</span> {item.hodComment}
                        </div>
                      )}

                      {/* Decision Action Bar */}
                      {item.status === 'Pending HOD' && (
                        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <input
                            type="text"
                            placeholder="Add HOD review comments or substitution remarks..."
                            value={selectedItem?.id === item.id ? commentInput : ''}
                            onChange={(e) => {
                              setSelectedItem(item);
                              setCommentInput(e.target.value);
                            }}
                            className="flex-1 py-1.5 px-3 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 rounded-none"
                          />

                          <div className="flex items-center space-x-2 shrink-0">
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={processingId === item.id}
                              onClick={() => handleDecision(item.id, 'Approved')}
                            >
                              {processingId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={processingId === item.id}
                              onClick={() => handleDecision(item.id, 'Clarification Requested')}
                            >
                              <HelpCircle className="w-3.5 h-3.5 mr-1" /> Clarify
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={processingId === item.id}
                              onClick={() => handleDecision(item.id, 'Rejected')}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Department Faculty Roster Section */}
          <div id="faculty">
            <Card
              title={`Department Faculty Roster (${departmentFaculty.length})`}
              subtitle={`Teaching staff registered strictly under ${hodDisplayDept}`}
              action={
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!profile?.department_id}
                  onClick={() => setIsAddFacultyOpen(true)}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Faculty Member
                </Button>
              }
            >
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                  <span>Loading department faculty roster...</span>
                </div>
              ) : departmentFaculty.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-300 p-4 space-y-2">
                  <Users className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    No faculty members registered in {hodDisplayDept} yet.
                  </p>
                  {profile?.department_id && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsAddFacultyOpen(true)}
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1" /> Add First Faculty Member
                    </Button>
                  )}
                </div>
              ) : (
                <div className="border border-slate-300 overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Employee ID</th>
                        <th className="py-2.5 px-3">Faculty Name</th>
                        <th className="py-2.5 px-3">Designation</th>
                        <th className="py-2.5 px-3">Institutional Email</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {departmentFaculty.map((fac) => (
                        <tr key={fac.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-900">
                            {fac.employee_id}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {fac.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {fac.designation}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {fac.email}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* HOD Add Faculty Modal (Department Locked to HOD's Own Department) */}
      <CreateStaffModal
        isOpen={isAddFacultyOpen}
        onClose={() => setIsAddFacultyOpen(false)}
        onSuccess={(msg) => {
          showFeedback('success', msg);
          loadData();
        }}
        accessToken={session?.access_token}
        mode="hod"
        defaultRole="faculty"
        departments={[]}
        lockedDepartment={
          profile?.department_id
            ? { id: profile.department_id, name: hodDisplayDept }
            : null
        }
      />
    </ProtectedRoute>
  );
}
