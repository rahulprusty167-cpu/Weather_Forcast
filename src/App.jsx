import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { 
  Search, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  Zap, 
  Sparkles,
  Info,
  Radio,
  Sliders
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import StatusBanner from './components/StatusBanner';
import TelemetryCards from './components/TelemetryCards';
import CitizenReadiness from './components/CitizenReadiness';
import ExplainabilityCard from './components/ExplainabilityCard';
import DemandResponseWidget from './components/DemandResponseWidget';
import CitizenTransformer3D from './components/3d/CitizenTransformer3D';

// Code-split heavy Operator Console to make Citizen View load instantly
const OperatorConsole = lazy(() => import('./components/OperatorConsole'));

function OperatorConsoleSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between pb-2">
        <div className="h-8 bg-slate-200 rounded-xl w-72"></div>
        <div className="h-8 bg-slate-200 rounded-xl w-36"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-28 bg-white rounded-xl border border-slate-200 shadow-sm"></div>
        <div className="h-28 bg-white rounded-xl border border-slate-200 shadow-sm"></div>
        <div className="h-28 bg-white rounded-xl border border-slate-200 shadow-sm"></div>
      </div>
      <div className="h-[520px] bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
        <span className="text-xs font-medium text-slate-500 tracking-wide uppercase">Loading SCADA Geospatial Engine...</span>
      </div>
    </div>
  );
}


import { CURATED_SUBSTATIONS, PINCODE_OPTIONS, DEFAULT_ENV_DATA } from './data/substationsData';
import { generateSubstationTelemetry, predictRisk } from './services/gridEngine';
import { fetchLiveEnvironmentalData } from './services/liveWeatherService';

export default function App() {
  const [viewMode, setViewMode] = useState('citizen'); // 'citizen' or 'operator'
  const [selectedPincode, setSelectedPincode] = useState('700117'); // Default Khardaha
  const [envData, setEnvData] = useState(DEFAULT_ENV_DATA);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  const [searchFilter, setSearchFilter] = useState('');

  // Active Substation corresponding to selected Pincode
  const activeSubstation = useMemo(() => {
    const matched = CURATED_SUBSTATIONS.find(s => s.pincode === selectedPincode);
    return matched || CURATED_SUBSTATIONS[0];
  }, [selectedPincode]);

  // Live Telemetry for the active substation
  const [telemetry, setTelemetry] = useState(() => 
    generateSubstationTelemetry(CURATED_SUBSTATIONS[0], DEFAULT_ENV_DATA)
  );

  // Automatically fetch real live weather & AQI from Open-Meteo on mount and when substation changes
  useEffect(() => {
    let isMounted = true;
    async function loadLiveTelemetry() {
      setIsRefreshing(true);
      const live = await fetchLiveEnvironmentalData(
        activeSubstation.lat,
        activeSubstation.lon,
        activeSubstation.area
      );
      if (isMounted && live) {
        setEnvData(live);
        setLastUpdated(live.timestamp);
        setTelemetry(generateSubstationTelemetry(activeSubstation, live, new Date()));
      }
      if (isMounted) {
        setIsRefreshing(false);
      }
    }

    loadLiveTelemetry();

    // Auto-sync with live Open-Meteo weather every 30 seconds
    const interval = setInterval(loadLiveTelemetry, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeSubstation.pincode, activeSubstation.lat, activeSubstation.lon, activeSubstation.area]);

  // Recalculate telemetry and risk when substation or env changes
  useEffect(() => {
    const updatedTelemetry = generateSubstationTelemetry(activeSubstation, envData);
    setTelemetry(updatedTelemetry);
  }, [activeSubstation, envData]);

  // AI Outage Risk Prediction
  const prediction = useMemo(() => {
    return predictRisk(telemetry, envData);
  }, [telemetry, envData]);

  // High-frequency telemetry heartbeat ticker (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => generateSubstationTelemetry(activeSubstation, envData, new Date()));
      setLastUpdated(new Date().toLocaleTimeString());
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSubstation, envData]);

  // Manual Refresh Handler (fetches fresh live Open-Meteo payload)
  const handleRefresh = async () => {
    setIsRefreshing(true);
    const live = await fetchLiveEnvironmentalData(
      activeSubstation.lat,
      activeSubstation.lon,
      activeSubstation.area
    );
    if (live) {
      setEnvData(live);
      setLastUpdated(live.timestamp);
      setTelemetry(generateSubstationTelemetry(activeSubstation, live, new Date()));
    }
    setIsRefreshing(false);
  };

  // Quick localities list
  const quickLocalities = [
    { pincode: '700117', label: 'Khardaha' },
    { pincode: '700118', label: 'Rahara' },
    { pincode: '700120', label: 'Barrackpore' },
    { pincode: '700091', label: 'Salt Lake' },
    { pincode: '700001', label: 'Central Kolkata' },
    { pincode: '700110', label: 'Sodepur' },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-800">
      {/* Sidebar: Digital Twin Controls & Live Environmental Feeds */}
      <Sidebar 
        viewMode={viewMode}
        setViewMode={setViewMode}
        envData={envData}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
      />

      {/* Main Workspace Dashboard Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {viewMode === 'citizen' ? (
          /* ========================================================
             CITIZEN OUTAGE READINESS PORTAL VIEW
             ======================================================== */
          <div className="space-y-6">
            {/* Hero Section Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                    Citizen Transparency Portal
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    West Bengal Smart Grid Digital Twin
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                  Are You at Risk of a Power Cut?
                </h1>
                <p className="text-xs md:text-sm text-slate-600 mt-1">
                  AI-driven 4-hour thermal stress forecasting for Khardaha, Barrackpore, Salt Lake & Greater Kolkata
                </p>
              </div>

              {/* Status Pill in Hero */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm self-start md:self-auto">
                <span className={`w-2 h-2 rounded-full ${envData.is_live ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
                <span className="text-xs font-semibold text-slate-700">
                  {envData.is_live ? `Live Open-Meteo (${envData.latency_ms || 120}ms)` : 'Grid Synced'}
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                  LIVE API
                </span>
              </div>
            </div>

            {/* Pincode Search and Quick Locality Chips Bar */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search Dropdown */}
              <div className="flex-1 max-w-md">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-blue-600" />
                  Select or Enter 6-Digit West Bengal Pincode:
                </label>
                <div className="relative">
                  <select
                    value={selectedPincode}
                    onChange={(e) => setSelectedPincode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 hover:border-slate-400 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                  >
                    {PINCODE_OPTIONS.map(opt => (
                      <option key={opt.pincode} value={opt.pincode}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Select Locality Chips */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Quick Select Localities:
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {quickLocalities.map((loc) => (
                    <button
                      key={loc.pincode}
                      onClick={() => setSelectedPincode(loc.pincode)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedPincode === loc.pincode
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Critical System Alert Status Banner */}
            <StatusBanner 
              prediction={prediction} 
              substation={activeSubstation}
              telemetry={telemetry}
            />

            {/* Neighborhood Distribution Transformer 3D Digital Twin */}
            <CitizenTransformer3D
              pincode={selectedPincode}
              areaName={activeSubstation.area}
              telemetry={telemetry}
              prediction={prediction}
            />

            {/* Telemetry Metrics Row (4 SCADA Cards) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Real-Time Feeder SCADA Telemetry
                </span>
                <span className="text-[11px] font-mono font-medium text-blue-600">
                  MQTT Feed: Active • Latency 24ms
                </span>
              </div>
              <TelemetryCards 
                substation={activeSubstation}
                telemetry={telemetry}
                prediction={prediction}
              />
            </div>

            {/* Explainability & Demand Response Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Plain Language Explainability */}
              <ExplainabilityCard 
                attributions={prediction.plain_language_attributions}
              />

              {/* Citizen Voluntary Demand Response */}
              <DemandResponseWidget 
                pincode={selectedPincode}
                areaName={activeSubstation.area}
              />
            </div>

            {/* Citizen Readiness Recommendations Widgets */}
            <CitizenReadiness 
              pincode={selectedPincode}
              areaName={activeSubstation.area}
            />
          </div>
        ) : (
          /* ========================================================
             SCADA OPERATOR DIGITAL TWIN CONSOLE VIEW
             ======================================================== */
          <Suspense fallback={<OperatorConsoleSkeleton />}>
            <OperatorConsole envData={envData} />
          </Suspense>
        )}
      </main>
    </div>
  );
}
