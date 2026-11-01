'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
  RefreshCw
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getHodDepartmentApplications,
  recordHodDecision,
  getDepartmentStats,
  DepartmentStats,
  HodLeaveApplication
} from '@/lib/supabase/hod';

const mockHodUser = {
  name: 'Prof. Ananya Sen',
  designation: 'Head of Department (CSE)',
  department: 'Computer Science & Engineering',
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
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<DepartmentStats>({
    totalFaculty: 1,
    activeLeavesToday: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<LeaveRequest | null>(null);
  const [commentInput, setCommentInput] = useState('');

  const hodDisplayName = profile?.name || mockHodUser.name;
  const hodDisplayDesig = profile?.designation || mockHodUser.designation;
  const hodDisplayEmpId = profile?.employee_id || mockHodUser.employeeId;
  const hodDisplayEmail = user?.email || mockHodUser.email;
  const hodDisplayDept = mockHodUser.department;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [liveApps, deptStats] = await Promise.all([
        getHodDepartmentApplications(),
        getDepartmentStats(profile?.department_id),
      ]);

      if (liveApps.length > 0) {
        setRequests(liveApps as LeaveRequest[]);
      } else {
        // Fallback to sample request if database has no entries
        setRequests(initialPendingRequests);
      }
      setStats(deptStats);
    } catch (e) {
      console.error('Error loading HOD portal data:', e);
      setRequests(initialPendingRequests);
    } finally {
      setLoading(false);
    }
  }, [profile?.department_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDecision = async (
    id: string,
    newStatus: 'Approved' | 'Rejected' | 'Clarification Requested'
  ) => {
    setProcessingId(id);
    let dbAction: 'approved' | 'rejected' | 'clarification' = 'approved';
    if (newStatus === 'Rejected') dbAction = 'rejected';
    if (newStatus === 'Clarification Requested') dbAction = 'clarification';

    const remarks = commentInput || `Updated by HOD (${newStatus})`;

    // Call Supabase update
    if (user?.id) {
      await recordHodDecision(id, user.id, dbAction, remarks);
    }

    setRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? { ...req, status: newStatus, hodComment: remarks }
          : req
      )
    );

    setActionFeedback(`Application ${id} status updated to "${newStatus}" and recorded in Supabase audit.`);
    setSelectedItem(null);
    setCommentInput('');
    setProcessingId(null);
    setTimeout(() => setActionFeedback(null), 5000);
  };

  return (
    <ProtectedRoute allowedRoles={['hod']}>
      <div className="flex flex-col md:flex-row gap-6">
        <Sidebar
          role="hod"
          userName={hodDisplayName}
          department={hodDisplayDept}
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
              <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
                <p><span className="font-semibold">HOD ID:</span> {hodDisplayEmpId}</p>
                <p><span className="font-semibold">Email:</span> {hodDisplayEmail}</p>
                <button
                  onClick={loadData}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-900 hover:underline pt-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh Live Queue
                </button>
              </div>
            </div>
          </Card>

          {/* Department Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 border border-slate-300">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-900" /> Total Dept Faculty
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
                {requests.filter(r => r.status === 'Pending HOD').length} <span className="text-xs font-normal text-slate-500">Requests</span>
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
                {requests.filter(r => r.status === 'Approved').length} <span className="text-xs font-normal text-slate-500">Total</span>
              </div>
            </div>
          </div>

          {/* Global Action Feedback Notification */}
          {actionFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* Pending Faculty Applications Queue */}
          <div id="approvals">
            <Card
              title="Faculty Leave Review Queue"
              subtitle="Evaluate leave applications, verify academic syllabus coverage, and recommend action"
            >
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                  <span>Loading live applications from Supabase database...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((item) => (
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
        </div>
      </div>
    </ProtectedRoute>
  );
}
