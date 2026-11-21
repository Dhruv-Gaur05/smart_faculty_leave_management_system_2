import React from 'react';
import { LeaveStatus } from '@/types';
import { LeaveApplicationStatus } from '@/types/database';

interface BadgeProps {
  status: LeaveStatus | LeaveApplicationStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const normalized = (status || '').toString().toLowerCase().trim();

  let badgeStyles = 'bg-slate-100 text-slate-900 border-slate-300';
  let dotColor = 'bg-slate-500';
  let displayLabel = status;

  if (normalized === 'approved') {
    badgeStyles = 'bg-emerald-100/80 text-emerald-950 border-emerald-400';
    dotColor = 'bg-emerald-600';
    displayLabel = 'Approved';
  } else if (normalized === 'pending' || normalized === 'pending hod') {
    badgeStyles = 'bg-amber-100/90 text-amber-950 border-amber-400';
    dotColor = 'bg-amber-600 animate-pulse';
    displayLabel = 'Pending HOD';
  } else if (normalized === 'rejected') {
    badgeStyles = 'bg-rose-100/90 text-rose-950 border-rose-400';
    dotColor = 'bg-rose-600';
    displayLabel = 'Rejected';
  } else if (normalized === 'clarification' || normalized === 'clarification requested') {
    badgeStyles = 'bg-sky-100/90 text-sky-950 border-sky-400';
    dotColor = 'bg-sky-600';
    displayLabel = 'Clarification Requested';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide uppercase shadow-2xs ${badgeStyles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{displayLabel}</span>
    </span>
  );
};
