'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LeaveReportRecord, LeaveReportStats } from '@/types';
import { LeaveSanctionOrderModal } from '@/components/leave/LeaveSanctionOrderModal';
import { PrintablePassSlipModal } from '@/components/leave/PrintablePassSlipModal';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Filter,
  RefreshCw,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2
} from 'lucide-react';

interface LeaveReportManagerProps {
  initialDepartment?: string;
  isHodScope?: boolean;
}

export const LeaveReportManager: React.FC<LeaveReportManagerProps> = ({
  initialDepartment,
  isHodScope = false,
}) => {
  const [records, setRecords] = useState<LeaveReportRecord[]>([]);
  const [stats, setStats] = useState<LeaveReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [year, setYear] = useState('2026');
  const [month, setMonth] = useState('all');
  const [department, setDepartment] = useState(initialDepartment || 'all');
  const [leaveType, setLeaveType] = useState('all');
  const [status, setStatus] = useState('all');

  // Modals
  const [selectedApp, setSelectedApp] = useState<LeaveReportRecord | null>(null);
  const [isSanctionModalOpen, setIsSanctionModalOpen] = useState(false);
  const [isGatePassModalOpen, setIsGatePassModalOpen] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (year) params.append('year', year);
      if (month) params.append('month', month);
      if (department) params.append('departmentId', department);
      if (leaveType) params.append('leaveTypeId', leaveType);
      if (status) params.append('status', status);

      const res = await fetch(`/api/reports/leave?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.warn('Error fetching leave reports:', err);
    } finally {
      setLoading(false);
    }
  }, [year, month, department, leaveType, status]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (year) params.append('year', year);
        if (month) params.append('month', month);
        if (department) params.append('departmentId', department);
        if (leaveType) params.append('leaveTypeId', leaveType);
        if (status) params.append('status', status);

        const res = await fetch(`/api/reports/leave?${params.toString()}`);
        const data = await res.json();
        if (isMounted && data.success) {
          setRecords(data.records || []);
          setStats(data.stats || null);
        }
      } catch (err) {
        console.warn('Error fetching leave reports:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [year, month, department, leaveType, status]);

  // Handle direct CSV download
  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    if (department) params.append('departmentId', department);
    if (leaveType) params.append('leaveTypeId', leaveType);
    if (status) params.append('status', status);
    params.append('format', 'csv');

    window.open(`/api/reports/leave?${params.toString()}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredRecords = records.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.facultyName.toLowerCase().includes(q) ||
      r.employeeId.toLowerCase().includes(q) ||
      r.applicationId.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.leaveType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
              Institutional Registry &amp; Compliance
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-serif tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-300" />
            <span>Monthly &amp; Annual Faculty Leave Reports</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Generate and export official audited statements of academic faculty leaves across departments in Excel/CSV or printable formats.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleExportCsv}
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export to Excel / CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Statement
          </Button>

          <button
            onClick={fetchReports}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Aggregate Stats Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Applications
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {stats.totalApplications}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              In selected reporting window
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Approved Leaves
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
              {stats.approvedCount}
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5">
              {stats.totalApplications > 0
                ? `${Math.round((stats.approvedCount / stats.totalApplications) * 100)}% Sanction Rate`
                : '0%'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-200/80 shadow-xs">
            <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-700" />
              Total Days Availed
            </div>
            <div className="text-2xl font-bold font-mono text-blue-900 mt-1">
              {stats.totalLeaveDays}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {stats.totalWorkingDays} deductible working days
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-xs">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Pending &amp; Review
            </div>
            <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
              {stats.pendingCount + stats.clarificationCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {stats.rejectedCount} requests turned down
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-900" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Audited Report Filters
              </span>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search faculty, ID, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Year Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Calendar Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                <option value="all">All Years</option>
                <option value="2026">2026 (Current Academic Year)</option>
                <option value="2025">2025 (Previous Year)</option>
                <option value="2024">2024</option>
              </select>
            </div>

            {/* Month Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                <option value="all">Full Year (Annual)</option>
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            {/* Department (If not locked to HOD scope) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Department
              </label>
              <select
                disabled={isHodScope}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="all">All Departments</option>
                <option value="Computer Science">Computer Science &amp; Eng.</option>
                <option value="Electronics">Electronics &amp; Comm. Eng.</option>
                <option value="Mechanical">Mechanical Engineering</option>
                <option value="Civil">Civil Engineering</option>
                <option value="Electrical">Electrical Engineering</option>
              </select>
            </div>

            {/* Leave Category */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Leave Category
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                <option value="all">All Categories</option>
                <option value="Casual Leave">Casual Leave (CL)</option>
                <option value="Earned Leave">Earned Leave (EL)</option>
                <option value="Medical Leave">Medical Leave (ML)</option>
                <option value="Duty Leave">Duty Leave (DL)</option>
                <option value="Special Casual Leave">Special Casual Leave (SCL)</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved Only</option>
                <option value="pending">Pending Review</option>
                <option value="clarification">Under Clarification</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Reports Data Table */}
      <Card>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Leave Record Register ({filteredRecords.length} records)
            </h3>
            <p className="text-[11px] text-slate-500">
              Official university audit trail for academic faculties
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-900" />
            <p className="text-xs">Compiling leave audit records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">No leave records match the specified filters.</p>
            <p className="text-[11px] text-slate-400">Try broadening your date or department filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">S.No</th>
                  <th className="py-3 px-4">Faculty Details</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Leave Category</th>
                  <th className="py-3 px-4">Date Window</th>
                  <th className="py-3 px-4 text-center">Days</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.facultyName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{r.employeeId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-800 font-medium">{r.department}</span>
                      <span className="block text-[10px] text-slate-400">{r.designation}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-blue-900">{r.leaveType}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                      <div>{r.fromDate}</div>
                      <div className="text-[10px] text-slate-400">to {r.toDate}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                      {r.totalDays}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={r.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      {r.status === 'approved' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedApp(r);
                              setIsSanctionModalOpen(true);
                            }}
                            className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded cursor-pointer transition-colors"
                            title="Official Sanction Order"
                          >
                            Slip
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedApp(r);
                              setIsGatePassModalOpen(true);
                            }}
                            className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded cursor-pointer transition-colors"
                            title="Campus Movement Gate Pass"
                          >
                            Gate Pass
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Sanction Slip Modal */}
      {selectedApp && (
        <LeaveSanctionOrderModal
          isOpen={isSanctionModalOpen}
          onClose={() => {
            setIsSanctionModalOpen(false);
            setSelectedApp(null);
          }}
          leave={{
            id: selectedApp.applicationId || selectedApp.id,
            facultyName: selectedApp.facultyName,
            employeeId: selectedApp.employeeId,
            designation: selectedApp.designation,
            department: selectedApp.department,
            leaveType: selectedApp.leaveType,
            startDate: selectedApp.fromDate,
            endDate: selectedApp.toDate,
            totalDays: selectedApp.totalDays,
            reason: selectedApp.reason,
            status: selectedApp.status,
            appliedOn: selectedApp.appliedDate,
            contactDuringLeave: selectedApp.contactDuringLeave,
          }}
        />
      )}

      {/* Gate Pass Modal */}
      {selectedApp && (
        <PrintablePassSlipModal
          isOpen={isGatePassModalOpen}
          onClose={() => {
            setIsGatePassModalOpen(false);
            setSelectedApp(null);
          }}
          leave={{
            id: selectedApp.applicationId || selectedApp.id,
            facultyName: selectedApp.facultyName,
            employeeId: selectedApp.employeeId,
            designation: selectedApp.designation,
            department: selectedApp.department,
            leaveType: selectedApp.leaveType,
            startDate: selectedApp.fromDate,
            endDate: selectedApp.toDate,
            totalDays: selectedApp.totalDays,
            reason: selectedApp.reason,
            status: selectedApp.status,
            appliedOn: selectedApp.appliedDate,
            contactDuringLeave: selectedApp.contactDuringLeave,
          }}
        />
      )}
    </div>
  );
};
