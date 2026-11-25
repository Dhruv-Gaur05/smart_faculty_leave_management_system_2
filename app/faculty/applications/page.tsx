'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  getFacultyApplications,
  getFacultyProfile,
  getLeaveTypes,
  computeFacultyLeaveBalances,
  DetailedLeaveApplication,
} from '@/lib/supabase/faculty';
import { LeaveTypeRow } from '@/types/database';
import { LeaveSanctionOrderModal } from '@/components/leave/LeaveSanctionOrderModal';
import { PrintablePassSlipModal } from '@/components/leave/PrintablePassSlipModal';
import {
  FileText,
  PlusSquare,
  Search,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  HelpCircle,
  Calendar,
  Layers
} from 'lucide-react';

export default function FacultyApplicationsPage() {
  const { user, profile } = useAuth();

  const [applications, setApplications] = useState<DetailedLeaveApplication[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState('Computer Science & Engineering');
  const [isSanctionSlipOpen, setIsSanctionSlipOpen] = useState(false);
  const [isPassSlipOpen, setIsPassSlipOpen] = useState(false);
  const [selectedSanctionApp, setSelectedSanctionApp] = useState<DetailedLeaveApplication | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'clarification'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const loadData = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) {
      setLoading(true);
    }
    setErrorState(null);

    try {
      const [prof, apps, types] = await Promise.all([
        getFacultyProfile(user.id),
        getFacultyApplications(user.id),
        getLeaveTypes(),
      ]);

      if (prof?.department_name) {
        setDepartmentName(prof.department_name);
      }

      setApplications(apps);
      setLeaveTypes(types);
    } catch (err) {
      console.error('Failed to load applications:', err);
      setErrorState('Could not retrieve applications from database.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let isCancelled = false;
    if (!user) return;

    (async () => {
      try {
        const [prof, apps, types] = await Promise.all([
          getFacultyProfile(user.id),
          getFacultyApplications(user.id),
          getLeaveTypes(),
        ]);

        if (isCancelled) return;
        if (prof?.department_name) {
          setDepartmentName(prof.department_name);
        }

        setApplications(apps);
        setLeaveTypes(types);
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load applications:', err);
          setErrorState('Could not retrieve applications from database.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  // Dynamically compute real-time leave balances for quota tracing
  const leaveBalances = useMemo(() => {
    return computeFacultyLeaveBalances(leaveTypes, applications);
  }, [leaveTypes, applications]);

  // Derived counts
  const totalCount = applications.length;
  const pendingCount = applications.filter((a) => a.status === 'pending' || a.status === 'clarification').length;
  const clarificationCount = applications.filter((a) => a.status === 'clarification').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;

  // Filtered applications based on search, status, and category
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && app.status !== 'pending' && app.status !== 'clarification') {
          return false;
        } else if (statusFilter !== 'pending' && app.status !== statusFilter) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'all') {
        const typeMatch = app.leave_type_id === categoryFilter || app.leave_type?.name === categoryFilter;
        if (!typeMatch) return false;
      }

      // Search query filter (search in ID, reason, or leave category name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = app.id.toLowerCase().includes(q);
        const reasonMatch = app.reason.toLowerCase().includes(q);
        const typeMatch = (app.leave_type?.name || '').toLowerCase().includes(q);
        return idMatch || reasonMatch || typeMatch;
      }

      return true;
    });
  }, [applications, statusFilter, categoryFilter, searchQuery]);

  const facultyDisplayName = profile?.name || user?.email?.split('@')[0] || 'Academic Faculty';
  const facultyDesignation = profile?.designation || 'Assistant Professor';

  return (
    <ProtectedRoute allowedRoles={['faculty']}>
      <div className="flex flex-col md:flex-row gap-6">
        <Sidebar
          role="faculty"
          userName={facultyDisplayName}
          department={departmentName}
          designation={facultyDesignation}
        />

        <div className="flex-1 space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white p-6 rounded-2xl border-l-8 border-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30 inline-block mb-1.5 font-mono">
                Official Leave Records
              </span>
              <h1 className="text-xl sm:text-2xl font-bold uppercase font-serif tracking-wide text-white">
                My Leave Applications
              </h1>
              <p className="text-xs text-blue-200/90 mt-0.5 font-medium">
                Complete historical record of submitted leave applications and departmental review audit trail
              </p>
            </div>
            <div>
              <Link href="/faculty/apply-leave">
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-xs px-4 py-2.5 rounded-lg shadow-sm"
                >
                  <PlusSquare className="w-4 h-4 mr-1.5" /> Apply for Leave
                </Button>
              </Link>
            </div>
          </div>

          {/* Action Required: Clarification Notice Banner */}
          {clarificationCount > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <HelpCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900 text-sm">Action Required: Clarification Requested</p>
                  <p className="text-amber-800 text-xs mt-0.5">
                    Your Head of Department requested clarification on <strong>{clarificationCount}</strong> leave application{clarificationCount > 1 ? 's' : ''}. Please provide your clarification response so the review can proceed.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shrink-0 cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                View Clarification Requests
              </button>
            </div>
          )}

          {/* Quick Filter Counts Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setStatusFilter('all')}
              className={`p-3.5 text-left rounded-xl border transition-all cursor-pointer ${statusFilter === 'all'
                ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
            >
              <span className={`text-[10px] uppercase font-bold tracking-wider block ${statusFilter === 'all' ? 'text-blue-100' : 'text-slate-600'}`}>
                All Applications
              </span>
              <span className="text-2xl font-bold mt-1 block">{loading ? '—' : totalCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter('pending')}
              className={`p-3.5 text-left rounded-xl border transition-all cursor-pointer ${statusFilter === 'pending'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
            >
              <span className={`text-[10px] uppercase font-bold tracking-wider block ${statusFilter === 'pending' ? 'text-amber-100' : 'text-amber-800 font-bold'}`}>
                Pending HOD
              </span>
              <span className="text-2xl font-bold mt-1 block">{loading ? '—' : pendingCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter('approved')}
              className={`p-3.5 text-left rounded-xl border transition-all cursor-pointer ${statusFilter === 'approved'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
            >
              <span className={`text-[10px] uppercase font-bold tracking-wider block ${statusFilter === 'approved' ? 'text-emerald-100' : 'text-emerald-800 font-bold'}`}>
                Approved
              </span>
              <span className="text-2xl font-bold mt-1 block">{loading ? '—' : approvedCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter('rejected')}
              className={`p-3.5 text-left rounded-xl border transition-all cursor-pointer ${statusFilter === 'rejected'
                ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
            >
              <span className={`text-[10px] uppercase font-bold tracking-wider block ${statusFilter === 'rejected' ? 'text-rose-100' : 'text-rose-800 font-bold'}`}>
                Rejected
              </span>
              <span className="text-2xl font-bold mt-1 block">{loading ? '—' : rejectedCount}</span>
            </button>
          </div>

          {/* Session Leave Quota & Category Trace */}
          <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-900" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Session Leave Quotas &amp; Category Trace (Academic Year 2026–2027)
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Click any category to filter and trace your applications
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {leaveBalances.map((b) => {
                const isSelected = categoryFilter === b.id || categoryFilter === b.type;
                return (
                  <button
                    key={b.type}
                    type="button"
                    onClick={() => setCategoryFilter(isSelected ? 'all' : (b.id || b.type))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${isSelected
                      ? 'bg-blue-50/90 border-blue-900 ring-2 ring-blue-900/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                      }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {b.shortCode}
                        </span>
                        {b.pending > 0 && (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            {b.pending}d pending
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1 truncate" title={b.type}>
                        {b.type}
                      </div>
                      <div className="text-xl font-bold text-slate-950 mt-1">
                        {b.remaining}
                        <span className="text-xs font-normal text-slate-500 ml-1">/ {b.total}d</span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1.5">
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${(b.used / (b.total || 1)) * 100}%` }}
                          className="bg-emerald-600 h-full"
                          title={`Approved: ${b.used}d`}
                        />
                        <div
                          style={{ width: `${(b.pending / (b.total || 1)) * 100}%` }}
                          className="bg-amber-400 h-full"
                          title={`Pending: ${b.pending}d`}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600 font-medium">
                        <span>Used: {b.used}d</span>
                        <span className={b.remaining > 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                          Avail: {b.remaining}d
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {categoryFilter !== 'all' && (
              <div className="flex items-center justify-between pt-1 text-xs bg-blue-50/60 p-2 rounded-lg border border-blue-200">
                <span className="text-blue-950 text-[11px] font-medium flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-900" />
                  Filtering applications by category: <strong className="font-bold">{categoryFilter}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className="text-[11px] text-blue-900 font-bold hover:underline cursor-pointer"
                >
                  Clear Category Filter
                </button>
              </div>
            )}
          </div>

          {/* Search & Actions Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search by ID, reason, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 font-medium shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData(true)}
                disabled={loading}
                className="text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Applications Table Card */}
          <Card
            title={`Application Records (${filteredApplications.length})`}
            subtitle="Filtered view of your personal academic leave submissions"
          >
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
                <p className="text-xs text-slate-600 font-medium">Retrieving applications from Supabase database...</p>
              </div>
            ) : errorState ? (
              <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorState}</span>
              </div>
            ) : filteredApplications.length === 0 ? (
              /* Empty state */
              <div className="py-12 text-center space-y-3 bg-slate-50 border border-dashed border-slate-300 p-6">
                <div className="w-12 h-12 bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase font-serif">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No Matching Applications Found'
                      : 'No Leave Applications Found'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No application records match your current search query or filter selection. Try clearing the filters.'
                      : 'You have not submitted any leave applications for this academic year.'}
                  </p>
                </div>
                {searchQuery || statusFilter !== 'all' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Clear Filter Criteria
                  </Button>
                ) : (
                  <div className="pt-2">
                    <Link href="/faculty/apply-leave">
                      <Button variant="primary" size="sm">
                        <PlusSquare className="w-4 h-4 mr-1.5" /> Submit New Leave Application
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              /* Full Applications Table */
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-800 uppercase tracking-wider font-bold text-[10px]">
                      <th className="py-3 px-3.5">Application ID</th>
                      <th className="py-3 px-3.5">Leave Category</th>
                      <th className="py-3 px-3.5">Leave Span</th>
                      <th className="py-3 px-3.5">Duration</th>
                      <th className="py-3 px-3.5">Reason / Justification</th>
                      <th className="py-3 px-3.5">Status</th>
                      <th className="py-3 px-3.5">Submitted On</th>
                      <th className="py-3 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {filteredApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-blue-900">
                          <Link href={`/faculty/applications/${app.id}`} className="hover:underline">
                            {app.id}
                          </Link>
                        </td>
                        <td className="py-3 px-3.5 font-semibold text-slate-900">
                          {app.leave_type?.name || 'Casual Leave'}
                        </td>
                        <td className="py-3 px-3.5 text-slate-700 font-mono text-[11px] font-medium">
                          {app.from_date} <span className="text-slate-400 font-normal">→</span> {app.to_date}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-950">
                          {app.days} {app.days === 1 ? 'Day' : 'Days'}
                        </td>
                        <td className="py-3 px-3.5 text-slate-700 max-w-xs truncate text-[11px] font-medium" title={app.reason}>
                          {app.reason}
                        </td>
                        <td className="py-3 px-3.5">
                          <Badge status={app.status} />
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 font-mono text-[11px]">
                          {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {app.status === 'approved' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSanctionApp(app);
                                    setIsSanctionSlipOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded-lg text-xs shadow-2xs transition-colors shrink-0 cursor-pointer"
                                  title="Download Official Sanction Slip"
                                >
                                  <FileText className="w-3 h-3 text-emerald-700" />
                                  Sanction Slip
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSanctionApp(app);
                                    setIsPassSlipOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 font-bold rounded-lg text-xs shadow-2xs transition-colors shrink-0 cursor-pointer"
                                  title="Print Campus Movement Gate Pass Slip"
                                >
                                  Gate Pass
                                </button>
                              </>
                            )}
                            {app.status === 'clarification' ? (
                              <Link
                                href={`/faculty/applications/${app.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition-colors shrink-0"
                              >
                                <MessageSquare className="w-3 h-3 text-slate-950" />
                                Respond
                              </Link>
                            ) : (
                              <Link
                                href={`/faculty/applications/${app.id}`}
                                className="text-blue-900 hover:text-blue-950 font-bold hover:underline inline-flex items-center text-xs"
                              >
                                View Record <ArrowRight className="w-3.5 h-3.5 ml-1" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {selectedSanctionApp && (
          <>
            <LeaveSanctionOrderModal
              isOpen={isSanctionSlipOpen}
              onClose={() => {
                setIsSanctionSlipOpen(false);
                setSelectedSanctionApp(null);
              }}
              leave={{
                id: selectedSanctionApp.id,
                facultyName: profile?.name || user?.email?.split('@')[0],
                employeeId: profile?.employee_id,
                designation: profile?.designation,
                department: departmentName,
                leaveType: selectedSanctionApp.leave_type?.name || 'Leave',
                startDate: selectedSanctionApp.from_date,
                endDate: selectedSanctionApp.to_date,
                totalDays: Number(selectedSanctionApp.days) || 1,
                reason: selectedSanctionApp.reason,
                status: selectedSanctionApp.status,
                appliedOn: selectedSanctionApp.submitted_at,
                contactDuringLeave: selectedSanctionApp.contact_during_leave || undefined,
                approvalsHistory: selectedSanctionApp.approvals,
                facultySignatureUrl: profile?.signature_url || undefined,
              }}
            />

            <PrintablePassSlipModal
              isOpen={isPassSlipOpen}
              onClose={() => {
                setIsPassSlipOpen(false);
                setSelectedSanctionApp(null);
              }}
              leave={{
                id: selectedSanctionApp.id,
                facultyName: profile?.name || user?.email?.split('@')[0],
                employeeId: profile?.employee_id,
                designation: profile?.designation,
                department: departmentName,
                leaveType: selectedSanctionApp.leave_type?.name || 'Leave',
                startDate: selectedSanctionApp.from_date,
                endDate: selectedSanctionApp.to_date,
                totalDays: Number(selectedSanctionApp.days) || 1,
                reason: selectedSanctionApp.reason,
                status: selectedSanctionApp.status,
                appliedOn: selectedSanctionApp.submitted_at,
                contactDuringLeave: selectedSanctionApp.contact_during_leave || undefined,
                avatarUrl: profile?.avatar_url || undefined,
                facultySignatureUrl: profile?.signature_url || undefined,
              }}
            />
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
