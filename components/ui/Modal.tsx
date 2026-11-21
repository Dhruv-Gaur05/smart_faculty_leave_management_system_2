'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      className="m-auto p-0 bg-white border border-slate-300 shadow-2xl w-full max-w-lg backdrop:bg-slate-900/60 backdrop:backdrop-blur-xs rounded-2xl overflow-hidden open:animate-in open:fade-in open:zoom-in-95"
    >
      {/* Modal Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-4.5 border-b-2 border-amber-500 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold uppercase tracking-wide font-serif text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-blue-100/90 mt-0.5 leading-relaxed font-sans">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="text-slate-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Modal Content */}
      <div className="p-6 bg-white text-slate-900">{children}</div>
    </dialog>
  );
};

