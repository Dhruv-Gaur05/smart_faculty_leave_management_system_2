'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  getLeaveTypes,
  submitLeaveApplication,
  getFacultyProfile,
  getFacultyApplications,
  computeFacultyLeaveBalances,
  DetailedLeaveApplication,
} from '@/lib/supabase/faculty';
import { LeaveTypeRow } from '@/types/database';
import {
  ArrowLeft,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  BadgeCheck,
  Send,
  Phone,
  UploadCloud,
  Info
} from 'lucide-react';

export default function ApplyLeavePage() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRow[]>([]);
  const [applications, setApplications] = useState<DetailedLeaveApplication[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [departmentName, setDepartmentName] = useState('Computer Science & Engineering');

  // Form Fields
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [contactDuringLeave, setContactDuringLeave] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load Leave Types & existing applications from Supabase on mount
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [types, prof, apps] = await Promise.all([
          getLeaveTypes(),
          user ? getFacultyProfile(user.id) : Promise.resolve(null),
          user ? getFacultyApplications(user.id) : Promise.resolve([]),
        ]);

        if (isMounted) {
          setLeaveTypes(types);
          if (types.length > 0) {
            setSelectedTypeId(types[0].id);
          }
          if (prof?.department_name) {
            setDepartmentName(prof.department_name);
          }
          setApplications(apps);
        }
      } catch (err) {
        console.error('Error loading leave form options:', err);
      } finally {
        if (isMounted) setLoadingTypes(false);
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Automatically calculate number of calendar days between From Date and To Date
  const calculatedDays = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    if (end < start) return 0;

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [fromDate, toDate]);

  // Current selected leave type object
  const currentLeaveType = useMemo(() => {
    return leaveTypes.find((t) => t.id === selectedTypeId) || null;
  }, [leaveTypes, selectedTypeId]);

  // Dynamically compute real-time leave balances
  const leaveBalances = useMemo(() => {
    return computeFacultyLeaveBalances(leaveTypes, applications);
  }, [leaveTypes, applications]);

  const activeCategoryBalance = useMemo(() => {
    return leaveBalances.find((b) => b.id === selectedTypeId || b.type === currentLeaveType?.name);
  }, [leaveBalances, selectedTypeId, currentLeaveType]);

  // Form Validation & Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Authenticated user validation
    if (!user) {
      setErrorMessage('You must be signed in to submit a leave application.');
      return;
    }

    // 2. Leave type required
    if (!selectedTypeId || selectedTypeId.trim() === '') {
      setErrorMessage('Please select a valid leave category.');
      return;
    }

    // 3. From date required
    if (!fromDate) {
      setErrorMessage('Please specify the commencing leave date (From Date).');
      return;
    }

    // 4. To date required
    if (!toDate) {
      setErrorMessage('Please specify the concluding leave date (To Date).');
      return;
    }

    // 5. End date cannot be before start date
    if (new Date(toDate) < new Date(fromDate)) {
      setErrorMessage('End date cannot be prior to start date. Please choose a valid date range.');
      return;
    }

    // 6. Number of days must be > 0
    if (calculatedDays <= 0) {
      setErrorMessage('The calculated duration must be at least 1 day.');
      return;
    }

    // 7. Reason required & prevent empty submission
    if (!reason || reason.trim().length === 0) {
      setErrorMessage('Please provide an academic or personal reason for your leave application.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await submitLeaveApplication({
        facultyId: user.id,
        leaveTypeId: selectedTypeId,
        fromDate,
        toDate,
        days: calculatedDays,
        reason: reason.trim(),
        contactDuringLeave: contactDuringLeave.trim(),
      });

      if (error) {
        setErrorMessage(error.message || 'Failed to submit application to the university database.');
        setIsSubmitting(false);
        return;
      }

      if (data) {
        setSuccessMessage(
          `Leave application (ID: ${data.id}) submitted successfully! Your application is now Pending HOD review.`
        );

        // Redirect to /faculty/applications so the faculty sees the newly submitted application as Pending
        setTimeout(() => {
          router.push('/faculty/applications');
        }, 1500);
      }
    } catch (err) {
      console.error('Submission error:', err);
      setErrorMessage('An unexpected error occurred while transmitting your application.');
      setIsSubmitting(false);
    }
  };

  const facultyDisplayName = profile?.name || user?.email?.split('@')[0] || 'Academic Faculty';
  const facultyDesignation = profile?.designation || 'Assistant Professor';
  const facultyEmpId = profile?.employee_id || `FAC-${user?.id?.substring(0, 6) || '2026'}`;

  // Today's date string for input min attribute
  const todayStr = new Date().toISOString().split('T')[0];

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
              <Link
                href="/faculty/dashboard"
                className="text-xs text-amber-300 hover:text-white flex items-center gap-1.5 mb-1.5 font-bold uppercase tracking-wider transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Faculty Dashboard
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold uppercase font-serif tracking-wide text-white">
                Submit Official Leave Application
              </h1>
              <p className="text-xs text-blue-200/90 mt-0.5 font-medium">
                Central University Academic Registry — Leave Application Protocol
              </p>
            </div>
          </div>

          {/* Success Message Banner */}
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 text-xs flex items-start space-x-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-emerald-950">Application Submitted Successfully!</p>
                <p className="mt-0.5 leading-relaxed text-emerald-900">{successMessage}</p>
                <p className="mt-1 font-bold text-emerald-800">
                  Redirecting to your Applications History page...
                </p>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-400 text-rose-950 text-xs flex items-start space-x-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-rose-950">Application Error</p>
                <p className="mt-0.5 leading-relaxed text-rose-900">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Form Card */}
          <Card
            title="Faculty Leave Application Form"
            subtitle="Fill in all mandatory parameters for Head of Department (HOD) evaluation"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Applicant Identification Strip (Read-Only) */}
              <div className="bg-slate-50/90 rounded-xl border border-slate-200 p-4.5">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest block mb-2 font-mono">
                  ● Verified Session Credentials
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-600 block text-[11px] font-semibold">Faculty Member</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">{facultyDisplayName}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px] font-semibold">Employee Code</span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                      <BadgeCheck className="w-4 h-4 text-blue-900" />
                      {facultyEmpId}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px] font-semibold">Designation</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">{facultyDesignation}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px] font-semibold">Department</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">{departmentName}</span>
                  </div>
                </div>
              </div>

              {/* Leave Type and Dates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Leave Type (Loaded from Supabase) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Leave Category <span className="text-rose-600">*</span>
                  </label>
                  {loadingTypes ? (
                    <div className="py-2.5 text-xs text-slate-600 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-900" /> Loading categories...
                    </div>
                  ) : (
                    <select
                      value={selectedTypeId}
                      onChange={(e) => setSelectedTypeId(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-3.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 font-semibold shadow-2xs"
                    >
                      <option value="" disabled>-- Select Leave Category --</option>
                      {leaveTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {currentLeaveType?.description && (
                    <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed font-medium">
                      {currentLeaveType.description}
                    </p>
                  )}
                  {activeCategoryBalance && (
                    <div className="mt-2 p-2 bg-slate-100/90 rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="text-slate-700 font-medium">
                        Session Quota: <strong className="text-slate-950 font-bold">{activeCategoryBalance.remaining}</strong> / {activeCategoryBalance.total} Days Available
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        activeCategoryBalance.remaining > 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                      }`}>
                        {activeCategoryBalance.used > 0 ? `${activeCategoryBalance.used}d consumed` : '100% available'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. From Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    From Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-3.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 font-medium shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">First day of leave</span>
                </div>

                {/* 3. To Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    To Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={fromDate || todayStr}
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-3.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 font-medium shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Final day of leave</span>
                </div>
              </div>

              {/* 4. Automatically Calculated Number of Days */}
              {fromDate && toDate && (
                <div className={`p-4 rounded-xl border flex items-center justify-between text-xs shadow-2xs ${
                  new Date(toDate) < new Date(fromDate)
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : 'bg-blue-50/90 border-blue-200 text-blue-950'
                }`}>
                  <div className="flex items-center space-x-2 font-medium">
                    <Calendar className="w-4 h-4 text-blue-900 shrink-0" />
                    <span>
                      {new Date(toDate) < new Date(fromDate) ? (
                        <span className="font-bold text-rose-800">Invalid Range: End date is earlier than start date</span>
                      ) : (
                        <span>Leave Span: <strong>{fromDate}</strong> to <strong>{toDate}</strong></span>
                      )}
                    </span>
                  </div>
                  <div className="font-mono font-bold text-xs sm:text-sm bg-blue-900 text-white px-3.5 py-1.5 rounded-lg shadow-2xs">
                    {calculatedDays} {calculatedDays === 1 ? 'Calendar Day' : 'Calendar Days'}
                  </div>
                </div>
              )}

              {/* Quota Exceeded Notice */}
              {fromDate && toDate && activeCategoryBalance && calculatedDays > activeCategoryBalance.remaining && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900 block">Quota Exceeded Notice</span>
                    <span className="text-[11px] text-amber-800">
                      The requested duration ({calculatedDays} days) exceeds your available balance ({activeCategoryBalance.remaining} of {activeCategoryBalance.total} days) for <strong>{activeCategoryBalance.type}</strong>. Your HOD may require additional justification.
                    </span>
                  </div>
                </div>
              )}

              {/* 5. Reason for Leave */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Academic Justification / Leave Purpose <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="State the academic justification clearly for HOD review (e.g. Attending conference paper presentation, medical appointment, examination evaluation)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full p-3.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 font-sans shadow-2xs"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  This description is recorded permanently in the university leave registry.
                </span>
              </div>

              {/* 6. Contact During Leave */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Emergency Contact During Absence (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Residential Address or Emergency Mobile (+91 98765 43210)"
                    value={contactDuringLeave}
                    onChange={(e) => setContactDuringLeave(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 shadow-2xs"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[11px] text-slate-600 mt-1 font-medium">
                  Provides department heads with contact details in case of critical academic or examination matters.
                </p>
              </div>

              {/* 7. Supporting Document Placeholder */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Supporting Documentation (Optional / Mandatory for Medical Leave)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/80 text-center flex flex-col items-center justify-center space-y-2 hover:bg-slate-100/60 transition-colors">
                  <UploadCloud className="w-8 h-8 text-blue-900/70" />
                  <span className="text-xs font-bold text-slate-800">
                    {selectedFileName ? `Selected File: ${selectedFileName}` : 'Attach Medical / Duty / Conference Certificate'}
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium">
                    Supports PDF, JPG, or PNG documents up to 5MB
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    disabled={isSubmitting}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFileName(file.name);
                      }
                    }}
                    className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-xs file:bg-white file:text-slate-800 hover:file:bg-slate-100 cursor-pointer pt-1"
                  />
                </div>
                {currentLeaveType?.requires_document && (
                  <p className="text-[11px] text-amber-900 font-bold mt-2 flex items-center gap-1.5 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <Info className="w-4 h-4 shrink-0 text-amber-700" />
                    Notice: <strong>{currentLeaveType.name}</strong> mandates supporting documentation to be verified by HOD.
                  </p>
                )}
              </div>

              {/* 8. Action Buttons (Submit & Cancel) */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => router.push('/faculty/dashboard')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting || !!successMessage}
                  className="bg-blue-900 hover:bg-blue-950 px-6 py-2.5 text-xs font-bold uppercase tracking-wider"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Submitting to Database...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1.5" />
                      <span>Submit Application</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
