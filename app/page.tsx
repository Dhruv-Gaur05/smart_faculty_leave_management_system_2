import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  CheckSquare,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Official Announcement Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl border-l-8 border-amber-500 shadow-md">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-white border border-amber-400 p-1 flex items-center justify-center shrink-0 mt-0.5 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/btu-logo.png" alt="BTU Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-900/60 border border-blue-700/50 text-[11px] font-semibold text-blue-200 uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Bikaner Technical University (BTU) • Academic Administration Portal
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase font-serif">
              Faculty Leave Management &amp; Approval System
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-3xl leading-relaxed">
              Centralized platform for university teaching personnel, department heads (HODs), and executive administration. Submit leave requests, manage departmental teaching schedules, review academic justifications, and access institutional leave records.
            </p>
          </div>
        </div>
      </div>

      {/* Role Selection Portals Grid */}
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-serif">
              Select Institutional Portal
            </h3>
            <p className="text-xs text-slate-600">Access your designated academic workplace using verified credentials</p>
          </div>
          <span className="text-[11px] font-medium text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
            Single Sign-On (SSO) Enabled
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Faculty Card */}
          <Card className="hover:border-blue-400 transition-all hover:shadow-md">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900 shadow-2xs">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest block">
                  Academic Teaching Staff
                </span>
                <h4 className="text-base font-bold text-slate-900 font-serif mt-0.5">Faculty Portal</h4>
                <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                  Apply for Casual, Earned, Medical, or Duty Leave. Track real-time application decisions, upload documents, and monitor academic leave quotas.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <Link href="/faculty/dashboard">
                  <Button variant="primary" className="w-full text-xs py-2.5">
                    <span>Enter Faculty Portal</span> <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* HOD Card */}
          <Card className="hover:border-amber-400 transition-all hover:shadow-md">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shadow-2xs">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block">
                  Department Leadership
                </span>
                <h4 className="text-base font-bold text-slate-900 font-serif mt-0.5">HOD Review Portal</h4>
                <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                  Evaluate department faculty requests, assess class schedules, sanction leaves, provide written institutional feedback, and onboard department educators.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <Link href="/hod/dashboard">
                  <Button variant="primary" className="w-full text-xs py-2.5 bg-slate-900 hover:bg-slate-950">
                    <span>Enter HOD Portal</span> <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Admin Card */}
          <Card className="hover:border-indigo-400 transition-all hover:shadow-md">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-900 shadow-2xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest block">
                  Executive Governance
                </span>
                <h4 className="text-base font-bold text-slate-900 font-serif mt-0.5">Admin Management</h4>
                <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                  Configure university departments, appoint Heads of Department, govern institutional faculty rosters, and supervise registry audits.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <Link href="/admin/dashboard">
                  <Button variant="secondary" className="w-full text-xs py-2.5">
                    <span>Enter Admin Portal</span> <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Official Leave Workflow Steps */}
      <Card title="Institutional Leave Processing Protocol" subtitle="Standardized 4-tier academic compliance & governance workflow">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-900">
              <span className="w-6 h-6 bg-blue-900 text-white rounded-full flex items-center justify-center text-[11px] font-mono">1</span>
              <span>Formal Application</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Faculty submits period, category (CL, EL, ML, DL), and academic justification via authenticated session.
            </p>
          </div>

          <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-900">
              <span className="w-6 h-6 bg-blue-900 text-white rounded-full flex items-center justify-center text-[11px] font-mono">2</span>
              <span>Department Review</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Head of Department verifies lecture substitution, examination duties, and department quorum.
            </p>
          </div>

          <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-900">
              <span className="w-6 h-6 bg-blue-900 text-white rounded-full flex items-center justify-center text-[11px] font-mono">3</span>
              <span>Sanction or Clarification</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              HOD sanctions approval, requests documented clarification, or issues reasoned return remarks.
            </p>
          </div>

          <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-900">
              <span className="w-6 h-6 bg-blue-900 text-white rounded-full flex items-center justify-center text-[11px] font-mono">4</span>
              <span>Registry Archival</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Faculty receives real-time status update; official record logged in database for academic session audits.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
