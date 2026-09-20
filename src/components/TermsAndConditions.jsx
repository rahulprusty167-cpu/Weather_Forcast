import React from 'react';
import { ArrowLeft, FileText, AlertTriangle, Scale, Mail } from 'lucide-react';

export default function TermsAndConditions({ onBack }) {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </button>

      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-card">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
              Terms & Conditions
            </h1>
            <p className="text-xs text-slate-500">
              BengalGrid AI Demonstration Prototype • Last Updated: September 2026
            </p>
          </div>
        </div>

        {/* Demo Disclaimer Alert */}
        <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Important Notice:</strong> BengalGrid AI is an experimental educational and research digital twin demonstration. It is not an official portal of WBSEDCL, CESC, or WBSETCL.
          </div>
        </div>
      </div>

      {/* Terms Content Body */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-card space-y-6 text-sm text-slate-700 leading-relaxed">
        {/* ==================================================================== */}
        {/* TODO: Paste finalized legal terms and conditions here               */}
        {/* Replace the placeholder sections below with your finalized legal wording */}
        {/* ==================================================================== */}

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-600" />
            1. Educational Simulation Scope
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            BengalGrid AI is developed exclusively for technical showcase, machine learning interpretability, and digital twin simulation purposes. All grid telemetry, feeder thermal status indicators, transformer risk percentages, and demand response dispatches are model-generated approximations and should not be used as real-time life-safety operational data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            2. Non-Affiliation and Utility Disclaimers
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            West Bengal State Electricity Distribution Company Limited (WBSEDCL), CESC Limited, and West Bengal State Electricity Transmission Company Limited (WBSETCL) names and trademarks are referenced strictly for geographic context and modeling demonstration. This site is not sponsored, endorsed, or affiliated with any government authority or public utility.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-600" />
            3. No Real Monetary Transactions or Bill Credits
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Any references to "bill credits", "micro-rebates", or rupee amounts (₹) within the Demand Response modules are simulated gameplay elements. No real financial obligations, credits, debits, or billing modifications occur or are implied.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            4. Inquiries & Feedback
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            For questions regarding licensing, source code, or terms of use:
            {/* TODO: Replace contact email with your finalized address */}
            <span className="font-mono text-blue-600 font-semibold ml-1">contact@bengalgrid.ai</span>
          </p>
        </section>
      </div>
    </div>
  );
}
