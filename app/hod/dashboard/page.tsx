'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  UserCheck,
  LogOut,
  CheckSquare,
  Users,
  CheckCircle2,
  Mail,
  BadgeCheck
} from 'lucide-react';

export default function HodDashboardPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <ProtectedRoute allowedRoles={['hod']}>
      <div className="space-y-6">
        {/* Official Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white p-6 rounded-2xl border-l-8 border-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30 inline-block mb-1.5 font-mono">
              Authorized HOD Session
            </span>
            <h1 className="text-xl sm:text-2xl font-bold uppercase font-serif tracking-wide text-white">
              Head of Department (HOD) Portal
            </h1>
            <p className="text-xs text-blue-200/90 mt-0.5 font-medium">
              Welcome, {profile?.name || user?.email} (Department Review Officer)
            </p>
          </div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSignOut}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white rounded-lg px-3.5 py-2"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Sign Out
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <Card title="HOD Institutional Credentials" subtitle="Department leadership profile and approval authority">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-600 font-bold block text-[11px] uppercase tracking-wider">HOD Name</span>
              <span className="text-slate-900 font-bold text-sm mt-1 block flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-900" />
                {profile?.name || 'Prof. HOD'}
              </span>
            </div>

            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-600 font-bold block text-[11px] uppercase tracking-wider">Employee ID</span>
              <span className="text-slate-900 font-mono font-bold text-sm mt-1 block flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-blue-900" />
                {profile?.employee_id || 'HOD-ID'}
              </span>
            </div>

            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-600 font-bold block text-[11px] uppercase tracking-wider">Designation</span>
              <span className="text-slate-900 font-bold mt-1 block text-sm">
                {profile?.designation || 'Head of Department'}
              </span>
            </div>

            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-600 font-bold block text-[11px] uppercase tracking-wider">Security Level</span>
              <span className="text-blue-900 font-bold uppercase mt-1 block text-sm">
                {profile?.role || 'HOD'} (Approver)
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between text-xs text-slate-700 gap-2 font-medium">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-slate-500" />
              <span>Institutional Email: <strong className="text-slate-900">{user?.email}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5 text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Approval Authority: Verified &amp; Active</span>
            </div>
          </div>
        </Card>

        {/* Quick Review Portal Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Pending Approvals" subtitle="Department Faculty Queue">
            <p className="text-xs text-slate-700 leading-relaxed mb-4 font-medium">
              Evaluate, approve, reject, or request clarification on incoming faculty leave applications.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="w-full py-2.5 rounded-lg font-bold"
              onClick={() => router.push('/hod')}
            >
              <CheckSquare className="w-4 h-4 mr-1.5" /> Open Approvals Queue
            </Button>
          </Card>

          <Card title="Department Faculty" subtitle="Faculty Roster & Availability">
            <p className="text-xs text-slate-700 leading-relaxed mb-4 font-medium">
              View department faculty members, active leaves today, and teaching substitution coverage.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="w-full py-2.5 rounded-lg font-bold"
              onClick={() => router.push('/hod#faculty')}
            >
              <Users className="w-4 h-4 mr-1.5" /> View Department Staff
            </Button>
          </Card>

          <Card title="Access Policy" subtitle="Role Guard">
            <p className="text-xs text-slate-700 leading-relaxed mb-2 font-medium">
              This portal is strictly restricted to verified <strong className="text-slate-900">Department Heads (HOD)</strong>.
            </p>
            <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 font-mono font-medium">
              Role: &apos;hod&apos; | RLS Enforced
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
