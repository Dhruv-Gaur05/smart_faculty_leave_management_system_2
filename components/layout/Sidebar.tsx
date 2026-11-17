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
      { name: 'Manage Departments', href: '/admin#departments', icon: Building2 },
      { name: 'Faculty Directory', href: '/admin#directory', icon: Users },
      { name: 'Portal Logs & Audit', href: '/admin#audit', icon: FileText },
    ];
  }

  return (
    <aside className="w-full md:w-64 bg-slate-100 border-r border-slate-300 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        {/* User Role Card Header */}
        <div className="bg-white p-3 border border-slate-300 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Institutional Portal
          </div>
          <div className="text-sm font-bold text-slate-900 mt-1 capitalize flex items-center gap-1.5 font-serif">
            {role === 'faculty' && <FileText className="w-4 h-4 text-blue-900" />}
            {role === 'hod' && <UserCheck className="w-4 h-4 text-blue-900" />}
            {role === 'admin' && <Shield className="w-4 h-4 text-blue-900" />}
            {role.toUpperCase()} PORTAL
          </div>
          <div className="text-xs text-slate-800 font-bold truncate mt-2">
            {userName}
          </div>
          <div className="text-[11px] text-blue-900 font-medium truncate">
            {designation}
          </div>
          <div className="text-[10px] text-slate-500 truncate mt-0.5">
            {department}
          </div>
        </div>

        {/* Navigation Section */}
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">
            Portal Navigation
          </div>
          <nav className="space-y-1">
            {roleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/faculty/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold tracking-wide border transition-colors ${
                    isActive
                      ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
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
      <div className="mt-8 pt-4 border-t border-slate-300 text-[11px] text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800">Academic Support</p>
        <p className="text-[10px]">Registry: <span className="font-mono">leave@university.edu</span></p>
        <p className="text-[10px]">Intercom: <span className="font-mono">Ext. 4021</span></p>
      </div>
    </aside>
  );
};
