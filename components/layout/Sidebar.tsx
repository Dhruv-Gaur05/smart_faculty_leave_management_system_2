'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/types';
import {
  FileText,
  PlusSquare,
  CheckSquare,
  Users,
  Building2,
  PieChart,
  UserCheck,
  Shield,
  ShieldCheck,
  Calendar,
  Clock
} from 'lucide-react';

interface SidebarProps {
  role: UserRole;
  userName?: string;
  department?: string;
  designation?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  userName = 'Faculty User',
  department = 'Academic Department',
  designation = 'Academic Staff',
}) => {
  const pathname = usePathname();

  let roleItems = [
    { name: 'Dashboard Overview', href: '/faculty/dashboard', icon: PieChart },
    { name: 'Apply for Leave', href: '/faculty/apply-leave', icon: PlusSquare },
    { name: 'Leave Applications', href: '/faculty/applications', icon: Clock },
  ];

  if (role === 'hod') {
    roleItems = [
      { name: 'HOD Overview', href: '/hod/dashboard', icon: PieChart },
      { name: 'Pending Approvals', href: '/hod#approvals', icon: CheckSquare },
      { name: 'Department Faculty', href: '/hod#faculty', icon: Users },
      { name: 'Leave Records', href: '/hod#records', icon: FileText },
    ];
  } else if (role === 'admin') {
    roleItems = [
      { name: 'System Overview', href: '/admin/dashboard', icon: Shield },
      { name: 'System Administrators', href: '/admin#administrators', icon: ShieldCheck },
      { name: 'Manage Departments', href: '/admin#departments', icon: Building2 },
      { name: 'Academic Calendar', href: '/admin#calendar', icon: Calendar },
      { name: 'Faculty Directory', href: '/admin#directory', icon: Users },
      { name: 'Portal Logs & Audit', href: '/admin#audit', icon: FileText },
    ];
  }

  return (
    <aside className="w-full md:w-64 bg-slate-50/80 rounded-2xl border border-slate-200 p-4 flex flex-col justify-between shrink-0 shadow-xs">
      <div className="space-y-6">
        {/* User Role Card Header */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Institutional Session
          </div>
          <div className="text-sm font-bold text-slate-900 mt-1 capitalize flex items-center gap-2 font-serif">
            {role === 'faculty' && <FileText className="w-4 h-4 text-blue-900" />}
            {role === 'hod' && <UserCheck className="w-4 h-4 text-blue-900" />}
            {role === 'admin' && <Shield className="w-4 h-4 text-blue-900" />}
            <span>{role.toUpperCase()} PORTAL</span>
          </div>
          <div className="text-xs text-slate-900 font-bold truncate mt-2">
            {userName}
          </div>
          <div className="text-[11px] text-blue-900 font-semibold truncate">
            {designation}
          </div>
          <div className="text-[10px] text-slate-600 truncate mt-0.5 font-medium">
            {department}
          </div>
        </div>

        {/* Navigation Section */}
        <div>
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider px-2 mb-2.5">
            Portal Navigation
          </div>
          <nav className="space-y-1.5">
            {roleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/faculty/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2.5 px-3 py-2.5 text-xs font-semibold tracking-wide rounded-lg border transition-all ${isActive
                    ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Institutional Notice */}
      <div className="mt-8 pt-4 border-t border-slate-200 text-[11px] text-slate-600 space-y-1 bg-white/60 p-3 rounded-lg border border-slate-200/60">
        <p className="font-bold text-slate-800 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Academic Helpdesk
        </p>
        <p className="text-[10px] text-slate-600">Email: <span className="font-mono text-slate-800 font-medium">leave@university.edu</span></p>
        <p className="text-[10px] text-slate-600">Intercom: <span className="font-mono text-slate-800 font-medium">Ext. 4021</span></p>
      </div>
    </aside>
  );
};
