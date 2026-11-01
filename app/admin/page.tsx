'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DepartmentSummary } from '@/types';
import {
  Building2,
  Users,
  FileCheck,
  Plus,
  Settings,
  Database,
  Search,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getAdminDepartments,
  getAdminSystemStats,
  AdminSystemStats
} from '@/lib/supabase/admin';

const mockAdminUser = {
  name: 'Dr. Vikramaditya Rao',
  designation: 'Dean of Academic Affairs / System Admin',
  department: 'Central Administration',
  employeeId: 'ADM-2026-001',
  email: 'admin@university.edu',
};

const defaultDepartments: DepartmentSummary[] = [
  {
    id: 'D-CSE',
    name: 'Computer Science & Engineering',
    code: 'CSE',
    hodName: 'Prof. Ananya Sen',
    totalFaculty: 1,
    activeLeavesToday: 0,
  },
];

export default function AdminPortalPage() {
  const { user, profile } = useAuth();
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [stats, setStats] = useState<AdminSystemStats>({
    totalDepartments: 1,
    totalFaculty: 1,
    activeLeavesToday: 0,
    databaseStatus: 'Supabase Connected & Protected',
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const adminDisplayName = profile?.name || mockAdminUser.name;
  const adminDisplayDesig = profile?.designation || mockAdminUser.designation;
  const adminDisplayEmpId = profile?.employee_id || mockAdminUser.employeeId;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [liveDepts, systemStats] = await Promise.all([
        getAdminDepartments(),
        getAdminSystemStats(),
      ]);

      if (liveDepts.length > 0) {
        setDepartments(liveDepts);
      } else {
        setDepartments(defaultDepartments);
      }
      setStats(systemStats);
    } catch (e) {
      console.error('Error loading admin portal data:', e);
      setDepartments(defaultDepartments);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDepts = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.hodName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex flex-col md:flex-row gap-6">
        <Sidebar
          role="admin"
          userName={adminDisplayName}
          department={mockAdminUser.department}
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
              <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
                <p><span className="font-semibold">Admin ID:</span> {adminDisplayEmpId}</p>
                <p><span className="font-semibold">Email:</span> {user?.email || mockAdminUser.email}</p>
                <button
                  onClick={loadData}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-900 hover:underline pt-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh Registry
                </button>
              </div>
            </div>
          </Card>

          {/* System Overview Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 border border-slate-300 border-l-4 border-l-blue-900">
              <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-900" /> Total Departments
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalDepartments}</div>
              <div className="text-[11px] text-slate-500 mt-1">Registered Departments</div>
            </div>

            <div className="bg-white p-4 border border-slate-300 border-l-4 border-l-slate-800">
              <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-800" /> Total Faculty Staff
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalFaculty}</div>
              <div className="text-[11px] text-slate-500 mt-1">Verified Personnel</div>
            </div>

            <div className="bg-white p-4 border border-slate-300 border-l-4 border-l-emerald-800">
              <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-800" /> Leaves Today
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.activeLeavesToday}</div>
              <div className="text-[11px] text-slate-500 mt-1">Active Leave Records</div>
            </div>

            <div className="bg-white p-4 border border-slate-300 border-l-4 border-l-indigo-900">
              <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-900" /> Database Status
              </div>
              <div className="text-base font-bold text-emerald-700 mt-2">
                Connected
              </div>
              <div className="text-[11px] text-slate-500">{stats.databaseStatus}</div>
            </div>
          </div>

          {/* University Departments Directory */}
          <div id="departments">
            <Card
              title="University Departments & HOD Allocation"
              subtitle="Registered university academic units synchronized with PostgreSQL database"
            >
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search departments by name, code, or HOD..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 rounded-none"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
                  </div>
                </div>

                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                    <span>Loading departments from live Supabase...</span>
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
                            <td className="py-2.5 px-3 text-slate-700">
                              {dept.hodName}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-700">
                              {dept.totalFaculty}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 text-[10px] font-bold ${
                                dept.activeLeavesToday > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {dept.activeLeavesToday}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="text-[11px] font-medium text-emerald-700">
                                Active Unit
                              </span>
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
    </ProtectedRoute>
  );
}
