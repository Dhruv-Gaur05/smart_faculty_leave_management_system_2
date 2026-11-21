import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs py-8 border-t-2 border-amber-500/70 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p className="font-bold text-white uppercase tracking-wider font-serif">
            National University Academic System
          </p>
          <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
            Faculty Leave Management &amp; Approval System &copy; 2026. Official Academic Portal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px]">
          <span className="hover:text-slate-200 transition-colors">Institutional Statutes</span>
          <span className="text-slate-700">•</span>
          <span className="hover:text-slate-200 transition-colors">Faculty Leave Rules</span>
          <span className="text-slate-700">•</span>
          <span className="hover:text-slate-200 transition-colors">IT Helpdesk</span>
          <span className="text-slate-700">•</span>
          <span className="hover:text-slate-200 transition-colors">Registrar Secretariat</span>
        </div>
      </div>
    </footer>
  );
};
