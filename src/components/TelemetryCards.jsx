import React from 'react';
import { MapPin, Gauge, Thermometer, ShieldAlert } from 'lucide-react';

export default function TelemetryCards({ substation, telemetry, prediction }) {
  const loadPct = telemetry.load_percentage;
  const oilTemp = telemetry.transformer_oil_temp_c;
  const riskPct = prediction.risk_percentage;
  const isSafe = riskPct < 45;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* 1. Substation Feeding Area */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card hover:border-slate-300 transition-colors flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Serving Locality
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <MapPin className="w-4 h-4" />
            </div>
          </div>

          <div className="text-2xl font-bold text-slate-900 tracking-tight mb-1 truncate">
            {substation.area}
          </div>
          <span className="text-xs text-slate-500">
            {substation.name}
          </span>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs">
          <span className="font-medium text-slate-600">Grid Operator</span>
          <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {substation.operator} • {substation.voltage_kv} kV
          </span>
        </div>
      </div>

      {/* 2. Transformer Load Ratio */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card hover:border-slate-300 transition-colors flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Feeder Load Ratio
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-amber-500/15 text-amber-900 border border-amber-500/40">
                {telemetry.telemetry_source || 'Simulated'}
              </span>
            </div>
            <div className={`p-1.5 rounded-lg border ${
              loadPct < 75 ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
              loadPct < 85 ? 'bg-amber-50 text-amber-800 border-amber-100' :
              'bg-rose-50 text-rose-600 border-rose-100'
            }`}>
              <Gauge className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
              {loadPct}
            </span>
            <span className="text-sm font-semibold text-slate-500">%</span>
            <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded ${
              loadPct < 75 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              loadPct < 85 ? 'bg-amber-50 text-amber-800 border border-amber-200' :
              'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {loadPct < 75 ? 'Optimal' : loadPct < 85 ? 'Elevated' : 'Overload'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                loadPct < 75 ? 'bg-emerald-600' :
                loadPct < 85 ? 'bg-amber-500' :
                'bg-rose-600'
              }`}
              style={{ width: `${Math.min(100, loadPct)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 font-mono">
          <span>Cap: {substation.capacity_mva} MVA</span>
          <span className="text-slate-700 font-semibold">{telemetry.active_power_mw} MW Active</span>
        </div>
      </div>

      {/* 3. Transformer Oil Temp */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card hover:border-slate-300 transition-colors flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Transformer Oil Temp
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-amber-500/15 text-amber-900 border border-amber-500/40">
                {telemetry.telemetry_source || 'Simulated'}
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Thermometer className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
              {oilTemp}
            </span>
            <span className="text-sm font-semibold text-slate-500">°C</span>
            <span className="ml-auto text-xs font-mono text-slate-500">
              Threshold: 85°C
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                oilTemp < 72 ? 'bg-emerald-600' :
                oilTemp < 80 ? 'bg-amber-500' :
                'bg-rose-600'
              }`}
              style={{ width: `${Math.min(100, (oilTemp / 85) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 font-mono">
          <span>Ambient: {telemetry.ambient_temp_c}°C</span>
          <span className="text-slate-700 font-semibold">Rise: +{telemetry.temperature_delta_c}°C</span>
        </div>
      </div>

      {/* 4. AI Outage Risk (4h) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card hover:border-slate-300 transition-colors flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Outage Risk (4h Lookahead)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-blue-50 text-blue-800 border border-blue-200">
                AI Forecast
              </span>
            </div>
            <div className={`p-1.5 rounded-lg border ${
              isSafe ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
              riskPct < 75 ? 'bg-amber-50 text-amber-800 border-amber-100' :
              'bg-rose-50 text-rose-600 border-rose-100'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 mb-2">
            <span className={`text-3xl font-bold font-mono tracking-tight ${
              isSafe ? 'text-emerald-800' : riskPct < 75 ? 'text-amber-800' : 'text-rose-700'
            }`}>
              {riskPct}%
            </span>
            <span className="text-xs font-medium text-slate-500">Probability</span>
            <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded uppercase ${
              isSafe ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              riskPct < 75 ? 'bg-amber-50 text-amber-800 border border-amber-200' :
              'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {prediction.status}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                isSafe ? 'bg-emerald-600' :
                riskPct < 75 ? 'bg-amber-500' :
                'bg-rose-600'
              }`}
              style={{ width: `${riskPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 font-mono">
          <span>Lookahead: 4 Hours</span>
          <span className="text-slate-700 font-semibold">XGBoost ML</span>
        </div>
      </div>
    </div>
  );
}

