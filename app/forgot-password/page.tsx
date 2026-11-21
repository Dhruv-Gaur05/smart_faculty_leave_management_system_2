'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  Mail,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please provide your registered institutional email.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid institutional email address.');
      return;
    }

    setSubmitting(true);

    try {
      const result = await resetPasswordForEmail(cleanEmail);

      if (result.error) {
        // If Supabase email sending fails or rate limits, provide helpful message
        setErrorMessage(result.error.message);
      } else {
        setSuccessMessage(
          `Password reset instructions have been sent to ${cleanEmail}. Please check your inbox and click the recovery link to set your new password.`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send recovery request';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 sm:py-12 px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Academic Card Header */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white p-6 sm:p-7 border-b-2 border-amber-500 text-center">
          <div className="w-13 h-13 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-3 text-amber-300 shadow-xs">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider font-serif">
            Password Recovery
          </h2>
          <p className="text-xs text-blue-200 mt-1">
            Institutional Account Access Assistance
          </p>
        </div>

        <div className="p-6 sm:p-7 space-y-6">
          {/* Status Banners */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Recovery Request Failed</p>
                <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm">Recovery Email Dispatched</p>
                <p className="mt-1 leading-relaxed text-emerald-800">{successMessage}</p>
                <div className="mt-3 pt-3 border-t border-emerald-200 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-700">Ready to set new password?</span>
                  <Link
                    href={`/reset-password?email=${encodeURIComponent(email)}`}
                    className="font-bold text-emerald-900 hover:underline inline-flex items-center gap-1"
                  >
                    Go to Reset & Generate Password <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            Enter the registered institutional email address associated with your university profile (Faculty, HOD, or Administrator). We will send a secure link to reset and generate your new password.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Registered Institutional Email <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-white text-slate-900 border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg disabled:bg-slate-100 font-medium placeholder:text-slate-500 shadow-2xs"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center py-3 px-4 bg-blue-900 hover:bg-blue-950 active:bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Sending Recovery Link...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 mr-1.5" />
                  <span>Send Password Reset Link</span>
                </>
              )}
            </button>
          </form>

          {/* Direct Reset Option for Local Dev / Institutional Accounts */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ShieldAlert className="w-4 h-4 text-blue-900" />
              <span>Direct Institutional Password Reset & Generator</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              If your university email does not receive external delivery or for instant credential updates, you can generate and set your new password directly:
            </p>
            <div className="pt-1">
              <Link
                href={email.trim() ? `/reset-password?email=${encodeURIComponent(email.trim())}` : '/reset-password'}
                className="w-full inline-flex items-center justify-center py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-blue-950 font-bold text-xs rounded-lg transition-colors shadow-2xs gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-900" />
                <span>Open Password Generator & Direct Reset</span>
              </Link>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="border-t border-slate-200 pt-4 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-950 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to University Login Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
