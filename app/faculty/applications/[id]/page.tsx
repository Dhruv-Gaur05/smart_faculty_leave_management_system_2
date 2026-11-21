'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  getFacultyApplicationById,
  getFacultyProfile,
  respondToClarification,
  DetailedLeaveApplication,
} from '@/lib/supabase/faculty';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Printer,
  Building,
  User,
  Phone,
  AlertCircle,
  Loader2,
  Send,
  MessageSquare
} from 'lucide-react';

export default function FacultyApplicationDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile, session } = useAuth();

  const applicationId = params?.id ? decodeURIComponent(params.id) : '';

  const [application, setApplication] = useState<DetailedLeaveApplication | null>(null);
  const [departmentName, setDepartmentName] = useState('Computer Science & Engineering');
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Clarification Response State
  const [clarificationMessage, setClarificationMessage] = useState('');
  const [submittingClarification, setSubmittingClarification] = useState(false);
  const [clarificationError, setClarificationError] = useState<string | null>(null);
  const [clarificationSuccess, setClarificationSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRecord() {
      if (!user?.id || !applicationId) return;

      try {
        const [appData, prof] = await Promise.all([
          getFacultyApplicationById(applicationId, user.id),
          getFacultyProfile(user.id),
        ]);

        if (!active) return;

        if (prof?.department_name) {
          setDepartmentName(prof.department_name);
        }

        if (appData) {
          setApplication(appData);
        } else {
          setErrorState('Leave application record not found or access restricted to the applicant.');
        }
      } catch (err) {
        console.error('Error fetching application details:', err);
        if (active) setErrorState('Failed to retrieve leave application record.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRecord();

    return () => {
      active = false;
    };
  }, [user?.id, applicationId]);

  const facultyDisplayName = profile?.name || user?.email?.split('@')[0] || 'Academic Faculty';
  const facultyDesignation = profile?.designation || 'Assistant Professor';

  const handleClarificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarificationMessage.trim() || clarificationMessage.trim().length < 3) {
      setClarificationError('Please provide your clarification response (at least 3 characters).');
      return;
    }

    setSubmittingClarification(true);
    setClarificationError(null);
    setClarificationSuccess(null);

    try {
      const res = await respondToClarification(
        applicationId,
        clarificationMessage.trim(),
        session?.access_token
      );

      if (!res.success) {
        setClarificationError(res.error || 'Failed to submit clarification response.');
        setSubmittingClarification(false);
        return;
      }

      setClarificationSuccess(
        'Your clarification message was recorded and sent to the Head of Department. Your application status is now updated back to "Pending Review".'
      );
      const submittedText = clarificationMessage.trim();
      setClarificationMessage('');

      // Update local application state
      setApplication((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'pending',
          approvals: [
            ...(prev.approvals || []),
            {
              id: `appr-${Date.now()}`,
              leave_id: prev.id,
              approver_id: user?.id || '',
              action: 'clarification',
              remarks: `[Applicant Clarification (${facultyDisplayName})]: ${submittedText}`,
              action_time: new Date().toISOString(),
            },
          ],
        };
      });
    } catch (err) {
      setClarificationError(err instanceof Error ? err.message : 'Error submitting clarification.');
    } finally {
      setSubmittingClarification(false);
    }
  };

  const latestHodApproval = [...(application?.approvals || [])]
    .reverse()
    .find((a) => !a.remarks?.startsWith('[Applicant Clarification'));
  const latestHodRemark = latestHodApproval?.remarks || 'Please provide additional clarification on your leave request.';

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
                href="/faculty/applications"
                className="text-xs text-amber-300 hover:text-white flex items-center gap-1.5 mb-1.5 font-bold uppercase tracking-wider transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to My Applications
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold uppercase font-serif tracking-wide text-white">
                Leave Application Record
              </h1>
              <p className="text-xs text-blue-200/90 mt-0.5 font-medium">
                Official Institutional Registry Reference: <span className="font-mono font-bold text-white bg-blue-900/60 px-2 py-0.5 rounded">{applicationId}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs font-semibold rounded-lg"
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> Print Slip
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
              <p className="text-xs text-slate-600 font-medium">Loading application record from database...</p>
            </div>
          ) : errorState || !application ? (
            <div className="p-6 bg-white rounded-xl border border-slate-200 text-center space-y-3 shadow-xs">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 uppercase">Application Not Found</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {errorState || 'The requested application ID does not exist or belongs to another faculty member.'}
              </p>
              <Button variant="primary" size="sm" onClick={() => router.push('/faculty/applications')}>
                Return to Applications List
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Application Status Banner */}
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block font-mono">
                      Application Identification
                    </span>
                    <h2 className="text-xl font-mono font-bold text-blue-900 mt-0.5">
                      {application.id}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      Submitted on: {application.submitted_at ? new Date(application.submitted_at).toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1">
                      Current Review Status
                    </span>
                    <Badge status={application.status} className="text-xs px-3.5 py-1" />
                  </div>
                </div>

                {/* Main Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs">
                  <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200">
                    <span className="text-slate-600 block text-[11px] font-bold uppercase tracking-wider">Leave Category</span>
                    <span className="font-bold text-slate-900 mt-1 block text-sm">
                      {application.leave_type?.name || 'Leave'}
                    </span>
                    <span className="text-[11px] text-slate-600 italic mt-0.5 block leading-relaxed font-medium">
                      {application.leave_type?.description || 'Standard university leave quota'}
                    </span>
                  </div>

                  <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200">
                    <span className="text-slate-600 block text-[11px] font-bold uppercase tracking-wider">Requested Period</span>
                    <span className="font-mono font-bold text-slate-900 mt-1 block">
                      {application.from_date} <span className="text-slate-400">→</span> {application.to_date}
                    </span>
                    <span className="text-xs text-blue-900 font-bold mt-1 block flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {application.days} {application.days === 1 ? 'Calendar Day' : 'Calendar Days'}
                    </span>
                  </div>

                  <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200">
                    <span className="text-slate-600 block text-[11px] font-bold uppercase tracking-wider">Applicant</span>
                    <span className="font-bold text-slate-900 mt-1 block text-sm flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-900" />
                      {facultyDisplayName}
                    </span>
                    <span className="text-[11px] text-slate-600 mt-0.5 block font-medium">
                      {facultyDesignation}
                    </span>
                  </div>

                  <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200">
                    <span className="text-slate-600 block text-[11px] font-bold uppercase tracking-wider">Department</span>
                    <span className="font-bold text-slate-900 mt-1 block flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-900" />
                      {departmentName}
                    </span>
                    <span className="text-[11px] text-slate-600 mt-0.5 block font-medium">
                      Academic Year 2026 – 2027
                    </span>
                  </div>
                </div>

                {/* Reason & Emergency Contact */}
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 uppercase tracking-wider block mb-1">
                      Academic / Personal Reason
                    </span>
                    <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200 text-slate-900 leading-relaxed italic font-medium">
                      &quot;{application.reason}&quot;
                    </div>
                  </div>

                  {application.contact_during_leave && (
                    <div>
                      <span className="font-bold text-slate-800 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        Contact Information During Leave
                      </span>
                      <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200 text-slate-900 font-mono text-xs font-medium">
                        {application.contact_during_leave}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Action Required: Clarification Response Box */}
              {application.status === 'clarification' && (
                <div className="bg-gradient-to-br from-amber-50 via-white to-sky-50 border-2 border-amber-400 rounded-2xl p-6 shadow-md space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <HelpCircle className="w-5 h-5 text-amber-100" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 font-mono">
                        Action Required from Faculty
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1 font-serif uppercase tracking-wide">
                        Head of Department Requested Clarification
                      </h3>
                    </div>
                  </div>

                  {latestHodRemark && (
                    <div className="bg-amber-100/60 p-4 rounded-xl border border-amber-200 text-slate-900 text-xs shadow-2xs space-y-1">
                      <span className="font-bold text-amber-950 uppercase text-[10px] tracking-wider block">
                        HOD Official Question / Remark:
                      </span>
                      <p className="italic text-slate-900 font-medium leading-relaxed">
                        &quot;{latestHodRemark}&quot;
                      </p>
                    </div>
                  )}

                  {clarificationError && (
                    <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{clarificationError}</span>
                    </div>
                  )}

                  {clarificationSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-start gap-2 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-emerald-900">Clarification Submitted Successfully</p>
                        <p className="mt-0.5 text-emerald-800">{clarificationSuccess}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleClarificationSubmit} className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-900" />
                        Your Clarification Message / Explanation <span className="text-rose-600">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={clarificationMessage}
                        onChange={(e) => setClarificationMessage(e.target.value)}
                        disabled={submittingClarification}
                        placeholder="e.g. My Monday 10:00 AM lecture has been arranged with Prof. Sharma. Notes and syllabus coverage have been uploaded..."
                        className="w-full p-3 text-xs bg-white text-slate-900 border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-xl font-medium placeholder:text-slate-500 shadow-2xs"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <p className="text-[11px] text-slate-500">
                        Submitting will update the application status to <strong>Pending Review</strong> and notify your HOD.
                      </p>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={submittingClarification || !clarificationMessage.trim()}
                        className="bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-sm px-4 py-2 shrink-0"
                      >
                        {submittingClarification ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 mr-1.5" /> Submit Response to HOD
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Department HOD Review Audit Trail */}
              <Card
                title="HOD Review Audit Trail"
                subtitle="Permanent record of actions and remarks logged by Department Leadership & Applicant"
              >
                {!application.approvals || application.approvals.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-center gap-2.5 shadow-2xs">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      This application is currently <strong>Pending Review</strong> by your Head of Department. You will receive real-time updates as soon as an action is recorded.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {application.approvals.map((appr, idx) => {
                      const isFacultyClarification =
                        appr.remarks?.startsWith('[Applicant Clarification') ||
                        appr.approver_id === application.faculty_id;
                      const isApproved = appr.action === 'approved';
                      const isRejected = appr.action === 'rejected';

                      if (isFacultyClarification) {
                        const cleanRemark =
                          appr.remarks?.replace(/^\[Applicant Clarification[^\]]*\]:\s*/, '') || appr.remarks;
                        return (
                          <div
                            key={appr.id || idx}
                            className="p-4 rounded-xl border bg-blue-50/90 border-blue-300 text-blue-950 text-xs space-y-2 shadow-2xs"
                          >
                            <div className="flex items-center justify-between pb-1.5 border-b border-blue-200">
                              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                                <User className="w-4 h-4 text-blue-800" />
                                <span className="uppercase text-[11px] tracking-wide">
                                  Applicant Clarification Response (Faculty)
                                </span>
                              </div>
                              <span className="text-[11px] text-blue-800 font-mono font-medium">
                                {appr.action_time ? new Date(appr.action_time).toLocaleString() : '—'}
                              </span>
                            </div>
                            <div className="text-slate-900 text-xs leading-relaxed font-medium">
                              <span className="font-bold text-blue-950">Clarification Provided: </span>
                              {cleanRemark || 'No written remarks provided.'}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={appr.id || idx}
                          className={`p-4 rounded-xl border text-xs space-y-2 shadow-2xs ${
                            isApproved
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                              : isRejected
                              ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                              : 'bg-amber-50/80 border-amber-300 text-amber-950'
                          }`}
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                            <div className="flex items-center gap-1.5 font-bold">
                              {isApproved && <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
                              {isRejected && <XCircle className="w-4 h-4 text-rose-700" />}
                              {!isApproved && !isRejected && <HelpCircle className="w-4 h-4 text-amber-700" />}
                              <span className="uppercase text-[11px] tracking-wide">
                                {appr.action === 'clarification' ? 'HOD Clarification Request' : `HOD Action: ${appr.action}`}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-600 font-mono font-medium">
                              {appr.action_time ? new Date(appr.action_time).toLocaleString() : '—'}
                            </span>
                          </div>

                          <div className="text-slate-900 text-xs leading-relaxed font-medium">
                            <span className="font-bold text-slate-800">Review Remarks: </span>
                            {appr.remarks || 'No written remarks provided.'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
