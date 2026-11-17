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
      className="m-auto p-0 bg-white border-2 border-slate-400 shadow-2xl w-full max-w-lg backdrop:bg-slate-950/60 rounded-none open:animate-in open:fade-in"
    >
      {/* Modal Header */}
      <div className="bg-blue-900 text-white px-5 py-4 border-b-4 border-slate-950 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider font-serif">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-blue-200 mt-0.5">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="text-blue-200 hover:text-white p-1 focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Modal Content */}
      <div className="p-5">{children}</div>
    </dialog>
  );
};

