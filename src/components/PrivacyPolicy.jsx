import React from 'react';
import { ArrowLeft, Shield, Lock, AlertTriangle, Mail } from 'lucide-react';

export default function PrivacyPolicy({ onBack }) {
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
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
              Privacy Policy
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
            <strong className="font-bold">Demonstration & Non-Affiliation Notice:</strong> This web application is a personal research and demonstration project. It is not affiliated with, authorized by, or an official service of West Bengal State Electricity Distribution Company Limited (WBSEDCL), CESC Limited, or West Bengal State Electricity Transmission Company Limited (WBSETCL).
          </div>
        </div>
      </div>

      {/* Policy Content Body */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-card space-y-6 text-sm text-slate-700 leading-relaxed">
        {/* ==================================================================== */}
        {/* TODO: Paste finalized legal privacy policy text here                */}
        {/* Replace the sections below with your finalized legal counsel wording */}
        {/* ==================================================================== */}

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            1. Zero Data Persistence Policy (Mobile Numbers & Inputs)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            When users interact with the Voluntary Demand Response widget and enter a mobile number for simulated SMS enrollment, that number is processed exclusively in transient local client memory (React component state / Streamlit session buffer). 
            <strong> Real phone numbers are never stored in any database, written to server disk, logged to analytics systems, or transmitted to commercial SMS gateways.</strong>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            2. Simulated vs. Live Telemetry Data
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            All substation electrical metrics, SCADA dispatch logs, customer recipient lists, and bill rebate credits are synthetically modeled. Real-time atmospheric metrics (ambient temperature, humidity, heat index, and PM2.5 AQI) are fetched directly from Open-Meteo's open public forecast APIs without sending any user identifier.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            3. Cookies and Tracking Technologies
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            BengalGrid AI does not use third-party advertising cookies, cross-site trackers, or commercial profiling beacons. Any client storage is restricted strictly to necessary application preferences (such as selected theme or Pincode filters) stored locally in your browser.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            4. Contact & Inquiries
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            For questions regarding this demonstration project, data handling, or research methodology, please contact the maintainer at:
            {/* TODO: Replace contact email with your finalized address */}
            <span className="font-mono text-blue-600 font-semibold ml-1">contact@bengalgrid.ai</span>
          </p>
        </section>
      </div>
    </div>
  );
}
