import React from 'react';
import { Mail, Shield, FileText, Zap } from 'lucide-react';

export default function Footer({ onNavigate }) {
  // Handler for navigation (supports both prop handler and URL pushState)
  const handleLinkClick = (e, path) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  return (
    <footer className="mt-12 pt-8 pb-10 border-t border-slate-200 text-slate-500 text-xs">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Project Branding & Description */}
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-blue-600 text-white">
              <Zap className="w-3.5 h-3.5 fill-white" />
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">
              BengalGrid <span className="text-blue-600">AI</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
              Research Prototype
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            An experimental personal demonstration project exploring AI-driven transformer thermal stress forecasting and voluntary pre-emptive demand response in West Bengal.
          </p>
          <p className="text-[11px] text-slate-400">
            ⚠️ Simulation for educational purposes only. Not affiliated with WBSEDCL, CESC, or WBSETCL.
          </p>
        </div>

        {/* Contact & Legal Navigation Links */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 self-start md:self-auto">
          {/* Contact Email */}
          <div className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            {/* TODO: Update contact email when provided */}
            <a 
              href="mailto:contact@bengalgrid.ai"
              className="hover:underline font-mono text-[11px]"
            >
              contact@bengalgrid.ai
            </a>
          </div>

          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <a
              href="/privacy"
              onClick={(e) => handleLinkClick(e, 'privacy')}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Privacy Policy</span>
            </a>

            <span className="text-slate-300">•</span>

            <a
              href="/terms"
              onClick={(e) => handleLinkClick(e, 'terms')}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Terms & Conditions</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
