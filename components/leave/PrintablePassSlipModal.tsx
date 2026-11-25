'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Printer,
  X,
  CheckCircle2,
  User,
  FileCheck2
} from 'lucide-react';

export interface PassSlipData {
  id: string;
  applicationId?: string;
  facultyName?: string;
  employeeId?: string;
  designation?: string;
  department?: string;
  phone?: string;
  avatarUrl?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  appliedOn?: string;
  hodComment?: string;
  contactDuringLeave?: string;
  hodSignatureUrl?: string;
  facultySignatureUrl?: string;
}

interface PrintablePassSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  leave: PassSlipData;
}

export const PrintablePassSlipModal: React.FC<PrintablePassSlipModalProps> = ({
  isOpen,
  onClose,
  leave,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const passNumber = `BTU/GP/${new Date().getFullYear()}/${(leave.id || '0000').replace(/[^0-9]/g, '').slice(-4).padStart(4, '0') || '1024'}`;
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 print:border-none print:shadow-none print:my-0 print:max-w-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-5 h-5 text-amber-300" />
            <span className="font-bold text-sm tracking-wide font-serif">
              Official Campus Gate Pass / Movement Slip
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold border-amber-400"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print Pass Slip
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Pass Document Body */}
        <div ref={printRef} className="p-6 sm:p-8 bg-white text-slate-900 space-y-6 print:p-6 print:space-y-4">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/btu-logo.png"
                    alt="BTU Crest"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-extrabold text-blue-950 uppercase tracking-tight font-serif">
                    Bikaner Technical University
                  </h1>
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    बीकानेर तकनीकी विश्वविद्यालय • Bikaner, Rajasthan (India)
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Karni Industrial Area, Pugal Road, Bikaner, Rajasthan 334004
                  </p>
                  <div className="inline-block mt-1 px-2 py-0.5 bg-slate-900 text-amber-300 font-bold text-[10px] uppercase tracking-widest rounded">
                    CAMPUS SECURITY &amp; OFFICIAL MOVEMENT PASS
                  </div>
                </div>
              </div>

              {/* Barcode & Pass Serial */}
              <div className="text-right shrink-0 hidden sm:block">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Gate Pass Token</div>
                <div className="text-sm font-extrabold font-mono text-blue-950">{passNumber}</div>
                {/* Visual barcode imitation */}
                <div className="inline-block mt-1 bg-slate-900 px-2 py-1 rounded">
                  <div className="h-6 w-28 flex items-center justify-between gap-0.5">
                    {[12, 18, 8, 22, 14, 20, 10, 16, 24, 12, 8, 20, 14, 18, 22, 10, 16].map((h, i) => (
                      <div
                        key={i}
                        className="bg-white"
                        style={{ height: `${h}px`, width: i % 3 === 0 ? '2.5px' : '1.5px' }}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-[9px] font-mono text-slate-400 mt-0.5">SEC-VERIFIED-{leave.id || 'LV'}</div>
              </div>
            </div>
          </div>

          {/* Quick Meta Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Issue Date</span>
              <span className="font-semibold text-slate-800">{todayFormatted}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Movement Window</span>
              <span className="font-semibold text-slate-800">{leave.startDate} to {leave.endDate}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Duration</span>
              <span className="font-semibold text-slate-800">{leave.totalDays} Days ({leave.leaveType})</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Gate Authorization</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                OFFICIALLY SANCTIONED
              </span>
            </div>
          </div>

          {/* Faculty Profile & Movement Particulars */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-900" />
                Faculty Identification &amp; Station Details
              </span>
              <span className="text-[11px] font-mono text-slate-500">Ref: {leave.id}</span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              {/* Photo Box */}
              <div className="flex sm:flex-col items-center sm:items-start gap-3 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
                <div className="w-20 h-24 rounded-lg bg-slate-100 border-2 border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                  {leave.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={leave.avatarUrl} alt="Photo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-2">
                      <User className="w-8 h-8 text-slate-400 mx-auto" />
                      <span className="text-[9px] text-slate-400 block font-bold uppercase mt-1">BTU Faculty</span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Faculty Member</span>
                  <div className="font-bold text-sm text-slate-900">{leave.facultyName || 'Faculty Member'}</div>
                  <div className="text-xs text-blue-900 font-semibold">{leave.designation || 'Academic Staff'}</div>
                  <div className="text-[11px] font-mono text-slate-600 font-bold mt-0.5">{leave.employeeId || 'BTU-FAC'}</div>
                </div>
              </div>

              {/* Movement Specification */}
              <div className="sm:col-span-2 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Academic Department</span>
                    <span className="font-semibold text-slate-800">{leave.department || 'Computer Science & Engineering'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Contact During Absence</span>
                    <span className="font-mono text-slate-800 font-semibold">{leave.contactDuringLeave || 'As on university record'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Sanctioned Purpose of Movement / Absence</span>
                  <p className="text-slate-800 italic mt-0.5 bg-slate-50 p-2 rounded border border-slate-200/60 text-[11px] leading-relaxed">
                    &ldquo;{leave.reason}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Endorsement & Digital Signature Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Faculty Undertaking */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between h-36">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Faculty Declaration
                </span>
                <p className="text-[10px] text-slate-600 mt-1 leading-normal">
                  I undertake to resume duties on expiration of the sanctioned period or notify the department immediately.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-800 block">{leave.facultyName}</span>
                  <span className="text-[9px] text-slate-500 font-mono">Sign of Applicant</span>
                </div>
                {leave.facultySignatureUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={leave.facultySignatureUrl}
                    alt="Faculty Sign"
                    className="h-9 max-w-[120px] object-contain filter contrast-125"
                  />
                )}
              </div>
            </div>

            {/* HOD Endorsement Seal */}
            <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 flex flex-col justify-between h-36 relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                    Authorized Approval Endorsement
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-900 text-white font-mono">
                    HOD SEAL
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1 leading-normal">
                  {leave.hodComment
                    ? `Endorsement remarks: "${leave.hodComment}"`
                    : 'Officially validated & sanctioned according to BTU Academic Governance Ordinances.'}
                </p>
              </div>

              <div className="pt-2 border-t border-blue-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-900 block">Head of Department (CSE)</span>
                  <span className="text-[9px] text-slate-500 font-mono">Competent Sanctioning Authority</span>
                </div>
                {leave.hodSignatureUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={leave.hodSignatureUrl}
                    alt="HOD Sign"
                    className="h-10 max-w-[130px] object-contain filter contrast-125"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full border border-blue-400 flex items-center justify-center text-center p-1 opacity-70">
                    <span className="text-[7px] font-bold text-blue-900 leading-tight uppercase">BTU HOD SEAL</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dotted Tear-Off Line for Security Gate */}
          <div className="pt-3 border-t-2 border-dashed border-slate-400 text-center relative my-2">
            <span className="bg-white px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest relative -top-2.5">
              ✂ CAMPUS MAIN GATE SECURITY COUNTERFOIL (TO BE RECORDED BY GATE OFFICER)
            </span>
          </div>

          {/* Security Gate Verification Table */}
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/70 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Actual Departure Time</span>
                <span className="text-slate-400 font-mono text-[11px]">______ hrs / __:__ AM/PM</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Campus Exit Gate</span>
                <span className="text-slate-700 font-medium text-[11px]">[  ] Gate 1 &nbsp; [  ] Gate 2</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Vehicle Registration No.</span>
                <span className="text-slate-400 font-mono text-[11px]">RJ-____-____</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Duty Security Officer</span>
                <span className="text-slate-400 font-mono text-[11px]">Sign: _______________</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-2 text-[10px] text-slate-500 font-mono">
            Generated via Bikaner Technical University Smart Faculty Portal • Verification Token: {passNumber}
          </div>
        </div>
      </div>
    </div>
  );
};
