'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  Lock,
  Mail,
  GraduationCap,
  AlertCircle,
  Loader2,
  ShieldCheck,
  HelpCircle,
  Eye,
  EyeOff,
  UserCheck,
  Shield,
  FileText,
  KeyRound,
  Database
} from 'lucide-react';
import { UserRole } from '@/types/database';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, role, loading: authLoading, isLiveSupabase } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to get dashboard path by role
  const getDashboardPath = (userRole: UserRole) => {
    switch (userRole) {
      case 'hod':
        return '/hod/dashboard';
      case 'admin':
        return '/admin/dashboard';
      case 'faculty':
      default:
        return '/faculty/dashboard';
    }
  };

  // If already logged in, redirect to respective dashboard
  useEffect(() => {
    if (!authLoading && user && role) {
      router.push(getDashboardPath(role));
    }
  }, [user, role, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both institutional email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error, role: userRole } = await signIn(email.trim(), password);

      if (error) {
        // Map common Supabase error messages to clear university instructions
        const msg = error.message;
        if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
          setErrorMessage('Invalid institutional email or password. Please verify your credentials.');
        } else if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
          setErrorMessage('Your institutional email address has not been confirmed yet. Please check your inbox or ask the admin to confirm your account in Supabase.');
        } else if (msg.includes('Failed to fetch') || msg.includes('network error')) {
          setErrorMessage('Could not connect to Supabase authentication server. Please check your network and ensure valid NEXT_PUBLIC_SUPABASE_URL is set in .env.local.');
        } else {
          setErrorMessage(msg);
        }
        setIsSubmitting(false);
        return;
      }

      if (userRole) {
        router.push(getDashboardPath(userRole));
      } else {
        router.push('/faculty/dashboard');
      }
    } catch (err) {
      console.error('Login submit error:', err);
      setErrorMessage('An unexpected authentication error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Quick fill test credentials for fast evaluation
  const handleQuickFill = (testEmail: string) => {
    setEmail(testEmail);
    setPassword('password123');
    setErrorMessage(null);
  };

  return (
    <div className="max-w-xl mx-auto py-6 sm:py-10">
      {/* University Card Container */}
      <div className="bg-white border-2 border-slate-300 shadow-sm">
        {/* Academic Card Header */}
        <div className="bg-blue-900 text-white p-5 border-b-4 border-slate-950 text-center">
          <div className="w-12 h-12 bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-2 text-white">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider font-serif">
            Central Authentication Portal
          </h2>
          <p className="text-xs text-blue-200 mt-1">
            Faculty & Academic Staff Single Sign-On (SSO)
          </p>
        </div>

        {/* Supabase Status Strip */}
        <div className={`px-4 py-2 border-b text-xs flex items-center justify-between ${
          isLiveSupabase
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center space-x-1.5 font-medium">
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isLiveSupabase
                ? 'Connected to Live Supabase Auth Service'
                : 'Development Test Mode (Configure .env.local for Live Supabase)'}
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 border font-mono">
            {isLiveSupabase ? 'SUPABASE' : 'TEST MODE'}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick-Fill Test Accounts for Instant Testing */}
          <div className="bg-slate-50 border border-slate-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-blue-900" />
                Quick-Test Credentials:
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Click to autofill</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('faculty@university.edu')}
                className="text-left p-2 bg-white border border-slate-300 hover:border-blue-900 hover:bg-blue-50/50 transition-colors"
              >
                <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>Faculty</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">faculty@university.edu</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('hod@university.edu')}
                className="text-left p-2 bg-white border border-slate-300 hover:border-blue-900 hover:bg-blue-50/50 transition-colors"
              >
                <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900">
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>HOD</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">hod@university.edu</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('admin@university.edu')}
                className="text-left p-2 bg-white border border-slate-300 hover:border-blue-900 hover:bg-blue-50/50 transition-colors"
              >
                <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>Admin</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">admin@university.edu</div>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Authentication Failed</p>
                <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Institutional Email Address <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="e.g. faculty@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 rounded-none disabled:bg-slate-100"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 rounded-none disabled:bg-slate-100"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center py-2.5 px-4 bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs uppercase tracking-wider border border-transparent shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Verifying Credentials & Role...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-1.5" />
                    <span>Authenticate & Access Portal</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Role Guidelines */}
          <div className="border-t border-slate-200 pt-4 space-y-3 text-[11px] text-slate-600">
            <div className="flex items-center space-x-1.5 font-bold text-slate-800">
              <HelpCircle className="w-3.5 h-3.5 text-blue-900" />
              <span>Role-Based Portal Access Guide:</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="bg-slate-50 border border-slate-200 p-2">
                <span className="font-bold text-slate-800 block">Faculty</span>
                <span className="text-slate-500 font-mono text-[9px] block">/faculty/dashboard</span>
                <span className="text-slate-600 mt-1 block">Apply & track leaves</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-2">
                <span className="font-bold text-slate-800 block">HOD</span>
                <span className="text-slate-500 font-mono text-[9px] block">/hod/dashboard</span>
                <span className="text-slate-600 mt-1 block">Review & approve</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-2">
                <span className="font-bold text-slate-800 block">Admin</span>
                <span className="text-slate-500 font-mono text-[9px] block">/admin/dashboard</span>
                <span className="text-slate-600 mt-1 block">Institutional control</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-2.5 text-blue-900">
              <p className="font-semibold">Institutional Account Policy</p>
              <p className="text-[10px] text-blue-800 mt-0.5 leading-relaxed">
                Public registration is disabled for security. HOD accounts are provisioned by the System Administrator, and Faculty accounts are created by your Department HOD or Admin. Contact <span className="font-mono font-bold">it-desk@university.edu</span> for credential assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
