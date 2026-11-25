'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Printer,
  X,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

interface LeaveSanctionOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  leave: {
    id: string;
    facultyName?: string;
    employeeId?: string;
    designation?: string;
    department?: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    status: string;
    appliedOn?: string;
    hodComment?: string;
    contactDuringLeave?: string;
    substitutionFaculty?: string;
    approvalsHistory?: Array<{
      action: string;
      remarks?: string | null;
      action_time?: string;
    }>;
  };
}

export const LeaveSanctionOrderModal: React.FC<LeaveSanctionOrderModalProps> = ({
  isOpen,
  onClose,
  leave,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const dispatchRefNo = `ORD/ACAD/2026/LV-${leave.id.slice(0, 8).toUpperCase()}`;
  const currentDateFormatted = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const fromFormatted = new Date(leave.startDate + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const toFormatted = new Date(leave.endDate + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // HOD approval info from history if available
  const approvalAction = leave.approvalsHistory?.find((a) => a.action === 'approved');
  const approvalTimestamp = approvalAction?.action_time
    ? new Date(approvalAction.action_time).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : currentDateFormatted;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
      {/* Container Box */}
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Top Modal Action Bar (Hidden during print) */}
        <div className="print:hidden px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Official University Leave Sanction Document
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs py-1.5 flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </Button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Letterhead Document */}
        <div
          ref={printRef}
          className="p-8 sm:p-12 overflow-y-auto bg-white text-slate-900 space-y-6 printable-sanction-slip font-serif"
          id="printable-sanction-slip"
        >
          {/* 1. University Official Header */}
          <div className="text-center pb-6 border-b-2 border-slate-900 space-y-1">
            <div className="flex items-center justify-center space-x-3 mb-2">
              <div className="w-16 h-16 rounded-xl bg-white border border-slate-300 p-1 flex items-center justify-center shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/btu-logo.png" alt="BTU Crest" className="w-full h-full object-contain" />
              </div>
              <div className="text-left">
                <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-slate-950 font-serif">
                  Bikaner Technical University
                </h1>
                <p className="text-[11px] font-sans font-semibold text-slate-600 uppercase tracking-widest">
                  Office of the Dean Academic Affairs &amp; Faculty Governance
                </p>
              </div>
            </div>
            <p className="text-[11px] font-sans text-slate-500">
              State University Established by Govt. of Rajasthan • Karni Industrial Area, Pugal Road, Bikaner-334004
            </p>
          </div>

          {/* 2. Dispatch Order Reference & Date */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-sans pb-3 border-b border-slate-200 gap-2">
            <div>
              <span className="text-slate-500 font-medium">Order Dispatch No:</span>{' '}
              <strong className="font-mono text-slate-900 font-bold">{dispatchRefNo}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Date of Sanction:</span>{' '}
              <strong className="text-slate-900 font-bold">{currentDateFormatted}</strong>
            </div>
          </div>

          {/* 3. Formal Addressee */}
          <div className="text-xs font-sans space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="font-bold text-slate-950 text-sm">To,</p>
            <p className="font-bold text-blue-950">
              {leave.facultyName || 'Faculty Member'}{' '}
              <span className="font-normal text-slate-600 font-mono text-[11px]">
                ({leave.employeeId ? `Emp ID: ${leave.employeeId}` : 'Faculty'})
              </span>
            </p>
            <p className="text-slate-700">{leave.designation || 'Academic Staff'}</p>
            <p className="text-slate-700 font-semibold">{leave.department || 'Academic Department'}</p>
          </div>

          {/* 4. Subject Heading */}
          <div className="text-center py-2 bg-slate-100 rounded-lg border border-slate-300">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-950">
              SANCTION ORDER: GRANT OF {leave.leaveType.toUpperCase()}
            </h2>
          </div>

          {/* 5. Sanction Narrative Body */}
          <p className="text-xs sm:text-sm font-sans leading-relaxed text-slate-800 text-justify">
            In accordance with the Bikaner Technical University Leave Statutes &amp; Ordinances (Academic Governance Rules 2026), sanction is hereby accorded by the competent authority for the grant of leave to the above-named faculty member under the terms specified below:
          </p>

          {/* 6. Sanction Parameter Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden font-sans text-xs">
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-50/70">
                  <td className="px-4 py-2.5 font-bold text-slate-700 w-1/3">1. Nature / Category of Leave</td>
                  <td className="px-4 py-2.5 font-bold text-blue-900">{leave.leaveType}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-bold text-slate-700">2. Leave Duration Sanctioned</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    From <strong className="font-mono">{fromFormatted}</strong> to{' '}
                    <strong className="font-mono">{toFormatted}</strong>
                  </td>
                </tr>
                <tr className="bg-slate-50/70">
                  <td className="px-4 py-2.5 font-bold text-slate-700">3. Total Sanctioned Duration</td>
                  <td className="px-4 py-2.5 font-bold text-emerald-900">
                    {leave.totalDays} {leave.totalDays === 1 ? 'Working Day' : 'Working Days'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-bold text-slate-700">4. Academic Reason / Purpose</td>
                  <td className="px-4 py-2.5 text-slate-800">{leave.reason}</td>
                </tr>
                {leave.contactDuringLeave && (
                  <tr className="bg-slate-50/70">
                    <td className="px-4 py-2.5 font-bold text-slate-700">5. Contact / Residence in Absence</td>
                    <td className="px-4 py-2.5 text-slate-800 font-mono">{leave.contactDuringLeave}</td>
                  </tr>
                )}
                <tr>
                  <td className="px-4 py-2.5 font-bold text-slate-700">6. Verification Status</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-950 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      OFFICIALLY SANCTIONED &amp; RECORDED
                    </span>
                  </td>
                </tr>
                {leave.hodComment && (
                  <tr className="bg-slate-50/70">
                    <td className="px-4 py-2.5 font-bold text-slate-700">7. HOD Approval Endorsement</td>
                    <td className="px-4 py-2.5 text-slate-800 italic">&ldquo;{leave.hodComment}&rdquo;</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 7. Terms & Conditions */}
          <div className="text-[11px] font-sans text-slate-600 space-y-1 bg-slate-50/80 p-3.5 rounded-lg border border-slate-200">
            <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Statutory Conditions:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Classes, scheduled lectures, and departmental examinations must be adjusted without interruption to student curriculum.</li>
              <li>The faculty member must report back to duty immediately upon expiration of the sanctioned period.</li>
              <li>Official leave records have been synchronized in the central university registry database.</li>
            </ul>
          </div>

          {/* 8. Seals & Authority Signature Block */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 sm:grid-cols-3 gap-6 items-end font-sans text-xs">
            {/* Authenticity QR Seal */}
            <div className="space-y-1">
              <div className="w-20 h-20 border-2 border-slate-900 rounded-lg p-1 bg-white shadow-2xs flex flex-col items-center justify-center">
                {/* SVG QR Code Simulation */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                  <rect x="0" y="0" width="30" height="30" />
                  <rect x="5" y="5" width="20" height="20" fill="white" />
                  <rect x="10" y="10" width="10" height="10" />
                  <rect x="70" y="0" width="30" height="30" />
                  <rect x="75" y="5" width="20" height="20" fill="white" />
                  <rect x="80" y="10" width="10" height="10" />
                  <rect x="0" y="70" width="30" height="30" />
                  <rect x="5" y="75" width="20" height="20" fill="white" />
                  <rect x="10" y="80" width="10" height="10" />
                  <rect x="40" y="10" width="15" height="10" />
                  <rect x="40" y="30" width="10" height="15" />
                  <rect x="60" y="40" width="20" height="10" />
                  <rect x="35" y="60" width="15" height="15" />
                  <rect x="60" y="70" width="20" height="15" />
                </svg>
              </div>
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">
                Scan for Registry Verification
              </p>
            </div>

            {/* University Seal Stamp */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-dashed border-amber-600 text-amber-700 bg-amber-50/50 mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Official Seal</p>
              <p className="text-[9px] text-slate-500">Registry Office</p>
            </div>

            {/* Authorizing HOD Seal */}
            <div className="text-right space-y-1 col-span-2 sm:col-span-1">
              <div className="border-b border-slate-900 pb-1 inline-block min-w-[140px] text-center">
                <span className="font-serif italic font-bold text-slate-900 text-sm">
                  Digitally Sanctioned
                </span>
              </div>
              <p className="font-bold text-slate-900 text-xs">Head of Department (HOD)</p>
              <p className="text-[11px] text-slate-600">{leave.department || 'Academic Department'}</p>
              <p className="text-[10px] font-mono text-slate-500">Timestamp: {approvalTimestamp}</p>
            </div>
          </div>
        </div>

        {/* Bottom Modal Actions (Hidden on print) */}
        <div className="print:hidden px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-sans">
            Official document formatted for A4 standard letterhead printing.
          </span>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="bg-blue-900 hover:bg-blue-950 text-white flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Download PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Embedded CSS for Print Styling */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-sanction-slip,
          #printable-sanction-slip * {
            visibility: visible;
          }
          #printable-sanction-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20mm;
            border: none;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
};
