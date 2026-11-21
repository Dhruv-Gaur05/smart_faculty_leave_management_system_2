import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300/80 transition-all ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-slate-50/90 to-slate-50/40 rounded-t-xl">
          <div>
            {title && (
              <h3 className="text-base font-bold text-slate-900 tracking-tight font-serif">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};
