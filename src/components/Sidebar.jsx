import React from 'react';
import { 
  Zap, 
  Users, 
  Cpu, 
  Thermometer, 
  Droplets, 
  Flame, 
  Wind, 
  RefreshCw, 
  Activity,
  ShieldCheck,
  Radio,
  Clock
} from 'lucide-react';

export default function Sidebar({ 
  viewMode, 
  setViewMode, 
  envData, 
  onRefresh, 
  isRefreshing, 
  lastUpdated 
}) {
  return (
    <aside className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col p-5 text-slate-800 flex-shrink-0 z-30">
      {/* Brand Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            Grid Operations Twin
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1">
              BengalGrid <span className="text-blue-600 font-bold">AI</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">State Distribution Telemetry</p>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="mb-6">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
          Portal View
        </label>
        <div className="p-1 rounded-lg bg-slate-100 border border-slate-200 grid grid-cols-1 gap-1">
          <button
            onClick={() => setViewMode('citizen')}
            aria-label="Switch to Citizen Outage Readiness view"
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              viewMode === 'citizen'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Users className={`w-4 h-4 ${viewMode === 'citizen' ? 'text-blue-600' : 'text-slate-500'}`} />
            <span>Citizen Outage Readiness</span>
          </button>

          <button
            onClick={() => setViewMode('operator')}
            aria-label="Switch to SCADA Operator Digital Twin view"
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
              viewMode === 'operator'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Cpu className={`w-4 h-4 ${viewMode === 'operator' ? 'text-blue-600' : 'text-slate-500'}`} />
            <span>SCADA Operator Console</span>
          </button>
        </div>
      </div>

      {/* Live Environmental Feeds */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Environmental Telemetry
              </span>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold flex items-center gap-1 ${
              envData.is_live
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${envData.is_live ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {envData.is_live ? 'Live Open-Meteo' : 'Fallback'}
            </span>
          </div>

          {/* Locality & Satellite Ping Info */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-2.5 px-0.5">
            <span>Station: <strong className="text-slate-700">{envData.area || 'Khardaha'}</strong></span>
            <span className="text-emerald-700 font-semibold">{envData.latency_ms ? `${envData.latency_ms}ms ping` : 'Live Weather API'}</span>
          </div>

          {/* Flat Corporate Data Cards */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {/* Ambient Temp */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">Ambient Temp</span>
                <Thermometer className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 flex items-baseline gap-0.5">
                {envData.temperature_c}
                <span className="text-xs text-slate-500 font-sans">°C</span>
              </div>
            </div>

            {/* Relative Humidity */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">Humidity</span>
                <Droplets className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 flex items-baseline gap-0.5">
                {envData.relative_humidity_pct}
                <span className="text-xs text-slate-500 font-sans">%</span>
              </div>
            </div>

            {/* Heat Index */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">Heat Index</span>
                <Flame className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-lg font-bold font-mono text-amber-800 flex items-baseline gap-0.5">
                {envData.apparent_temperature_c}
                <span className="text-xs text-amber-800/70 font-sans">°C</span>
              </div>
            </div>

            {/* Air Quality Index */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">US AQI</span>
                <Wind className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="text-lg font-bold font-mono text-rose-700 flex items-baseline gap-1">
                {envData.aqi_us}
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans uppercase font-bold ${
                  (envData.aqi_us || 100) > 200 ? 'bg-purple-100 text-purple-700' :
                  (envData.aqi_us || 100) > 150 ? 'bg-rose-100 text-rose-700' :
                  (envData.aqi_us || 100) > 100 ? 'bg-amber-100 text-amber-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  {envData.aqi_category || 'Poor'}
                </span>
              </div>
            </div>
          </div>

          {/* AC Stress Factor Flat Card */}
          <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-100 mb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-700" />
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Cooling Load Factor
                </span>
              </div>
              <span className="text-base font-bold font-mono text-blue-700">
                {envData.ac_load_stress_factor}x
              </span>
            </div>
            <p className="text-[11px] text-blue-900/80 leading-relaxed">
              Elevated heat index and air quality stress drive continuous compressor duty cycles across feeders.
            </p>
          </div>
        </div>

        {/* Footer Controls & Telemetry Status */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-2.5">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {envData.is_live ? 'Live Weather Synced' : 'Simulated Grid Telemetry (Demo)'}
            </span>
            <span className="font-mono text-[11px] text-slate-500">{envData.latency_ms ? `${envData.latency_ms}ms ping` : '50 Nodes • 5s'}</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh Environmental and Grid Telemetry"
            className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Synchronizing...' : 'Refresh Telemetry'}</span>
          </button>

          <p className="text-[11px] text-slate-500 text-center mt-2.5 font-mono flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            Last Updated: {lastUpdated}
          </p>
        </div>
      </div>
    </aside>
  );
}

