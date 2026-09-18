import React from 'react';
import { Brain, Info } from 'lucide-react';

export default function ExplainabilityCard({ attributions }) {
  return (
    <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Brain className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold tracking-tight text-slate-900">
              AI Risk Explainability Audit
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase font-semibold">
            SHAP Decomposed
          </span>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          XGBoost + SHAP TreeExplainer decomposing atmospheric vs electrical transformer stressors.
        </p>

        {/* Attribution Items */}
        <div className="space-y-2.5">
          {attributions.map((attr, idx) => (
            <div 
              key={idx}
              className="p-3 rounded-lg bg-slate-50 border-l-4 border-l-blue-600 border-y border-r border-slate-200"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-[11px] font-mono font-bold text-blue-700 px-1.5 py-0.5 rounded bg-blue-100 mt-0.5 flex-shrink-0">
                  #{idx + 1}
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {attr}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Corporate Advisory Footer */}
      <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800">Operational Methodology:</strong> Unlike conventional reactive SCADA alarms, BengalGrid AI correlates regional heat index and environmental metrics to forecast thermal accumulation <strong className="text-blue-700">4 hours in advance</strong>.
        </div>
      </div>
    </div>
  );
}

