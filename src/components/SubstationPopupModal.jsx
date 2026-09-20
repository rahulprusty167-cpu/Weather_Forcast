import React from 'react';
import { 
  X, 
  Zap, 
  Activity, 
  Thermometer, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  Radio, 
  Maximize2,
  Sliders
} from 'lucide-react';
import Substation3DPreview from './Substation3DPreview';

/**
 * SubstationPopupModal
 * The floating, semi-transparent card overlay that connects to the selected station via
 * an SVG leader line, replacing the old static sidebar panel.
 */
export default function SubstationPopupModal({
  node,
  onClose,
  onStageDR,
  modalPositionStyle
}) {
  if (!node) return null;

  const isCritical = node.status === 'CRITICAL';
  const isElevated = node.status === 'ELEVATED';

  return (
    <div
      style={modalPositionStyle}
      className="absolute z-40 w-84 sm:w-96 rounded-2xl bg-slate-950/85 backdrop-blur-2xl border border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.15)] overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 pointer-events-auto"
    >
      {/* Top Header Bar */}
      <div className="p-4 pb-3 border-b border-slate-800/80 flex items-start justify-between gap-3 bg-gradient-to-r from-slate-900/90 to-slate-950/90">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              {node.id}
            </span>

            {/* Status Badge */}
            {isCritical ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                Critical Overload
              </span>
            ) : isElevated ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Elevated
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Safe
              </span>
            )}
          </div>

          <h3 className="text-base font-black text-white tracking-tight leading-snug">
            {node.name}
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            {node.area} • Pincode: <span className="text-cyan-300 font-mono">{node.pincode}</span>
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Substation Details Modal"
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors focus:outline-none"
          title="Close Pop-up"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3D Site Preview Panel */}
      <div className="p-3.5 pb-2">
        <Substation3DPreview node={node} status={node.status} />
      </div>

      {/* Live SCADA Telemetry Data Grid */}
      <div className="p-3.5 pt-1 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400 pb-1 border-b border-slate-800">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            Live Telemetry Data
          </span>
          <span className="text-[10px] text-emerald-400">Synced (1000ms)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {/* Voltage */}
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/90">
            <span className="text-[10px] font-sans font-medium text-slate-400 block mb-0.5">
              Voltage
            </span>
            <span className="text-sm font-black text-white">
              {node.voltage_kv} <span className="text-[10px] text-slate-400">kV</span>
            </span>
          </div>

          {/* Active Load */}
          <div className="p-2 rounded-xl bg-slate-900/80 border border-cyan-500/20">
            <span className="text-[10px] font-sans font-medium text-slate-400 block mb-0.5">
              Active Load
            </span>
            <span className="text-sm font-black text-cyan-300">
              {node.active_mw} <span className="text-[10px] text-slate-400">MW</span>{' '}
              <span className="text-[11px] text-cyan-400 font-bold">({node.load_pct}%)</span>
            </span>
          </div>

          {/* Oil Temp */}
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/90">
            <span className="text-[10px] font-sans font-medium text-slate-400 block mb-0.5">
              Oil Temp
            </span>
            <span className="text-sm font-black text-amber-300">
              {node.oil_temp_c}°C{' '}
              <span className="text-[10px] text-slate-400">(+{node.temp_delta_c}°C)</span>
            </span>
          </div>

          {/* AI Outage Risk */}
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/90">
            <span className="text-[10px] font-sans font-medium text-slate-400 block mb-0.5">
              AI Outage Risk
            </span>
            <span className={`text-sm font-black ${
              node.risk_pct >= 75 ? 'text-rose-400' : node.risk_pct >= 45 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {node.risk_pct}%
            </span>
          </div>
        </div>

        {/* Additional Utility Metadata */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
          <span>Grid Operator: <strong className="text-slate-200">{node.operator}</strong></span>
          <span>Feeder Cap: <strong className="text-slate-200">{node.capacity_mva} MVA</strong></span>
        </div>

        {/* Action Button: Stage Pre-Emptive DR Dispatch */}
        <button
          onClick={() => onStageDR(node)}
          className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 group cursor-pointer"
        >
          <span>Stage Pre-Emptive DR Dispatch</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
