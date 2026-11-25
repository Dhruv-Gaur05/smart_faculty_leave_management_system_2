'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import {
  User,
  Camera,
  PenTool,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Building,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Loader2
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'details' | 'signature'>('details');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');

  // Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasCanvasSignature, setHasCanvasSignature] = useState(false);

  // Load user profile on open
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/profile?id=${encodeURIComponent(user.id)}`);
        const data = await res.json();
        if (isMounted && data.success && data.profile) {
          setName(data.profile.name || profile?.name || '');
          setPhone(data.profile.phone || '');
          setRoomNumber(data.profile.room_number || '');
          setEmergencyContact(data.profile.emergency_contact || '');
          setAvatarUrl(data.profile.avatar_url || '');
          setSignatureUrl(data.profile.signature_url || '');
        } else if (profile) {
          setName(profile.name || '');
        }
      } catch (err) {
        console.warn('Error loading profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.id, profile]);

  // Handle Photo File Upload (Convert to base64)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Profile picture must be under 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatarUrl(base64);
      setStatusMessage({ type: 'success', text: 'Profile photo selected. Click "Save Changes" to update.' });
    };
    reader.readAsDataURL(file);
  };

  // Handle Signature File Upload (Convert to base64)
  const handleSignatureFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Signature image must be under 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSignatureUrl(base64);
      setStatusMessage({ type: 'success', text: 'Signature image uploaded. Click "Save Changes" to apply.' });
    };
    reader.readAsDataURL(file);
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasCanvasSignature(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasCanvasSignature(false);
  };

  const applyCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasCanvasSignature) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureUrl(dataUrl);
    setStatusMessage({ type: 'success', text: 'Handwritten signature captured! Click "Save Changes" to confirm.' });
  };

  // Submit Profile Changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          updates: {
            name: name.trim() || undefined,
            phone: phone.trim() || null,
            room_number: roomNumber.trim() || null,
            emergency_contact: emergencyContact.trim() || null,
            avatar_url: avatarUrl || null,
            signature_url: signatureUrl || null,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: 'Profile & signature updated successfully!' });
        if (onProfileUpdated) onProfileUpdated();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error communicating with server';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <User className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif tracking-wide">
                Faculty Profile &amp; Digital Signature
              </h2>
              <p className="text-[11px] text-blue-200">
                Bikaner Technical University • Institutional Credentials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'details'
                ? 'border-blue-900 text-blue-950 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile &amp; Contacts</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signature')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'signature'
                ? 'border-blue-900 text-blue-950 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Digital Signature Seal</span>
            {signatureUrl && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Signature Active"></span>
            )}
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-900" />
              <p className="text-xs">Loading institutional profile records...</p>
            </div>
          ) : activeTab === 'details' ? (
            <div className="space-y-6">
              {/* Profile Avatar Card */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-300 shadow-sm overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold font-serif text-blue-950">
                        {name ? name.charAt(0) : 'U'}
                      </span>
                    )}
                  </div>
                  <label
                    htmlFor="avatar-file-input"
                    className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-blue-900 text-white shadow-md hover:bg-blue-800 cursor-pointer"
                    title="Upload Photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </label>
                  <input
                    id="avatar-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">{name || 'Faculty Member'}</h3>
                  <p className="text-xs text-blue-900 font-semibold">{profile?.designation || 'Academic Staff'}</p>
                  <p className="text-[11px] text-slate-500">
                    Employee ID: <span className="font-mono text-slate-800 font-bold">{profile?.employee_id || 'BTU-FAC'}</span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    JPG or PNG under 2MB. Displayed on campus security passes and university portal.
                  </p>
                </div>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              {/* Official Academic Information (Read-Only) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-blue-50/40 border border-blue-200/60">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Institutional Email
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || ''}
                    className="w-full text-xs px-3 py-2 bg-white/70 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Academic Designation
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile?.designation || 'Academic Staff'}
                    className="w-full text-xs px-3 py-2 bg-white/70 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Editable Contact Fields */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-900" />
                  Direct Contact &amp; Campus Location
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Official Phone / Mobile Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98290 XXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Emergency Contact Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 94140 XXXXX"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    Department Cabin / Office Room Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Block-B, First Floor, Room 204"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 text-slate-900"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Signature Overview Banner */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Official University Electronic Signature</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Your digital signature is legally bound to your institutional credentials and will automatically appear on official Leave Sanction Slips and Campus Movement Gate Passes.
                  </p>
                </div>
              </div>

              {/* Current Active Signature Preview */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Current Active Signature:
                  </span>
                  {signatureUrl && (
                    <button
                      type="button"
                      onClick={() => setSignatureUrl('')}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                    >
                      Clear Signature
                    </button>
                  )}
                </div>

                <div className="h-28 bg-white border border-dashed border-slate-300 rounded-lg flex items-center justify-center p-3 relative">
                  {signatureUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={signatureUrl}
                      alt="Digital Signature"
                      className="max-h-full max-w-full object-contain filter contrast-125"
                    />
                  ) : (
                    <div className="text-center text-slate-400 space-y-1">
                      <PenTool className="w-6 h-6 mx-auto text-slate-300" />
                      <p className="text-xs font-medium">No signature configured</p>
                      <p className="text-[10px]">Draw on pad below or upload an image</p>
                    </div>
                  )}

                  {signatureUrl && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      Verified
                    </div>
                  )}
                </div>
              </div>

              {/* Option A: Interactive Drawing Pad */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-blue-900" />
                    Method 1: Draw Signature with Stylus or Mouse
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset Pad
                    </button>
                    {hasCanvasSignature && (
                      <button
                        type="button"
                        onClick={applyCanvasSignature}
                        className="text-[11px] text-blue-900 font-bold flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        Capture Drawing
                      </button>
                    )}
                  </div>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-32 touch-none cursor-crosshair bg-slate-50/50"
                  />
                  <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Draw your handwritten signature inside the box</span>
                    <span>Canvas Resolution: 560x140</span>
                  </div>
                </div>
              </div>

              {/* Option B: File Upload */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-blue-900" />
                  Method 2: Upload Scanned Signature File
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="signature-file-input"
                    accept="image/png,image/jpeg"
                    onChange={handleSignatureFileUpload}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-400">PNG with transparent background recommended</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">
              BTU Identity Governance Protocol
            </span>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Saving Changes...
                  </>
                ) : (
                  'Save Profile & Signature'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
