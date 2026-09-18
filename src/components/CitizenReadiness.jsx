import React, { useState } from 'react';
import { 
  BatteryCharging, 
  Droplets, 
  Snowflake, 
  CheckCircle2, 
  Clock, 
  ShieldCheck
} from 'lucide-react';

export default function CitizenReadiness({ pincode, areaName }) {
  const [completedActions, setCompletedActions] = useState({
    inverter: false,
    water: false,
    precool: false
  });

  const toggleAction = (key) => {
    setCompletedActions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const completedCount = Object.values(completedActions).filter(Boolean).length;

  return (
    <div className="mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-base md:text-lg font-bold tracking-tight text-slate-900">
              Citizen Outage Preparedness Guidance
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-medium">
              Pincode {pincode}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Proactive localized advisory to minimize household impact during regional peak thermal hours.
          </p>
        </div>

        {/* Readiness Completion Tracker */}
        <div className="flex items-center gap-2.5 bg-white border border-slate-200 px-3.5 py-1.5 rounded-lg shadow-sm self-start sm:self-auto">
          <span className="text-xs text-slate-600 font-medium">Household Score:</span>
          <span className="text-xs font-mono font-bold text-blue-700">
            {completedCount}/3 Ready
          </span>
          <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 rounded-full"
              style={{ width: `${(completedCount / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Actionable Readiness Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Widget 1: Inverter & Lamp Charging */}
        <div 
          onClick={() => toggleAction('inverter')}
          className={`cursor-pointer p-5 rounded-xl border transition-colors bg-white shadow-card ${
            completedActions.inverter 
              ? 'border-emerald-500 bg-emerald-50/20' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className={`p-2 rounded-lg ${
              completedActions.inverter 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-blue-50 text-blue-600 border border-blue-100'
            }`}>
              <BatteryCharging className="w-5 h-5" />
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                completedActions.inverter
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {completedActions.inverter ? 'Ready' : 'Pre-Charge'}
              </span>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                completedActions.inverter 
                  ? 'bg-emerald-600 border-emerald-600 text-white' 
                  : 'border-slate-300 bg-white text-transparent'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
          </div>

          <h4 className="text-sm font-bold text-slate-900 mb-1">
            Inverter & Backup Batteries
          </h4>
          
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            Confirm domestic inverters and portable batteries maintain ≥80% charge prior to the 18:00–21:00 evening peak window.
          </p>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Recommended Window: 14:00–17:30</span>
          </div>
        </div>

        {/* Widget 2: Overhead Water Tank Pumping */}
        <div 
          onClick={() => toggleAction('water')}
          className={`cursor-pointer p-5 rounded-xl border transition-colors bg-white shadow-card ${
            completedActions.water 
              ? 'border-emerald-500 bg-emerald-50/20' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className={`p-2 rounded-lg ${
              completedActions.water 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-blue-50 text-blue-600 border border-blue-100'
            }`}>
              <Droplets className="w-5 h-5" />
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                completedActions.water
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {completedActions.water ? 'Ready' : 'Run Early'}
              </span>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                completedActions.water 
                  ? 'bg-emerald-600 border-emerald-600 text-white' 
                  : 'border-slate-300 bg-white text-transparent'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
          </div>

          <h4 className="text-sm font-bold text-slate-900 mb-1">
            Overhead Tank Pumping
          </h4>
          
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            Operate heavy domestic water pump motors before 16:30. Staggering pump loads prevents local distribution voltage drop.
          </p>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Target Completion: 16:30 hrs</span>
          </div>
        </div>

        {/* Widget 3: Pre-Cooling Living Rooms */}
        <div 
          onClick={() => toggleAction('precool')}
          className={`cursor-pointer p-5 rounded-xl border transition-colors bg-white shadow-card ${
            completedActions.precool 
              ? 'border-emerald-500 bg-emerald-50/20' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className={`p-2 rounded-lg ${
              completedActions.precool 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-blue-50 text-blue-600 border border-blue-100'
            }`}>
              <Snowflake className="w-5 h-5" />
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                completedActions.precool
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {completedActions.precool ? 'Ready' : '23°C Pre-Cool'}
              </span>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                completedActions.precool 
                  ? 'bg-emerald-600 border-emerald-600 text-white' 
                  : 'border-slate-300 bg-white text-transparent'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
          </div>

          <h4 className="text-sm font-bold text-slate-900 mb-1">
            Pre-Cool Living Spaces
          </h4>
          
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            Pre-cool rooms to 23°C by 16:00, then adjust thermostat to 26°C from 18:00–20:00 to sustain thermal comfort with ~35% lower draw.
          </p>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Thermal Efficiency Window: 16:00–20:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}

