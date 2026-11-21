'use client';

import React, { useEffect, useState } from 'react';
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
  PlusSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  ArrowRight,
  Loader2,
  BadgeCheck,
  Building,
  Mail,
  Calendar,
  Layers
} from 'lucide-react';

export default function FacultyDashboardPage() {
  const { user, profile } = useAuth();

  const [loadingData, setLoadingData] = useState(true);
  const [facultyDept, setFacultyDept] = useState<string>('Computer Science & Engineering');
  const [applications, setApplications] = useState<DetailedLeaveApplication[]>([]);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Leave balance placeholder figures for 2026 Academic Session
  const leaveBalanceQuotas = [
    { type: 'Casual Leave (CL)', total: 12, used: 2, remaining: 10, border: 'border-t-blue-900' },
    { type: 'Earned Leave (EL)', total: 15, used: 0, remaining: 15, border: 'border-t-emerald-800' },
    { type: 'Medical Leave (ML)', total: 10, used: 1, remaining: 9, border: 'border-t-amber-700' },
    { type: 'Duty Leave (DL)', total: 8, used: 3, remaining: 5, border: 'border-t-indigo-900' },
  ];

  useEffect(() => {
    let isCancelled = false;
    if (!user) return;

    (async () => {
      try {
        // 1. Fetch faculty profile with department if possible
        const fullProfile = await getFacultyProfile(user.id);
        if (isCancelled) return;
        if (fullProfile?.department_name) {
          setFacultyDept(fullProfile.department_name);
        } else if (profile?.department_id) {
          setFacultyDept('Department of Computer Science & Engineering');
        }

        // 2. Fetch only this faculty's real leave applications from Supabase
        const apps = await getFacultyApplications(user.id);
        if (isCancelled) return;
        setApplications(apps);
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load faculty dashboard data:', err);
          setErrorState('Could not retrieve application records from database.');
        }
      } finally {
        if (!isCancelled) {
          setLoadingData(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [user, profile]);

  // Derived counts
  const pendingCount = applications.filter(
    (a) => a.status === 'pending' || a.status === 'clarification'
  ).length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;

  const facultyDisplayName = profile?.name || user?.email?.split('@')[0] || 'Academic Faculty';
  const facultyDesignation = profile?.designation || 'Assistant Professor';
  const facultyEmpId = profile?.employee_id || `FAC-${user?.id?.substring(0, 6) || '2026'}`;

  // Take the 5 most recent applications for the dashboard preview
  const recentApplications = applications.slice(0, 5);

  return (
    <ProtectedRoute allowedRoles={['faculty']}>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Consistent University Sidebar */}
        <Sidebar
          role="faculty"
          userName={facultyDisplayName}
          department={facultyDept}
          designation={facultyDesignation}
        />

        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          {/* Institutional Header Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white p-6 rounded-2xl border-l-8 border-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30 inline-block mb-1.5 font-mono">
                Faculty Academic Portal
              </span>
              <h1 className="text-xl sm:text-2xl font-bold uppercase font-serif tracking-wide text-white">
                Welcome, {facultyDisplayName}
              </h1>
              <p className="text-xs text-blue-200/90 mt-0.5 font-medium">
                {facultyDesignation} — {facultyDept}
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

          {/* Profile Quick Strip */}
          <div className="bg-white rounded-xl border border-slate-200 p-4.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs shadow-xs">
            <div className="space-y-0.5">
              <span className="text-slate-600 text-[11px] uppercase font-bold tracking-wider block">
                Employee Code
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-blue-900" />
                {facultyEmpId}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-600 text-[11px] uppercase font-bold tracking-wider block">
                Academic Unit
              </span>
              <span className="font-semibold text-slate-900 truncate block flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-500" />
                {facultyDept}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-600 text-[11px] uppercase font-bold tracking-wider block">
                Official Email
              </span>
              <span className="font-semibold text-slate-900 truncate block flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-500" />
                {user?.email}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-600 text-[11px] uppercase font-bold tracking-wider block">
                Leave Session
              </span>
              <span className="font-bold text-blue-900 block flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-900" />
                Academic Year 2026 – 2027
              </span>
            </div>
          </div>

          {/* Leave Application Status Metrics */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-900" />
                Application Overview &amp; Status
              </h2>
              <Link
                href="/faculty/applications"
                className="text-xs text-blue-900 font-bold hover:underline flex items-center gap-1"
              >
                Full Application History <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Pending Count */}
              <div className="bg-white rounded-xl border border-amber-300/80 p-5 relative overflow-hidden shadow-xs hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                      Pending Applications
                    </span>
                    <span className="text-3xl font-bold text-slate-950 mt-1 block">
                      {loadingData ? '—' : pendingCount}
                    </span>
                    <span className="text-xs text-slate-600 mt-1 block font-medium">
                      Awaiting Department Head (HOD) review
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Approved Count */}
              <div className="bg-white rounded-xl border border-emerald-300/80 p-5 relative overflow-hidden shadow-xs hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                      Approved Applications
                    </span>
                    <span className="text-3xl font-bold text-slate-950 mt-1 block">
                      {loadingData ? '—' : approvedCount}
                    </span>
                    <span className="text-xs text-slate-600 mt-1 block font-medium">
                      Sanctioned &amp; recorded in university registry
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Rejected Count */}
              <div className="bg-white rounded-xl border border-rose-300/80 p-5 relative overflow-hidden shadow-xs hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider block">
                      Rejected Applications
                    </span>
                    <span className="text-3xl font-bold text-slate-950 mt-1 block">
                      {loadingData ? '—' : rejectedCount}
                    </span>
                    <span className="text-xs text-slate-600 mt-1 block font-medium">
                      Returned with departmental remarks
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Leave Balance Placeholder Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-900" />
                Session Leave Balances (Annual Entitlement)
              </h2>
              <span className="text-xs font-semibold text-slate-600">Official Quotas</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {leaveBalanceQuotas.map((b) => (
                <div key={b.type} className={`bg-white rounded-xl p-4.5 border border-slate-200 border-t-4 ${b.border} shadow-xs`}>
                  <div className="text-xs font-bold text-slate-800 truncate">{b.type}</div>
                  <div className="text-2xl font-bold text-slate-950 mt-1">
                    {b.remaining}
                    <span className="text-xs font-semibold text-slate-500 ml-1">/ {b.total} Days</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-2 flex justify-between font-medium">
                    <span>Used: {b.used} d</span>
                    <span className="font-bold text-emerald-800">Avail: {b.remaining} d</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Leave Applications Section */}
          <Card
            title="Recent Leave Applications"
            subtitle="Live records from Supabase database for this faculty member"
          >
            {loadingData ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
                <p className="text-xs text-slate-600 font-medium">Fetching leave applications from Supabase...</p>
              </div>
            ) : errorState ? (
              <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorState}</span>
              </div>
            ) : applications.length === 0 ? (
              /* Clean Empty State */
              <div className="py-10 text-center space-y-3 bg-slate-50 border border-dashed border-slate-300 p-6">
                <div className="w-12 h-12 bg-white border border-slate-200 text-blue-900 flex items-center justify-center mx-auto shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase font-serif">
                    No Leave Applications on Record
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                    You have not submitted any leave applications for the current academic session. When you submit a leave request, its status and approval history will appear here in real time.
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/faculty/apply-leave">
                    <Button variant="primary" size="sm">
                      <PlusSquare className="w-4 h-4 mr-1.5" /> Submit First Leave Application
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* Real Applications Table */
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-800 uppercase tracking-wider font-bold text-[10px]">
                        <th className="py-3 px-3.5">Application ID</th>
                        <th className="py-3 px-3.5">Leave Category</th>
                        <th className="py-3 px-3.5">Leave Period</th>
                        <th className="py-3 px-3.5">Days</th>
                        <th className="py-3 px-3.5">Current Status</th>
                        <th className="py-3 px-3.5">Submitted On</th>
                        <th className="py-3 px-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {recentApplications.map((app) => (
                        <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-3.5 font-mono font-bold text-blue-900">
                            <Link href={`/faculty/applications/${app.id}`} className="hover:underline">
                              {app.id}
                            </Link>
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-slate-900">
                            {app.leave_type?.name || 'Casual Leave'}
                          </td>
                          <td className="py-3 px-3.5 text-slate-700 font-medium">
                            {app.from_date} <span className="text-slate-400 font-normal">to</span> {app.to_date}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-950">
                            {app.days} {app.days === 1 ? 'Day' : 'Days'}
                          </td>
                          <td className="py-3 px-3.5">
                            <Badge status={app.status} />
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 font-mono text-[11px]">
                            {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <Link
                              href={`/faculty/applications/${app.id}`}
                              className="text-blue-900 hover:text-blue-950 font-bold hover:underline inline-flex items-center text-xs"
                            >
                              Details <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">
                    Showing {recentApplications.length} of {applications.length} applications
                  </span>
                  <Link
                    href="/faculty/applications"
                    className="font-bold text-blue-900 hover:underline flex items-center gap-1"
                  >
                    View All Leave Applications ({applications.length}) <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
