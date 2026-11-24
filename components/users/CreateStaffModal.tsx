'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { createStaffAccount } from '@/lib/supabase/admin';
import { generateSecurePassword } from '@/lib/utils/password';
import {
  UserPlus,
  Loader2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Building2,
  ShieldAlert,
  Shield
} from 'lucide-react';

export interface DepartmentOption {
  id: string;
  name: string;
}

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  accessToken: string | undefined;
  mode: 'admin' | 'hod';
  departments: DepartmentOption[];
  lockedDepartment?: DepartmentOption | null;
  defaultRole?: 'admin' | 'hod' | 'faculty';
  defaultDepartmentId?: string;
}

const CreateStaffForm: React.FC<Omit<CreateStaffModalProps, 'isOpen'>> = ({
  onClose,
  onSuccess,
  accessToken,
  mode,
  departments,
  lockedDepartment,
  defaultRole = 'faculty',
  defaultDepartmentId,
}) => {
  const initialRole = mode === 'hod' ? 'faculty' : defaultRole;
  const initialDepartmentId =
    mode === 'hod' && lockedDepartment
      ? lockedDepartment.id
      : defaultDepartmentId || (departments.length > 0 ? departments[0].id : '');

  const [role, setRole] = useState<'admin' | 'hod' | 'faculty'>(initialRole);
  const [departmentId, setDepartmentId] = useState<string>(initialDepartmentId);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState(
    initialRole === 'admin'
      ? 'System Administrator'
      : initialRole === 'hod'
      ? 'Head of Department'
      : 'Assistant Professor'
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [missingKeyWarning, setMissingKeyWarning] = useState(false);

  const handleRoleChange = (newRole: 'admin' | 'hod' | 'faculty') => {
    setRole(newRole);
    if (newRole === 'admin') {
      setDesignation('System Administrator');
    } else if (newRole === 'hod') {
      setDesignation('Head of Department');
    } else if (newRole === 'faculty') {
      setDesignation('Assistant Professor');
    }
  };

  const generateTempPassword = () => {
    const generated = generateSecurePassword('Uni@');
    setPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setMissingKeyWarning(false);

    if (role !== 'admin' && !departmentId) {
      setErrorMsg('Please select or assign a valid academic department first.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Temporary password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);

    const result = await createStaffAccount(accessToken, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      employeeId: employeeId.trim(),
      designation: designation.trim(),
      role: mode === 'hod' ? 'faculty' : role,
      departmentId: departmentId || null,
    });

    setSubmitting(false);

    if (!result.success) {
      if (result.code === 'SERVICE_ROLE_MISSING') {
        setMissingKeyWarning(true);
      }
      setErrorMsg(result.error || 'Failed to create staff account.');
      return;
    }

    onSuccess(result.message || 'Staff member created successfully.');
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {missingKeyWarning && (
        <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Service Role Key Required in .env.local</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            The API endpoint is configured and verified, but{' '}
            <code className="font-mono bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> is still set to a placeholder in{' '}
            <code className="font-mono bg-amber-100 px-1">.env.local</code>. Paste the key when received from your Supabase owner and restart the dev server.
          </p>
        </div>
      )}

      {errorMsg && !missingKeyWarning && (
        <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Role & Department Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Staff Role <span className="text-rose-600">*</span>
          </label>
          {mode === 'admin' ? (
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'hod' | 'faculty')}
              disabled={submitting}
              className="w-full py-2.5 px-3.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 font-bold shadow-2xs"
            >
              <option value="faculty">Faculty Member</option>
              <option value="hod">Head of Department (HOD)</option>
              <option value="admin">System Administrator (Admin)</option>
            </select>
          ) : (
            <input
              type="text"
              readOnly
              value="Faculty Member (Locked)"
              className="w-full py-2.5 px-3.5 text-xs border border-slate-300 bg-slate-100 text-slate-800 font-bold rounded-lg"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Department {role !== 'admin' && <span className="text-rose-600">*</span>}
          </label>
          {mode === 'admin' ? (
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required={role !== 'admin'}
              disabled={submitting}
              className="w-full py-2.5 px-3.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 font-medium shadow-2xs"
            >
              {role === 'admin' && (
                <option value="">Central Administration (Default)</option>
              )}
              {departments.length === 0 && role !== 'admin' ? (
                <option value="">-- Create a Department First --</option>
              ) : (
                departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))
              )}
            </select>
          ) : (
            <div className="w-full py-2.5 px-3.5 text-xs border border-slate-300 bg-slate-100 text-slate-800 font-bold rounded-lg flex items-center gap-2 truncate">
              <Building2 className="w-4 h-4 text-blue-900 shrink-0" />
              <span className="truncate">{lockedDepartment?.name || 'Unassigned Department'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Admin Privileges Info Banner */}
      {role === 'admin' && (
        <div className="p-3 bg-blue-50/90 border border-blue-200 text-blue-950 text-xs rounded-xl flex items-start gap-2.5 shadow-2xs">
          <Shield className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-blue-950 block">System Administrator Privileges</span>
            <span className="text-[11px] text-blue-900 leading-relaxed">
              This user will have full institutional authority to manage all academic departments, staff profiles, HOD appointments, password resets, and university leave policies.
            </span>
          </div>
        </div>
      )}

      {/* Name & Employee ID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Full Name <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Dr. Priya Verma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            className="w-full py-2.5 px-3.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 font-medium shadow-2xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Employee ID <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            required
            placeholder={role === 'hod' ? 'e.g. HOD-ECE-001' : 'e.g. FAC-CSE-2026-010'}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            disabled={submitting}
            className="w-full py-2.5 px-3.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 font-mono font-bold shadow-2xs"
          />
        </div>
      </div>

      {/* Email & Designation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Institutional Email <span className="text-rose-600">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="name@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="w-full py-2.5 px-3.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 font-medium shadow-2xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Designation <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Assistant Professor"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            disabled={submitting}
            className="w-full py-2.5 px-3.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 font-medium shadow-2xs"
          />
        </div>
      </div>

      {/* Temporary Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Initial Login Password <span className="text-rose-600">*</span>
          </label>
          <button
            type="button"
            onClick={generateTempPassword}
            className="text-[11px] text-blue-900 font-bold hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors"
          >
            <KeyRound className="w-3 h-3 text-amber-600" /> Auto-Generate
          </button>
        </div>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            minLength={6}
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            className="w-full py-2.5 pl-3.5 pr-10 text-xs border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 font-mono font-medium shadow-2xs"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-800 transition-colors p-0.5"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[11px] text-slate-600 font-medium mt-1.5">
          Email is auto-confirmed. Share these credentials directly with the {role === 'admin' ? 'administrator' : role === 'hod' ? 'HOD' : 'faculty member'}.
        </p>
      </div>

      {/* Modal Footer */}
      <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={submitting || (role !== 'admin' && !departmentId)}
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Provisioning...
            </>
          ) : (
            <>
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Create {role === 'admin' ? 'Administrator' : role === 'hod' ? 'HOD' : 'Faculty'} Account
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export const CreateStaffModal: React.FC<CreateStaffModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accessToken,
  mode,
  departments,
  lockedDepartment,
  defaultRole = 'faculty',
  defaultDepartmentId,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === 'hod'
          ? 'Onboard Department Faculty Member'
          : defaultRole === 'admin'
            ? 'Provision System Administrator Account'
            : defaultRole === 'hod'
              ? 'Appoint / Onboard Department HOD'
              : 'Create University Staff Account'
      }
      subtitle={
        mode === 'hod'
          ? 'Add a new faculty member strictly under your academic department'
          : defaultRole === 'admin'
            ? 'Provision new administrator credentials with institutional governance permissions'
            : defaultRole === 'hod'
              ? 'Provision new HOD credentials with automatic department allocation'
              : 'Provision Administrator, HOD, or Faculty credentials with automatic assignment'
      }
    >
      {isOpen && (
        <CreateStaffForm
          key={`${defaultDepartmentId || ''}-${defaultRole}`}
          onClose={onClose}
          onSuccess={onSuccess}
          accessToken={accessToken}
          mode={mode}
          departments={departments}
          lockedDepartment={lockedDepartment}
          defaultRole={defaultRole}
          defaultDepartmentId={defaultDepartmentId}
        />
      )}
    </Modal>
  );
};
