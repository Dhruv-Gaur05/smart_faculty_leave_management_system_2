'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  generateSecurePassword,
  evaluatePasswordStrength,
} from '@/lib/utils/password';
import {
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateUserPassword } = useAuth();

  const queryEmail = searchParams.get('email') || '';

  const [inputEmail, setInputEmail] = useState(queryEmail);
  const email = user?.email || inputEmail;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const strength = evaluatePasswordStrength(password);

  // Generate strong secure password
  const handleGeneratePassword = () => {
    const freshPassword = generateSecurePassword('Uni@');
    setPassword(freshPassword);
    setConfirmPassword(freshPassword);
    setShowPassword(true);
    setErrorMessage(null);

    // Auto copy to clipboard
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(freshPassword).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }).catch(() => {
        // Fallback if clipboard API is blocked
      });
    }
  };

  const handleCopyPassword = () => {
    if (!password) return;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(password).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }

    setSubmitting(true);

    try {
      // Flow 1: If user is authenticated via recovery link session
      if (user) {
        const result = await updateUserPassword(password);
        if (result.error) {
          setErrorMessage(result.error.message);
          setSubmitting(false);
          return;
        }

        setSuccessMessage('Your password has been successfully updated! Redirecting to login...');
        setTimeout(() => {
          router.push('/login?reset=success');
        }, 1500);
        return;
      }

      // Flow 2: Direct institutional reset via server API
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        setErrorMessage('Please provide your registered institutional email.');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          newPassword: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to update password.');
        setSubmitting(false);
        return;
      }

      setSuccessMessage(
        data.message || 'Password successfully updated! Redirecting to login portal...'
      );
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 sm:py-12 px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Academic Card Header */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white p-6 sm:p-7 border-b-2 border-amber-500 text-center">
          <div className="w-13 h-13 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-3 text-amber-300 shadow-xs">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider font-serif">
            Generate &amp; Reset Password
          </h2>
          <p className="text-xs text-blue-200 mt-1">
            Set or auto-generate a secure password for your institutional profile
          </p>
        </div>

        <div className="p-6 sm:p-7 space-y-6">
          {/* Notification Messages */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Password Reset Failed</p>
                <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm">Password Updated Successfully</p>
                <p className="mt-1 leading-relaxed text-emerald-800">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Generator Toolbar Card */}
          <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Strong Password Generator
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Auto-creates an institutional-grade 10-character secure password
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGeneratePassword}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Generate Password</span>
              </button>
            </div>

            {copied && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-bold">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Password generated and copied to your clipboard!</span>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Registered Email */}
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
                  onChange={(e) => setInputEmail(e.target.value)}
                  disabled={submitting || Boolean(user?.email)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-white text-slate-900 border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg disabled:bg-slate-100 font-medium placeholder:text-slate-500 shadow-2xs"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              {user?.email && (
                <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                  Verified session for: {user.email}
                </p>
              )}
            </div>

            {/* New Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  New Password <span className="text-rose-600">*</span>
                </label>
                {password && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="text-[11px] font-semibold text-blue-900 hover:text-blue-950 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter or generate new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-white text-slate-900 border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg disabled:bg-slate-100 font-mono font-medium placeholder:font-sans placeholder:text-slate-500 shadow-2xs"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Strength:</span>
                    <span className={`font-bold ${strength.color}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.barColor}`}
                      style={{ width: `${(strength.score / 4) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {strength.feedback}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Confirm New Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-white text-slate-900 border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg disabled:bg-slate-100 font-mono font-medium placeholder:font-sans placeholder:text-slate-500 shadow-2xs"
                />
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">
                  Passwords do not match.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || (Boolean(confirmPassword) && password !== confirmPassword)}
              className="w-full flex items-center justify-center py-3 px-4 bg-blue-900 hover:bg-blue-950 active:bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Updating Password in Database...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 mr-1.5" />
                  <span>Update Password &amp; Proceed to Login</span>
                </>
              )}
            </button>
          </form>

          {/* Navigation Links */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-xs">
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Recovery Request
            </Link>
            <Link
              href="/login"
              className="font-bold text-blue-900 hover:text-blue-950 hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
