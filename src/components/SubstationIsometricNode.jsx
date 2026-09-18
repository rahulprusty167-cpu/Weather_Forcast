import React from 'react';

/**
 * SubstationIsometricNode
 * Renders an individual 3D isometric substation model (transformer building,
 * base plinth with colored status glow, gantry tower) instead of an abstract dot.
 * Supports the "Clicked" state with a pulsing aqua halo, concentric projection rings,
 * and holographic vertical beacon.
 */
export default function SubstationIsometricNode({
  node,
  isSelected,
  onClick,
  style
}) {
  const isCritical = node.status === 'CRITICAL';
  const isElevated = node.status === 'ELEVATED';

  // Base colors based on operational status
  const statusConfig = isCritical
    ? {
        hex: '#f43f5e',
        glow: 'rgba(244, 63, 94, 0.85)',
        haloShadow: '0 0 20px rgba(244, 63, 94, 0.7)',
        ringBorder: 'border-rose-500',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/50'
      }
    : isElevated
    ? {
        hex: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.85)',
        haloShadow: '0 0 20px rgba(245, 158, 11, 0.7)',
        ringBorder: 'border-amber-500',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/50'
      }
    : {
        hex: '#10b981',
        glow: 'rgba(16, 185, 129, 0.85)',
        haloShadow: '0 0 20px rgba(16, 185, 129, 0.7)',
        ringBorder: 'border-emerald-500',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
      };

  return (
    <div
      style={style}
      className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 select-none ${
        isSelected ? 'z-40' : 'z-20 hover:z-30'
      }`}
    >
      <button
        type="button"
        onClick={() => onClick(node)}
        className="relative group focus:outline-none cursor-pointer flex flex-col items-center"
        aria-label={`${node.name} (${node.status})`}
      >
        {/* ========================================================
            THE "CLICKED" STATE: PULSING AQUA HALO & CONCENTRIC RINGS
           ======================================================== */}
        {isSelected && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center -top-3">
            {/* Outer expanding ripple ring */}
            <div className="absolute w-24 h-24 rounded-full border-2 border-cyan-400/60 animate-aqua-ring" />
            
            {/* Secondary delayed expanding ripple ring */}
            <div 
              className="absolute w-24 h-24 rounded-full border border-cyan-300/40 animate-aqua-ring" 
              style={{ animationDelay: '0.8s' }} 
            />

            {/* Core intense pulsing aqua halo */}
            <div className="absolute w-16 h-16 rounded-full bg-cyan-400/20 border-2 border-cyan-300 animate-aqua-halo" />

            {/* Vertical holographic projection beacon */}
            <div className="absolute bottom-8 w-1 h-14 bg-gradient-to-t from-cyan-400 via-cyan-300/70 to-transparent animate-beacon filter drop-shadow-[0_0_8px_#22d3ee]" />

            {/* Top Substation Identification Pin */}
            <div className="absolute -top-14 whitespace-nowrap px-3 py-1 rounded-lg bg-[#081022]/95 border border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.4)] backdrop-blur-md flex items-center gap-1.5 z-50">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[11px] font-black tracking-tight text-cyan-200">
                {node.name}
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${statusConfig.badgeBg}`}>
                {node.status}
              </span>
            </div>
          </div>
        )}

        {/* Hover Tooltip (When Not Selected) */}
        {!isSelected && (
          <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap px-2.5 py-1 rounded-md bg-slate-950/90 border border-slate-700 text-[10px] font-medium text-slate-200 shadow-xl z-50">
            <span className="font-bold text-white">{node.name}</span> • <span className="font-mono text-cyan-400">{node.load_pct}% Load</span>
          </div>
        )}

        {/* Base Status Glowing Floor Ring */}
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
            isSelected
              ? 'scale-125'
              : 'group-hover:scale-110 opacity-80 group-hover:opacity-100'
          }`}
          style={{
            boxShadow: isSelected
              ? `0 0 25px 4px #06b6d4, inset 0 0 15px ${statusConfig.hex}`
              : `0 0 12px 1px ${statusConfig.glow}`
          }}
        >
          {/* ========================================================
              3D ISOMETRIC MINIATURE SUBSTATION & TRANSFORMER MODEL (SVG)
             ======================================================== */}
          <svg
            viewBox="0 0 44 44"
            className={`w-9 h-9 transition-transform duration-300 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] ${
              isSelected ? 'scale-110' : 'group-hover:scale-105'
            }`}
          >
            <defs>
              {/* Isometric Shading Gradients */}
              <linearGradient id={`isoTop-${node.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
              <linearGradient id={`isoLeft-${node.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id={`isoRight-${node.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>

            {/* Base Foundation Diamond Plinth */}
            <polygon
              points="22,38 38,29 22,20 6,29"
              fill="#0a0f1d"
              stroke={isSelected ? '#22d3ee' : statusConfig.hex}
              strokeWidth={isSelected ? '2' : '1.2'}
            />
            {/* Plinth Thickness/Height */}
            <polygon points="6,29 22,38 22,41 6,32" fill="#020617" />
            <polygon points="22,38 38,29 38,32 22,41" fill="#0b1120" />

            {/* Transformer Main Isometric Core */}
            {/* Left Face */}
            <polygon points="14,24 22,29 22,17 14,12" fill={`url(#isoLeft-${node.id})`} />
            {/* Right Face */}
            <polygon points="22,29 30,24 30,12 22,17" fill={`url(#isoRight-${node.id})`} />
            {/* Top Face */}
            <polygon points="22,17 30,12 22,7 14,12" fill={`url(#isoTop-${node.id})`} />

            {/* Cooling Radiator Fin Highlights */}
            <line x1="16" y1="21" x2="16" y2="15" stroke="#64748b" strokeWidth="0.8" />
            <line x1="19" y1="23" x2="19" y2="17" stroke="#64748b" strokeWidth="0.8" />
            <line x1="25" y1="23" x2="25" y2="17" stroke="#64748b" strokeWidth="0.8" />
            <line x1="28" y1="21" x2="28" y2="15" stroke="#64748b" strokeWidth="0.8" />

            {/* High-Voltage Bushing Towers (Gantry Insulators) */}
            <line x1="18" y1="9" x2="18" y2="4" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="22" y1="7" x2="22" y2="2" stroke="#cbd5e1" strokeWidth="1.2" />
            <line x1="26" y1="9" x2="26" y2="4" stroke="#94a3b8" strokeWidth="1.2" />

            {/* Glowing Insulator Caps in Status Color */}
            <circle cx="18" cy="4" r="1.4" fill={statusConfig.hex} />
            <circle cx="22" cy="2" r="1.6" fill={isSelected ? '#00f0ff' : statusConfig.hex} />
            <circle cx="26" cy="4" r="1.4" fill={statusConfig.hex} />

            {/* Connecting Gantry Arch Wire */}
            <path
              d="M 18,4 Q 22,1 26,4"
              fill="none"
              stroke={isSelected ? '#22d3ee' : '#38bdf8'}
              strokeWidth="0.8"
            />
          </svg>
        </div>

        {/* Small Operator/Feeder KV Tag */}
        <span className="mt-1 text-[8px] font-mono font-bold text-slate-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 pointer-events-none group-hover:border-slate-700">
          {node.voltage_kv}kV
        </span>
      </button>
    </div>
  );
}
