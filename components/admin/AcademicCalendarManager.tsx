'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AcademicHoliday } from '@/types';
import {
  Calendar,
  UploadCloud,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  RefreshCw
} from 'lucide-react';

export const AcademicCalendarManager: React.FC = () => {
  const [holidays, setHolidays] = useState<AcademicHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // PDF Upload & Extraction States
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [extractedCandidates, setExtractedCandidates] = useState<Array<Omit<AcademicHoliday, 'id' | 'createdAt'>>>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<boolean[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Add Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState<AcademicHoliday['type']>('gazetted');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load holidays
  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/calendar');
      const data = await res.json();
      if (data.success && Array.isArray(data.holidays)) {
        setHolidays(data.holidays);
      }
    } catch (err: unknown) {
      console.error('Failed to load academic holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/calendar');
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.holidays)) {
          setHolidays(data.holidays);
        }
      } catch (err: unknown) {
        console.error('Failed to load academic holidays:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle PDF file selection
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setStatusMessage({ type: 'error', text: 'Please upload a PDF file containing the academic calendar or holiday list.' });
      return;
    }

    setUploadingPdf(true);
    setStatusMessage(null);
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/calendar/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to read PDF file' });
        return;
      }

      if (!data.extracted || data.extracted.length === 0) {
        setStatusMessage({
          type: 'error',
          text: 'No holiday dates could be detected automatically. You can add them manually using the "Add Holiday" button.',
        });
        return;
      }

      setExtractedCandidates(data.extracted);
      setSelectedCandidates(new Array(data.extracted.length).fill(true));
      setShowReviewModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error communicating with PDF parsing service';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm and Save Extracted Candidates
  const handleConfirmExtracted = async () => {
    const candidatesToSave = extractedCandidates.filter((_, idx) => selectedCandidates[idx]);
    if (candidatesToSave.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one holiday to save.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holidays: candidatesToSave }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: `Successfully added ${candidatesToSave.length} holidays from "${uploadedFileName}" to the University Academic Calendar!`,
        });
        setShowReviewModal(false);
        setExtractedCandidates([]);
        fetchHolidays();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to save holidays' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save extracted holidays';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Manual Add
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) {
      setStatusMessage({ type: 'error', text: 'Please provide both Title and Date.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          date: newDate,
          type: newType,
          description: newDescription.trim(),
          academicYear: '2026-2027',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: `Holiday "${newTitle}" added to the calendar.` });
        setShowAddModal(false);
        setNewTitle('');
        setNewDate('');
        setNewDescription('');
        fetchHolidays();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to add holiday' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding holiday';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to remove "${title}" from the academic calendar?`)) return;

    try {
      const res = await fetch(`/api/calendar?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: `Removed "${title}" from calendar.` });
        setHolidays((prev) => prev.filter((h) => h.id !== id));
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to delete' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting holiday';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  // Filtered and searched holidays
  const filteredHolidays = holidays.filter((h) => {
    const matchesFilter = filterType === 'all' || h.type === filterType;
    const matchesSearch =
      !searchQuery.trim() ||
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.date.includes(searchQuery) ||
      (h.description && h.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const gazettedCount = holidays.filter((h) => h.type === 'gazetted').length;
  const restrictedCount = holidays.filter((h) => h.type === 'restricted').length;
  const vacationCount = holidays.filter((h) => h.type === 'vacation').length;

  return (
    <Card
      title="Academic Calendar & Declared Public Holidays"
      subtitle="Configure university gazetted holidays, vacations, and auto-read calendar circulars (PDF)"
      className="shadow-sm border-slate-200"
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden File Input for PDF */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePdfUpload}
              accept=".pdf"
              className="hidden"
            />

            <Button
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPdf}
              className="bg-blue-900 hover:bg-blue-950 text-white flex items-center space-x-1.5"
            >
              {uploadingPdf ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Reading PDF...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-1" />
                  <span>Auto-Read Calendar PDF</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1 border-slate-300 hover:bg-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add Single Holiday</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchHolidays}
              title="Refresh Calendar"
              className="p-2 border-slate-300 hover:bg-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-800' : 'text-slate-600'}`} />
            </Button>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-md text-slate-700 shadow-2xs">
              Total: <strong className="text-slate-900">{holidays.length}</strong>
            </span>
            <span className="bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md text-rose-800 shadow-2xs">
              Gazetted: <strong>{gazettedCount}</strong>
            </span>
            <span className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md text-amber-800 shadow-2xs">
              Restricted: <strong>{restrictedCount}</strong>
            </span>
            <span className="bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md text-indigo-800 shadow-2xs">
              Vacations: <strong>{vacationCount}</strong>
            </span>
          </div>
        </div>

        {/* Feedback alert */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-500 hover:text-slate-800 font-bold ml-2 text-sm"
            >
              ×
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search holiday or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 focus:border-blue-900 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({holidays.length})
            </button>
            <button
              onClick={() => setFilterType('gazetted')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                filterType === 'gazetted'
                  ? 'bg-rose-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Gazetted ({gazettedCount})
            </button>
            <button
              onClick={() => setFilterType('restricted')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                filterType === 'restricted'
                  ? 'bg-amber-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Restricted ({restrictedCount})
            </button>
            <button
              onClick={() => setFilterType('vacation')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                filterType === 'vacation'
                  ? 'bg-indigo-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Vacations ({vacationCount})
            </button>
          </div>
        </div>

        {/* Holidays List / Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Holiday / Occasion</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-900 mb-2" />
                      Loading academic calendar...
                    </td>
                  </tr>
                ) : filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No holidays match the current filter or search.
                    </td>
                  </tr>
                ) : (
                  filteredHolidays.map((h) => {
                    const dateObj = new Date(h.date + 'T00:00:00');
                    const dayName = isNaN(dateObj.getTime())
                      ? ''
                      : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const formattedDate = isNaN(dateObj.getTime())
                      ? h.date
                      : dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

                    return (
                      <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">
                          {formattedDate}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {dayName}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {h.title}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              h.type === 'gazetted'
                                ? 'bg-rose-100 text-rose-900'
                                : h.type === 'restricted'
                                ? 'bg-amber-100 text-amber-900'
                                : h.type === 'vacation'
                                ? 'bg-indigo-100 text-indigo-900'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {h.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                          {h.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(h.id, h.title)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            title="Delete holiday"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Note on deduction policy */}
        <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-950 flex items-start space-x-3">
          <Calendar className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Leave Policy Compliance & Automatic Calculation:</p>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              When faculty members submit Casual Leave (CL) or Duty Leave (DL), declared Gazetted Holidays and Sundays falling within the leave range are automatically excluded from their deducted quota. Earned Leave (EL) counts continuous calendar days.
            </p>
          </div>
        </div>
      </div>

      {/* Review & Confirm Extracted Holidays Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-serif flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Review Extracted Academic Holidays</span>
                </h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  Extracted from <span className="font-mono text-white">{uploadedFileName}</span>. Review and confirm before adding to the calendar.
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-slate-300 hover:text-white text-lg font-bold p-1"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span>
                  Found <strong className="text-slate-900">{extractedCandidates.length}</strong> dates. Select which ones to save:
                </span>
                <div className="space-x-2">
                  <button
                    onClick={() => setSelectedCandidates(new Array(extractedCandidates.length).fill(true))}
                    className="text-blue-900 font-bold hover:underline"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => setSelectedCandidates(new Array(extractedCandidates.length).fill(false))}
                    className="text-slate-600 font-medium hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">Include</th>
                      <th className="px-3 py-2">Date (YYYY-MM-DD)</th>
                      <th className="px-3 py-2">Holiday Title</th>
                      <th className="px-3 py-2">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {extractedCandidates.map((c, idx) => (
                      <tr
                        key={idx}
                        className={selectedCandidates[idx] ? 'bg-white' : 'bg-slate-50 opacity-60'}
                      >
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedCandidates[idx]}
                            onChange={(e) => {
                              const updated = [...selectedCandidates];
                              updated[idx] = e.target.checked;
                              setSelectedCandidates(updated);
                            }}
                            className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono">
                          <input
                            type="date"
                            value={c.date}
                            onChange={(e) => {
                              const updated = [...extractedCandidates];
                              updated[idx] = { ...updated[idx], date: e.target.value };
                              setExtractedCandidates(updated);
                            }}
                            className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 font-mono w-32"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={c.title}
                            onChange={(e) => {
                              const updated = [...extractedCandidates];
                              updated[idx] = { ...updated[idx], title: e.target.value };
                              setExtractedCandidates(updated);
                            }}
                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 font-medium"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={c.type}
                            onChange={(e) => {
                              const updated = [...extractedCandidates];
                              updated[idx] = { ...updated[idx], type: e.target.value as AcademicHoliday['type'] };
                              setExtractedCandidates(updated);
                            }}
                            className="border border-slate-200 rounded px-2 py-1 text-xs bg-white text-slate-900"
                          >
                            <option value="gazetted">Gazetted</option>
                            <option value="restricted">Restricted</option>
                            <option value="vacation">Vacation</option>
                            <option value="exam">Exam</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Selected: <strong>{selectedCandidates.filter(Boolean).length}</strong> of {extractedCandidates.length}
              </span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReviewModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmExtracted}
                  disabled={submitting || selectedCandidates.filter(Boolean).length === 0}
                  className="bg-blue-900 hover:bg-blue-950 text-white"
                >
                  {submitting ? 'Saving to Calendar...' : 'Confirm & Save to Calendar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Single Holiday Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-950 to-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base font-serif flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Add Single Holiday</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-300 hover:text-white text-lg font-bold p-1"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleManualAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Holiday / Occasion Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahavir Jayanti, College Foundation Day"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Category *
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as AcademicHoliday['type'])}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 text-slate-900 bg-white"
                  >
                    <option value="gazetted">Gazetted (Mandatory)</option>
                    <option value="restricted">Restricted (RH)</option>
                    <option value="vacation">Vacation / Recess</option>
                    <option value="exam">Examination Duty</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Description / Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. University closed for academic teaching"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  className="bg-blue-900 hover:bg-blue-950 text-white"
                >
                  {submitting ? 'Saving...' : 'Add to Calendar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
};
