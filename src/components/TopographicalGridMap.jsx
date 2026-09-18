import React, { useState, useRef, useEffect, useMemo } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Layers, 
  RotateCcw, 
  Activity, 
  Zap, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2,
  SlidersHorizontal,
  ExternalLink,
  Box
} from 'lucide-react';

/**
 * TopographicalGridMap
 * Enterprise-grade 2D Geographical SCADA Grid Map using standard Leaflet and CartoDB clean tiles.
 * Color-coded status markers with rich hover pop-up tooltips showing key metrics:
 * Name, Area, Pincode, Status, Voltage, Active Load MW, and Load Ratio.
 */
export default function TopographicalGridMap({
  gridNodes = [],
  selectedSubstationId,
  onSelectSubstation,
  onStageDR,
  onInspect3D
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'ELEVATED' | 'NORMAL'

  // Filtered nodes
  const visibleNodes = useMemo(() => {
    if (filterStatus === 'ALL') return gridNodes;
    return gridNodes.filter(n => n.status === filterStatus);
  }, [gridNodes, filterStatus]);

  // Find currently selected node
  const selectedNode = useMemo(() => {
    return gridNodes.find(n => n.id === selectedSubstationId) || gridNodes[0];
  }, [gridNodes, selectedSubstationId]);

  // Counts for quick filter pills
  const counts = useMemo(() => {
    return {
      all: gridNodes.length,
      normal: gridNodes.filter(n => n.status === 'NORMAL').length,
      elevated: gridNodes.filter(n => n.status === 'ELEVATED').length,
      critical: gridNodes.filter(n => n.status === 'CRITICAL').length,
    };
  }, [gridNodes]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Khardaha / North Kolkata region
    const map = L.map(mapContainerRef.current, {
      center: [22.68, 88.38],
      zoom: 11,
      minZoom: 9,
      maxZoom: 17,
      zoomControl: true,
      attributionControl: false
    });

    // CartoDB Positron: crisp, minimal, high-contrast light enterprise tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Subtle attribution in bottom corner
    L.control.attribution({ position: 'bottomright', prefix: '© OpenStreetMap, © CARTO' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when visibleNodes or selectedSubstationId changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    visibleNodes.forEach(node => {
      const isSelected = node.id === selectedSubstationId;
      const isCritical = node.status === 'CRITICAL';
      const isElevated = node.status === 'ELEVATED';

      const pinColor = isCritical ? '#dc2626' : isElevated ? '#d97706' : '#059669';
      const statusBg = isCritical ? '#fef2f2' : isElevated ? '#fffbeb' : '#ecfdf5';
      const statusTextColor = isCritical ? '#991b1b' : isElevated ? '#92400e' : '#065f46';
      
      const pinSize = isSelected ? 26 : 18;
      const borderWidth = isSelected ? 3 : 2;
      const borderColor = isSelected ? '#2563eb' : '#ffffff';

      // Professional flat marker pin
      const icon = L.divIcon({
        className: 'custom-substation-pin',
        html: `
          <div style="
            width: ${pinSize}px;
            height: ${pinSize}px;
            border-radius: 50%;
            background-color: ${pinColor};
            border: ${borderWidth}px solid ${borderColor};
            box-shadow: 0 2px 4px rgba(0,0,0,0.18);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s ease;
          ">
            <div style="width: 5px; height: 5px; border-radius: 50%; background-color: #ffffff;"></div>
          </div>
        `,
        iconSize: [pinSize, pinSize],
        iconAnchor: [pinSize / 2, pinSize / 2]
      });

      const marker = L.marker([node.lat, node.lon], { icon }).addTo(map);

      // Clean corporate hover tooltip
      const activeMw = node.active_mw || (node.telemetry && node.telemetry.active_power_mw) || '—';
      const loadPct = node.load_pct || (node.telemetry && node.telemetry.load_percentage) || '—';
      const oilTemp = node.oil_temp_c || (node.telemetry && node.telemetry.transformer_oil_temp_c) || '—';

      const tooltipContent = `
        <div style="padding: 10px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; gap: 8px;">
            <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${node.name}</span>
            <span style="
              font-size: 10px;
              font-weight: 700;
              padding: 2px 6px;
              border-radius: 4px;
              text-transform: uppercase;
              background-color: ${statusBg};
              color: ${statusTextColor};
              border: 1px solid rgba(0,0,0,0.06);
            ">${node.status}</span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            ${node.area} • Pincode ${node.pincode} • ${node.operator}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border-top: 1px solid #f1f5f9; padding-top: 8px; font-size: 11px;">
            <div>
              <span style="color: #64748b; display: block; font-size: 10px; text-transform: uppercase;">Voltage:</span>
              <strong style="color: #0f172a; font-weight: 600;">${node.voltage_kv} kV</strong>
            </div>
            <div>
              <span style="color: #64748b; display: block; font-size: 10px; text-transform: uppercase;">Active Load:</span>
              <strong style="color: #0f172a; font-weight: 600;">${activeMw} MW</strong>
            </div>
            <div>
              <span style="color: #64748b; display: block; font-size: 10px; text-transform: uppercase;">Load Ratio:</span>
              <strong style="color: ${statusTextColor}; font-weight: 700;">${loadPct}%</strong>
            </div>
            <div>
              <span style="color: #64748b; display: block; font-size: 10px; text-transform: uppercase;">Oil Temp:</span>
              <strong style="color: #0f172a; font-weight: 600;">${oilTemp}°C</strong>
            </div>
          </div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -10],
        opacity: 1,
        className: 'leaflet-tooltip-enterprise'
      });

      marker.on('click', () => {
        onSelectSubstation(node.id);
      });

      markersRef.current[node.id] = marker;
    });
  }, [visibleNodes, selectedSubstationId, onSelectSubstation]);

  // Pan to selected node when selection changes externally
  const handleRecenter = (lat, lon) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 13, { duration: 0.8 });
    }
  };

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([22.68, 88.38], 11, { duration: 0.8 });
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
      {/* Map Header Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Geospatial Grid Infrastructure Map
            </h3>
            <span className="text-xs text-slate-500">
              Khardaha, Barrackpore, Salt Lake & Kolkata SCADA Nodes • Interactive 2D View
            </span>
          </div>
        </div>

        {/* Status Filters & Reset Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-sm text-xs">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterStatus === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setFilterStatus('NORMAL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                filterStatus === 'NORMAL'
                  ? 'bg-emerald-700 text-white'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Normal ({counts.normal})
            </button>
            <button
              onClick={() => setFilterStatus('ELEVATED')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                filterStatus === 'ELEVATED'
                  ? 'bg-amber-700 text-white'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Elevated ({counts.elevated})
            </button>
            <button
              onClick={() => setFilterStatus('CRITICAL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                filterStatus === 'CRITICAL'
                  ? 'bg-rose-700 text-white'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Critical ({counts.critical})
            </button>
          </div>

          <button
            onClick={handleResetView}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
            title="Reset Map Bounds"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* Map Viewport */}
      <div className="relative w-full h-[520px]">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Selected Substation Quick Info Overlay Card */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 z-[500] max-w-sm bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3.5 shadow-dropdown pointer-events-auto">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  Active Selection
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {selectedNode.name}
                </h4>
                <p className="text-xs text-slate-500">
                  {selectedNode.area} • Pincode {selectedNode.pincode}
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                selectedNode.status === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                selectedNode.status === 'ELEVATED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {selectedNode.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 block">Voltage</span>
                <span className="font-bold text-slate-900">{selectedNode.voltage_kv} kV</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 block">Capacity</span>
                <span className="font-bold text-slate-900">{selectedNode.capacity_mva} MVA</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 block">Load Ratio</span>
                <span className={`font-bold ${
                  selectedNode.status === 'CRITICAL' ? 'text-rose-600' :
                  selectedNode.status === 'ELEVATED' ? 'text-amber-600' :
                  'text-emerald-600'
                }`}>
                  {selectedNode.load_pct || (selectedNode.telemetry && selectedNode.telemetry.load_percentage)}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2.5">
              {onInspect3D && (
                <button
                  onClick={() => onInspect3D(selectedNode)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700 shadow-sm"
                >
                  <Box className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Inspect 3D Twin</span>
                </button>
              )}
              {onStageDR && (
                <button
                  onClick={() => onStageDR(selectedNode)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Stage DR</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Legend Overlay Card */}
        <div className="absolute top-4 right-4 z-[500] bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg p-2.5 shadow-dropdown text-xs pointer-events-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Status Legend
          </span>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-100" />
              <span>Normal (&lt;70% load)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 ring-2 ring-amber-100" />
              <span>Elevated (70–85%)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-rose-100" />
              <span>Critical (&gt;85% load)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
