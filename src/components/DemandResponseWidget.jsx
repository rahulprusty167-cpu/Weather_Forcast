import React, { useState } from 'react';
import { IndianRupee, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export default function DemandResponseWidget({ pincode, areaName }) {
  const [selectedTier, setSelectedTier] = useState('B');
  const [phone, setPhone] = useState('+91 98301 44520');
  const [enrolled, setEnrolled] = useState(false);
  const [smsData, setSmsData] = useState(null);

  const tiers = [
    {
      id: 'A',
      title: 'Tier A: Adjust Thermostat to 26°C',
      kwSaved: 1.2,
      rebate: 18.0,
      description: 'Saves ~1.2 kW • Estimated Bill Credit: ₹18.00'
    },
    {
      id: 'B',
      title: 'Tier B: Defer 1 AC Unit for 2 Hours',
      kwSaved: 2.0,
      rebate: 30.0,
      description: 'Saves ~2.0 kW • Estimated Bill Credit: ₹30.00'
    },
    {
      id: 'C',
      title: 'Tier C: Industrial / MSME Motor Deferral',
      kwSaved: 8.0,
      rebate: 120.0,
      description: 'Saves ~8.0 kW • Estimated Bill Credit: ₹120.00'
    }
  ];

  const handleOptIn = (e) => {
    e.preventDefault();
    const activeTier = tiers.find(t => t.id === selectedTier) || tiers[1];
    const billCredit = activeTier.kwSaved * 2 * 7.50; // 2 hours @ 7.50/kWh
    
    setSmsData({
      phone,
      kwSaved: activeTier.kwSaved,
      rebate: billCredit.toFixed(2),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setEnrolled(true);
  };

  return (
    <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <IndianRupee className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold tracking-tight text-slate-900">
              Voluntary Demand Response Relief
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase font-semibold">
            Utility Micro-Rebate
          </span>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          WBSEDCL & CESC Peak Management: Voluntarily defer high-draw cooling between 18:00–20:00 to earn bill credits.
        </p>

        {/* Tier selection */}
        <div className="space-y-2 mb-4">
          {tiers.map((tier) => (
            <label
              key={tier.id}
              className={`block p-3 rounded-lg border transition-colors cursor-pointer ${
                selectedTier === tier.id 
                  ? 'border-blue-500 bg-blue-50/40 shadow-sm' 
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="drTier"
                    value={tier.id}
                    checked={selectedTier === tier.id}
                    onChange={() => setSelectedTier(tier.id)}
                    className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-900">
                    {tier.title}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  ~{tier.kwSaved} kW
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 pl-5.5 leading-relaxed">
                {tier.description}
              </p>
            </label>
          ))}
        </div>

        {/* Opt-In Form */}
        <form onSubmit={handleOptIn} className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-slate-600 block mb-1">
              Registered Mobile for Automated SMS Credit:
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98301 44520"
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-[0.99]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Confirm Enrollment & Trigger SMS</span>
          </button>
        </form>
      </div>

      {/* Simulated Utility Dispatch Message */}
      {enrolled && smsData && (
        <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 pb-1.5 border-b border-slate-200 font-sans">
            <span className="flex items-center gap-1 font-bold text-slate-800">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              WBSEDCL-GRID Notification
            </span>
            <span>{smsData.time}</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-sans">
            Thank you. Your voluntary participation for Pincode {pincode} ({areaName}) is confirmed. Please maintain ~{smsData.kwSaved} kW curtailment between 18:00–20:00. A bill rebate credit of <strong className="text-emerald-700 font-semibold">₹{smsData.rebate}</strong> has been logged to your consumer ID.
          </p>
        </div>
      )}
    </div>
  );
}

