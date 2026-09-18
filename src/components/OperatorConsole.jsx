import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Radio, 
  MapPin, 
  Sliders, 
  Send, 
  Layers, 
  BarChart3, 
  Search, 
  Filter,
  CheckCircle2,
  TrendingUp,
  Cpu,
  ShieldAlert,
  Clock,
  Box
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell
} from 'recharts';
import { CURATED_SUBSTATIONS } from '../data/substationsData';
import { generateSubstationTelemetry, predictRisk, generatePosocoDataset } from '../services/gridEngine';
import TopographicalGridMap from './TopographicalGridMap';
import Substation3DScene from './3d/Substation3DScene';

export default function OperatorConsole({ envData }) {
  const [activeTab, setActiveTab] = useState('dr');
  const [selectedSubstationId, setSelectedSubstationId] = useState('WB_SS_01');
  const [statusFilter, setStatusFilter] = useState(['CRITICAL', 'ELEVATED', 'NORMAL']);
  const [searchQuery, setSearchQuery] = useState('');
  
  // DR Dispatch state
  const [drSubId, setDrSubId] = useState('WB_SS_01');
  const [discountRate, setDiscountRate] = useState(7.5);
  const [drDuration, setDrDuration] = useState(2);
  const [dispatchLogs, setDispatchLogs] = useState([]);
  const [lastDispatch, setLastDispatch] = useState(null);

  // Compute telemetry and risks across all 50 substations
  const gridNodes = useMemo(() => {
    return CURATED_SUBSTATIONS.map(sub => {
      const telemetry = generateSubstationTelemetry(sub, envData);
      const prediction = predictRisk(telemetry, envData);
      return {
        ...sub,
        telemetry,
        prediction,
        load_pct: telemetry.load_percentage,
        active_mw: telemetry.active_power_mw,
        oil_temp_c: telemetry.transformer_oil_temp_c,
        temp_delta_c: telemetry.temperature_delta_c,
        risk_pct: prediction.risk_percentage,
        status: prediction.status
      };
    });
  }, [envData]);

  // Overall SCADA KPIs
  const totalMonitoredMw = useMemo(() => {
    return Math.round(gridNodes.reduce((acc, curr) => acc + curr.active_mw, 0) * 10) / 10;
  }, [gridNodes]);

  const criticalCount = gridNodes.filter(n => n.status === 'CRITICAL').length;
  const elevatedCount = gridNodes.filter(n => n.status === 'ELEVATED').length;

  const selectedNode = gridNodes.find(n => n.id === selectedSubstationId) || gridNodes[0];
  const drNode = gridNodes.find(n => n.id === drSubId) || gridNodes[0];

  // 72-hour POSOCO Dataset
  const posocoData = useMemo(() => generatePosocoDataset(), []);

  // Filtered nodes for SCADA table
  const filteredNodes = useMemo(() => {
    return gridNodes.filter(node => {
      const matchesStatus = statusFilter.includes(node.status);
      const matchesSearch = searchQuery === '' || 
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.pincode.includes(searchQuery);
      return matchesStatus && matchesSearch;
    });
  }, [gridNodes, statusFilter, searchQuery]);

  // Trigger DR action
  const handleTriggerDR = () => {
    const requiredMw = Math.max(1.5, Math.round(((drNode.load_pct - 74) / 100) * drNode.capacity_mva * 10) / 10);
    const consumersNotified = Math.round(requiredMw * 420);
    const optInRate = 42;
    const participants = Math.round(consumersNotified * (optInRate / 100));
    const achievedMw = Math.round(participants * 0.0022 * 10) / 10;
    const averted = achievedMw >= (requiredMw * 0.75);

    const dispatchId = `DR-WB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newDispatch = {
      id: dispatchId,
      substation: drNode.name,
      pincode: drNode.pincode,
      requiredMw,
      achievedMw,
      consumersNotified,
      participants,
      acceptanceRate: optInRate,
      averted,
      rate: discountRate,
      duration: drDuration,
      timestamp: new Date().toLocaleTimeString()
    };

    setLastDispatch(newDispatch);
    setDispatchLogs(prev => [newDispatch, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* SCADA Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SCADA Central Load Despatch Console
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            West Bengal Smart Grid Digital Twin
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            50 Monitored Substations • Khardaha, Barrackpore, Kolkata & Howrah • 4-Hour Advance Thermal Warning
          </p>
        </div>
      </div>

      {/* Top 5 SCADA KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* KPI 1: Monitored Load */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Total Monitored Load
          </span>
          <div className="text-2xl font-extrabold font-mono text-blue-600">
            {totalMonitoredMw} <span className="text-xs font-sans font-medium text-slate-400">MW</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            50 Substations Active
          </span>
        </div>

        {/* KPI 2: Overload Risk */}
        <div className="p-4 rounded-xl bg-white border border-red-200 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block mb-1">
            Critical Overload (4h)
          </span>
          <div className="text-2xl font-extrabold font-mono text-red-600">
            {criticalCount} <span className="text-xs font-sans font-medium text-slate-400">Nodes</span>
          </div>
          <span className="text-[11px] text-red-700 font-medium mt-1 block">
            Pre-Emptive DR Target
          </span>
        </div>

        {/* KPI 3: Elevated Stress */}
        <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
            Elevated Stress Nodes
          </span>
          <div className="text-2xl font-extrabold font-mono text-amber-600">
            {elevatedCount} <span className="text-xs font-sans font-medium text-slate-400">Nodes</span>
          </div>
          <span className="text-[11px] text-amber-700 font-medium mt-1 block">
            70–85% Continuous Load
          </span>
        </div>

        {/* KPI 4: Frequency */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Grid Frequency
          </span>
          <div className="text-2xl font-extrabold font-mono text-emerald-600">
            49.98 <span className="text-xs font-sans font-medium text-slate-400">Hz</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
            ERLDC Synchronized
          </span>
        </div>

        {/* KPI 5: MQTT Status */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            MQTT Broker Status
          </span>
          <div className="text-xl font-extrabold font-mono text-emerald-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ONLINE
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            50 pkts / 5 sec
          </span>
        </div>
      </div>

      {/* Geospatial SCADA Topographical Twin Map with Flat 2D CartoDB Tiles & Interactive Pins */}
      <TopographicalGridMap
        gridNodes={gridNodes}
        selectedSubstationId={selectedSubstationId}
        onSelectSubstation={setSelectedSubstationId}
        onStageDR={(node) => {
          setDrSubId(node.id);
          setActiveTab('dr');
        }}
        onInspect3D={(node) => {
          setSelectedSubstationId(node.id);
          setActiveTab('3d-twin');
        }}
      />

      {/* Operator Console Tabs */}
      <div className="p-5 md:p-6 rounded-xl bg-white border border-slate-200 shadow-card">
        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dr')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'dr'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Pre-Emptive Demand Response Console
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'table'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            Live SCADA Telemetry Stream (50 SS)
          </button>

          <button
            onClick={() => setActiveTab('posoco')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'posoco'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            POSOCO State Load Calibration
          </button>

          <button
            onClick={() => setActiveTab('shap')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'shap'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Deep SHAP Diagnostic Waterfall
          </button>

          <button
            onClick={() => setActiveTab('3d-twin')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === '3d-twin'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-blue-600 bg-blue-50/70 hover:bg-blue-100 border border-blue-200/80'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>3D Substation Digital Twin</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono uppercase font-bold ${
              activeTab === '3d-twin' ? 'bg-white/20 text-white' : 'bg-blue-600 text-white'
            }`}>
              Interactive
            </span>
          </button>
        </div>

        {/* TAB 1: DEMAND RESPONSE CONSOLE */}
        {activeTab === 'dr' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                Automated Demand Response Dispatcher (Averting Forced Load Shedding)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Standard SCADA systems reactively initiate rolling blackouts when feeders overheat.
                BengalGrid AI calculates the exact MW deficit required to keep the transformer below 75% and autonomously dispatches micro-discount SMS offers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-xl bg-slate-50 border border-slate-200">
              {/* Select target high stress substation */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Select Target Substation:
                </label>
                <select
                  value={drSubId}
                  onChange={(e) => setDrSubId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                >
                  {gridNodes.map(node => (
                    <option key={node.id} value={node.id}>
                      {node.name} ({node.area}) • Load: {node.load_pct}% • Risk: {node.risk_pct}%
                    </option>
                  ))}
                </select>

                <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-2 text-xs shadow-sm">
                  <div className="flex justify-between text-slate-600 font-mono">
                    <span>Current Loading:</span>
                    <span className="font-bold text-blue-600">{drNode.load_pct}% ({drNode.active_mw} MW)</span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-mono">
                    <span>Thermal Risk:</span>
                    <span className={`font-bold ${drNode.risk_pct >= 75 ? 'text-red-600' : 'text-amber-600'}`}>
                      {drNode.risk_pct}% ({drNode.status})
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-mono">
                    <span>Required MW Deficit to 74%:</span>
                    <span className="font-bold text-emerald-600">
                      ~{Math.max(1.5, Math.round(((drNode.load_pct - 74) / 100) * drNode.capacity_mva * 10) / 10)} MW
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">Micro-Discount Incentive Rate:</span>
                    <span className="font-mono font-bold text-emerald-700">₹{discountRate.toFixed(2)} / kWh</span>
                  </div>
                  <input
                    type="range"
                    min="3.0"
                    max="12.0"
                    step="0.5"
                    value={discountRate}
                    onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">Demand Response Duration:</span>
                    <span className="font-mono font-bold text-blue-700">{drDuration} Hours</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="1"
                    value={drDuration}
                    onChange={(e) => setDrDuration(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <button
                  onClick={handleTriggerDR}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
                >
                  <Send className="w-4 h-4" />
                  Trigger Pre-Emptive Automated SMS Dispatch
                </button>
              </div>
            </div>

            {/* Live Dispatch Result Audit */}
            {lastDispatch && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-900">
                      Live Dispatch Audit Log: <span className="font-mono text-emerald-700">{lastDispatch.id}</span>
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-700">{lastDispatch.timestamp}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-white border border-emerald-100 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Notifications Dispatched</span>
                    <span className="text-base font-extrabold font-mono text-slate-900">{lastDispatch.consumersNotified} SMS</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-emerald-100 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Confirmed Opt-Ins</span>
                    <span className="text-base font-extrabold font-mono text-emerald-700">{lastDispatch.participants} users ({lastDispatch.acceptanceRate}%)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-emerald-100 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Load Shaved Achieved</span>
                    <span className="text-base font-extrabold font-mono text-blue-700">{lastDispatch.achievedMw} MW</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-emerald-100 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Blackout Status</span>
                    <span className="text-base font-extrabold font-mono text-emerald-700">AVERTED</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE SCADA TELEMETRY TABLE */}
        {activeTab === 'table' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search substation, area, pincode..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 shadow-sm"
                  />
                </div>
              </div>

              {/* Status checkboxes */}
              <div className="flex items-center gap-3 text-xs">
                {['CRITICAL', 'ELEVATED', 'NORMAL'].map(status => (
                  <label key={status} className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(status)}
                      onChange={() => {
                        setStatusFilter(prev =>
                          prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
                        );
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-0"
                    />
                    <span>{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">ID</th>
                    <th className="p-3 font-bold">Substation Name</th>
                    <th className="p-3 font-bold">Area</th>
                    <th className="p-3 font-bold">Pincode</th>
                    <th className="p-3 font-bold">Voltage</th>
                    <th className="p-3 font-bold">Capacity</th>
                    <th className="p-3 font-bold">Active MW</th>
                    <th className="p-3 font-bold">Load %</th>
                    <th className="p-3 font-bold">Oil Temp</th>
                    <th className="p-3 font-bold">AI 4h Risk</th>
                    <th className="p-3 font-bold">Status</th>
                    <th className="p-3 font-bold text-right">3D Twin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredNodes.map(node => (
                    <tr 
                      key={node.id}
                      onClick={() => setSelectedSubstationId(node.id)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedSubstationId === node.id ? 'bg-blue-50/70 font-medium' : ''
                      }`}
                    >
                      <td className="p-3 font-bold text-blue-600">{node.id}</td>
                      <td className="p-3 font-sans font-semibold text-slate-900">{node.name}</td>
                      <td className="p-3 font-sans text-slate-600">{node.area}</td>
                      <td className="p-3 text-slate-600">{node.pincode}</td>
                      <td className="p-3 text-slate-600">{node.voltage_kv} kV</td>
                      <td className="p-3 text-slate-600">{node.capacity_mva} MVA</td>
                      <td className="p-3 text-slate-900 font-bold">{node.active_mw} MW</td>
                      <td className="p-3">
                        <span className={node.load_pct >= 85 ? 'text-red-600 font-bold' : node.load_pct >= 75 ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
                          {node.load_pct}%
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">{node.oil_temp_c}°C</td>
                      <td className="p-3 font-bold">
                        <span className={node.risk_pct >= 75 ? 'text-red-600' : node.risk_pct >= 45 ? 'text-amber-600' : 'text-emerald-600'}>
                          {node.risk_pct}%
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          node.status === 'CRITICAL' ? 'bg-red-50 text-red-700 border border-red-200' :
                          node.status === 'ELEVATED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {node.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSubstationId(node.id);
                            setActiveTab('3d-twin');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-sans font-bold text-[10px] inline-flex items-center gap-1 border border-blue-200 transition-all shadow-sm group"
                          title="Inspect in 3D Substation Twin"
                        >
                          <Box className="w-3 h-3 text-blue-600 group-hover:text-white" />
                          <span>3D Twin</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: POSOCO LOAD CURVE CALIBRATION */}
        {activeTab === 'posoco' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                POSOCO / Grid-India State-Level Diurnal Demand Curve Calibration
              </h3>
              <p className="text-xs text-slate-500">
                Historical hourly load curves calibrated against West Bengal SLDC & ERLDC diurnal utility dispatch.
              </p>
            </div>

            {/* Total Demand vs CESC vs WBSEDCL */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                West Bengal State Total Demand vs Utility Split (MW)
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={posocoData.slice(-36)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['dataMin - 500', 'dataMax + 500']} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line type="monotone" dataKey="wb_total_demand_mw" name="WB State Total (MW)" stroke="#2563eb" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="wbsedcl_demand_mw" name="WBSEDCL Districts (MW)" stroke="#059669" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="cesc_demand_mw" name="CESC Kolkata Metro (MW)" stroke="#d97706" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Grid Frequency */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Live Grid Frequency Stability (Target: 50.00 Hz)
                </h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={posocoData.slice(-36)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 9 }} domain={[49.8, 50.2]} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Line type="monotone" dataKey="grid_frequency_hz" name="Frequency (Hz)" stroke="#7c3aed" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monsoon Heat Index */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Monsoon Heat Index (Apparent Temp) vs Ambient Temp (°C)
                </h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={posocoData.slice(-36)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Line type="monotone" dataKey="apparent_temp_c" name="Heat Index (°C)" stroke="#dc2626" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="ambient_temp_c" name="Ambient Temp (°C)" stroke="#d97706" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SHAP DIAGNOSTIC WATERFALL */}
        {activeTab === 'shap' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                XGBoost SHAP TreeExplainer Attribution Diagnostics
              </h3>
              <p className="text-xs text-slate-500">
                Quantifying non-grid (Heat Index, Air Quality closed-window AC surge) vs electrical (MW Load, Oil Temp) contributors.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-700 font-bold">
                  Target Inspection: <span className="text-blue-600">{selectedNode.name}</span>
                </span>
                <span className="text-xs font-mono text-slate-500">
                  Predicted Outage Risk: <strong className="text-red-600">{selectedNode.risk_pct}%</strong>
                </span>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    layout="vertical"
                    data={selectedNode.prediction.shap_waterfall}
                    margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="feature" type="category" stroke="#475569" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                      {selectedNode.prediction.shap_waterfall.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.impact > 0 ? '#dc2626' : '#059669'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: 3D SUBSTATION DIGITAL TWIN */}
        {activeTab === '3d-twin' && (
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                    Interactive Physical Twin Telemetry
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    IEEE Std C57.91 Dynamic Thermal Asset Health
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Substation Yard & Transformer 3D Digital Twin: {selectedNode.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect high-voltage switchyard physical assets, core transformer winding hotspots, radiator banks, and bushing corona glow in real time.
                </p>
              </div>

              {/* Quick Substation Selector */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Target Substation:
                </label>
                <select
                  value={selectedSubstationId}
                  onChange={(e) => setSelectedSubstationId(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                >
                  {gridNodes.map(node => (
                    <option key={node.id} value={node.id}>
                      {node.name} ({node.voltage_kv} kV) • {node.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3D Scene Viewport */}
            <Substation3DScene
              substation={selectedNode}
              telemetry={selectedNode.telemetry}
              status={selectedNode.status}
              height="540px"
            />

            {/* Engineering Asset Telemetry Specs Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-sans font-medium text-slate-500 block mb-0.5 uppercase">
                  Rated Step-Down
                </span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {selectedNode.voltage_kv} / 11 kV
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Three-Phase 50Hz • {selectedNode.capacity_mva} MVA
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-sans font-medium text-slate-500 block mb-0.5 uppercase">
                  Active Transformer Core
                </span>
                <span className="text-base font-bold text-blue-600 font-mono">
                  {selectedNode.active_mw} MW
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Load Ratio: {selectedNode.load_pct}%
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-sans font-medium text-slate-500 block mb-0.5 uppercase">
                  Top-Oil Temperature
                </span>
                <span className={`text-base font-bold font-mono ${
                  selectedNode.oil_temp_c >= 80 ? 'text-red-600' :
                  selectedNode.oil_temp_c >= 70 ? 'text-amber-600' :
                  'text-emerald-600'
                }`}>
                  {selectedNode.oil_temp_c}°C
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Rise: +{selectedNode.temp_delta_c}°C
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-sans font-medium text-slate-500 block mb-0.5 uppercase">
                  Thermal Hotspot Margin
                </span>
                <span className={`text-base font-bold font-mono ${
                  (85 - selectedNode.oil_temp_c) <= 10 ? 'text-red-600' :
                  (85 - selectedNode.oil_temp_c) <= 20 ? 'text-amber-600' :
                  'text-emerald-600'
                }`}>
                  {(85 - selectedNode.oil_temp_c).toFixed(1)}°C to Trip
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Limit: 85.0°C IEEE Standard
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
