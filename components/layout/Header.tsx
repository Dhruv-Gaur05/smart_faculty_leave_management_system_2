'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { ProfileModal } from '@/components/profile/ProfileModal';
import {
  GraduationCap,
  Menu,
  X,
  ShieldCheck,
  UserCheck,
  LayoutDashboard,
  LogIn,
  LogOut,
  User,
  PenTool
} from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, role, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const getDashboardPath = () => {
    switch (role) {
      case 'hod':
        return '/hod/dashboard';
      case 'admin':
        return '/admin/dashboard';
      case 'faculty':
      default:
        return '/faculty/dashboard';
    }
  };

  const navLinks = [
    { name: 'Portal Home', href: '/', icon: GraduationCap },
    { name: 'Faculty Portal', href: '/faculty/dashboard', icon: LayoutDashboard },
    { name: 'HOD Portal', href: '/hod/dashboard', icon: UserCheck },
    { name: 'Admin Portal', href: '/admin/dashboard', icon: ShieldCheck },
  ];

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="bg-slate-950 text-white border-b-2 border-amber-500 shadow-lg">
      {/* Top Academic Strip */}
      <div className="bg-slate-900/90 text-slate-300 text-xs py-1.5 px-4 sm:px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 font-medium tracking-wider text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="uppercase font-semibold text-slate-200">Bikaner Technical University (BTU) Academic Portal</span>
          </div>
          <div className="hidden sm:flex items-center space-x-4 text-slate-300 text-xs">
            <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-300 border border-slate-700/50">
              Academic Session 2026 – 2027
            </span>
            {user && (
              <span className="text-emerald-400 font-mono font-medium flex items-center gap-1.5 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {profile?.name || user.email} ({role?.toUpperCase() || 'STAFF'})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          {/* Official BTU Crest */}
          <div className="w-11 h-11 rounded-xl bg-white border border-amber-400/60 shadow-sm flex items-center justify-center p-1 group-hover:scale-105 transition-transform shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/btu-logo.png" alt="BTU Emblem" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white uppercase font-serif flex items-center gap-2">
              <span>Bikaner Technical University</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-amber-300 font-medium tracking-wide">
              Faculty Leave Management &amp; Academic Governance System
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center space-x-2">
          <nav className="flex items-center space-x-1 mr-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${isActive
                      ? 'bg-blue-800/90 text-white shadow-xs border border-blue-600/60'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Notification Bell */}
          {user && (
            <div className="mr-2">
              <NotificationBell />
            </div>
          )}

          {/* User Auth Action in Header */}
          {user ? (
            <div className="flex items-center space-x-2 pl-3 border-l border-slate-800">
              <Link
                href={getDashboardPath()}
                className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs font-medium text-white transition-colors"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span className="max-w-[130px] truncate font-medium">{profile?.name || user.email}</span>
                <span className="text-[10px] uppercase font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded ml-1 font-mono">
                  {role || 'Staff'}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                title="Edit Profile, Contact & Digital Signature"
              >
                <PenTool className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Profile &amp; Sign</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white text-xs font-medium border border-rose-800/60 rounded-lg transition-colors cursor-pointer"
                title="Sign out of portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm border border-blue-500/40 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Portal Login</span>
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="lg:hidden flex items-center space-x-1">
          {user && <NotificationBell />}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-200 hover:text-white focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-t border-slate-800 px-4 py-3 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider ${isActive
                    ? 'bg-blue-900 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.name}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-800 space-y-2">
            {user ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold uppercase rounded-lg border border-slate-700"
                >
                  <PenTool className="w-4 h-4" />
                  <span>Profile &amp; Digital Signature</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-rose-900 text-white text-xs font-bold uppercase rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out ({profile?.name || user.email})</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-800 text-white text-xs font-bold uppercase"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Portal</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Profile & Signature Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onProfileUpdated={() => {
          // Trigger route refresh to reflect profile changes if needed
          router.refresh();
        }}
      />
    </header>
  );
};
