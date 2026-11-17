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
  DetailedLeaveApplication,
} from '@/lib/supabase/faculty';
import {
  FileText,
  PlusSquare,
  Search,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export default function FacultyApplicationsPage() {
  const { user, profile } = useAuth();

  const [applications, setApplications] = useState<DetailedLeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState('Computer Science & Engineering');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'clarification'>('all');

  const loadData = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) {
      setLoading(true);
    }
    setErrorState(null);

    try {
      const prof = await getFacultyProfile(user.id);
      if (prof?.department_name) {
        setDepartmentName(prof.department_name);
      }

      // Fetch only this faculty's real records
      const apps = await getFacultyApplications(user.id);
      setApplications(apps);
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
        const prof = await getFacultyProfile(user.id);
        if (isCancelled) return;
        if (prof?.department_name) {
          setDepartmentName(prof.department_name);
        }

        const apps = await getFacultyApplications(user.id);
        if (isCancelled) return;
        setApplications(apps);
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

  // Derived counts
  const totalCount = applications.length;
  const pendingCount = applications.filter((a) => a.status === 'pending' || a.status === 'clarification').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;

  // Filtered applications based on search and status
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
  }, [applications, statusFilter, searchQuery]);

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
          <div className="bg-blue-900 text-white p-5 border-l-8 border-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200 bg-white/10 px-2 py-0.5 border border-blue-400/30 inline-block mb-1">
                Official Leave Records
              </span>
              <h1 className="text-xl font-bold uppercase font-serif tracking-wide">
                My Leave Applications
              </h1>
              <p className="text-xs text-blue-100 mt-0.5">
                Complete historical record of submitted leave applications and departmental review audit trail
              </p>
            </div>
            <div>
              <Link href="/faculty/apply-leave">
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-800 border-emerald-600 font-bold uppercase tracking-wider text-xs px-4 py-2"
                >
                  <PlusSquare className="w-4 h-4 mr-1.5" /> Apply for Leave
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Filter Counts Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setStatusFilter('all')}
              className={`p-3 text-left border transition-all ${
                statusFilter === 'all'
                  ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">
                All Applications
              </span>
              <span className="text-2xl font-bold mt-0.5 block">{loading ? '—' : totalCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter('pending')}
              className={`p-3 text-left border transition-all ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider block text-amber-700">
                Pending HOD
              </span>
              <span className="text-2xl font-bold mt-0.5 block">{loading ? '—' : pendingCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter('approved')}
              className={`p-3 text-left border transition-all ${
                statusFilter === 'approved'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider block text-emerald-700">
                Approved
              </span>
              <span className="text-2xl font-bold mt-0.5 block">{loading ? '—' : approvedCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter('rejected')}
              className={`p-3 text-left border transition-all ${
                statusFilter === 'rejected'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider block text-rose-700">
                Rejected
              </span>
              <span className="text-2xl font-bold mt-0.5 block">{loading ? '—' : rejectedCount}</span>
            </button>
          </div>

          {/* Search & Actions Bar */}
          <div className="bg-white border border-slate-300 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search by ID, reason, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 rounded-none bg-white"
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-3">Application ID</th>
                      <th className="py-2.5 px-3">Leave Category</th>
                      <th className="py-2.5 px-3">Leave Span</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Reason / Justification</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Submitted On</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-blue-900">
                          <Link href={`/faculty/applications/${app.id}`} className="hover:underline">
                            {app.id}
                          </Link>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {app.leave_type?.name || 'Casual Leave'}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-mono text-[11px]">
                          {app.from_date} <span className="text-slate-400">→</span> {app.to_date}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {app.days} {app.days === 1 ? 'Day' : 'Days'}
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate text-[11px]" title={app.reason}>
                          {app.reason}
                        </td>
                        <td className="py-3 px-3">
                          <Badge status={app.status} />
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/faculty/applications/${app.id}`}
                            className="text-blue-900 hover:text-blue-950 font-bold hover:underline inline-flex items-center text-xs"
                          >
                            View Record <ArrowRight className="w-3 h-3 ml-0.5" />
                          </Link>
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
    </ProtectedRoute>
  );
}
