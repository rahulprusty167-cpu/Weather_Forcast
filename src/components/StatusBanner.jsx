import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Clock, CheckCircle2 } from 'lucide-react';

export default function StatusBanner({ prediction, substation, telemetry }) {
  const riskPct = prediction.risk_percentage;
  const safeHours = prediction.safe_window_hours;

  // Compute "Guaranteed Stable Until" time
  const now = new Date();
  const safeUntilDate = new Date(now.getTime() + safeHours * 3600 * 1000);
  const safeUntilStr = safeUntilDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isSafe = riskPct < 45;
  const isWarn = riskPct >= 45 && riskPct < 75;
  const isCrit = riskPct >= 75;

  let config = {
    badge: "GRID TELEMETRY STABLE",
    headline: "Grid Stable: No Outage Expected",
    subtitle: `Distribution feeder (${substation.name}) is operating within nominal thermal and electrical parameters.`,
    cardBg: "bg-emerald-50/60 border-emerald-200",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    iconBg: "bg-emerald-600 text-white",
    textColor: "text-emerald-950",
    indicatorColor: "bg-emerald-600",
    icon: ShieldCheck
  };

  if (isWarn) {
    config = {
      badge: "ELEVATED GRID STRESS",
      headline: "Elevated Grid Stress: Minor Outage Risk",
      subtitle: `High cooling demand detected in ${substation.area}. Feeder operating near thermal warning threshold.`,
      cardBg: "bg-amber-50/70 border-amber-200",
      badgeClass: "bg-amber-100 text-amber-900 border-amber-200",
      iconBg: "bg-amber-600 text-white",
      textColor: "text-amber-950",
      indicatorColor: "bg-amber-600",
      icon: AlertTriangle
    };
  } else if (isCrit) {
    config = {
      badge: "CRITICAL OVERLOAD IMMINENT",
      headline: "Critical Thermal Overload Imminent: High Outage Risk",
      subtitle: `Severe thermal accumulation at ${substation.name}. Pre-emptive load reduction advised to avert circuit breaker trip.`,
      cardBg: "bg-rose-50/70 border-rose-200",
      badgeClass: "bg-rose-100 text-rose-900 border-rose-200",
      iconBg: "bg-rose-600 text-white",
      textColor: "text-rose-950",
      indicatorColor: "bg-rose-600",
      icon: AlertOctagon
    };
  }

  const BannerIcon = config.icon;

  return (
    <div className={`rounded-xl border ${config.cardBg} p-5 shadow-card transition-all duration-200`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left Status Area */}
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex-shrink-0">
            <div className={`w-10 h-10 rounded-lg ${config.iconBg} flex items-center justify-center shadow-sm`}>
              <BannerIcon className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${config.badgeClass}`}>
                {config.badge}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-500/15 text-amber-900 border border-amber-500/40">
                {telemetry.telemetry_source || 'Simulated'}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Feeder ID: {substation.id} • {substation.voltage_kv} kV
              </span>
            </div>

            <h2 className={`text-lg md:text-xl font-bold tracking-tight ${config.textColor} mb-1`}>
              {config.headline}
            </h2>
            <p className="text-xs md:text-sm text-slate-600 max-w-2xl leading-relaxed">
              {config.subtitle}
            </p>
          </div>
        </div>

        {/* Right Safe Window Metric Widget */}
        <div className="flex items-center lg:items-end justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200">
          <div className="bg-white px-4 py-2.5 rounded-lg border border-slate-200 shadow-sm lg:text-right">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center lg:justify-end gap-1 mb-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Forecast Safe Window
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight flex items-baseline lg:justify-end gap-1">
              ~{safeHours}
              <span className="text-xs text-slate-500 font-sans font-normal">Hours</span>
            </div>
            <div className="text-xs font-medium mt-0.5 flex items-center lg:justify-end gap-1 text-slate-600 flex-wrap">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Estimated Stable Until: <span className="font-mono font-semibold text-slate-800">{safeUntilStr}</span>
              <span className="text-[10px] text-slate-500 font-sans">(AI forecast, not a guarantee)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

