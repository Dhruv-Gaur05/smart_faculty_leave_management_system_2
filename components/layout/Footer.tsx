import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs py-8 border-t-2 border-amber-500/70 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-white p-1 border border-amber-400/60 shadow-xs shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/btu-logo.png" alt="BTU Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-bold text-white uppercase tracking-wider font-serif">
              Bikaner Technical University (BTU)
            </p>
            <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
              Faculty Leave Management &amp; Approval System &copy; 2026. Official Academic Portal.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-slate-400 text-xs">
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
