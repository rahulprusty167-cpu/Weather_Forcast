"""
AI-Driven Smart Grid Digital Twin for West Bengal
Focusing on localized power distribution around Khardaha & Kolkata.
Dual-View Web Dashboard: Citizen View (Outage Readiness) & Operator View (SCADA & Pre-Emptive DR).
"""

import os
import sys
import time
import json
import datetime
import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pydeck as pdk

# Ensure project root is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.geo_substations import CURATED_SUBSTATIONS, get_substations_df, get_substation_by_pincode
from src.weather_aqi import get_live_weather_and_aqi, compute_ac_stress_factor
from src.posoco_loader import load_posoco_wb_dataset
from src.mqtt_streamer import get_streamer_instance
from src.model_trainer import get_predictor_instance
from src.demand_response import get_dr_engine

# --- Page Configuration ---
st.set_page_config(
    page_title="BengalGrid AI Twin | Khardaha & Kolkata",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- Custom Styling & Design System ---
CUSTOM_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

html, body, [class*="css"] {
    font-family: 'Outfit', sans-serif;
}

/* Background gradient */
.stApp {
    background: radial-gradient(circle at 10% 20%, rgba(13, 23, 42, 0.98) 0%, rgba(6, 11, 25, 1) 90%);
    color: #f1f5f9;
}

/* Glassmorphic Metric Cards */
.metric-card {
    background: rgba(18, 28, 51, 0.7);
    border: 1px solid rgba(56, 189, 248, 0.15);
    border-radius: 14px;
    padding: 16px 20px;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    transition: transform 0.2s ease, border-color 0.2s ease;
}
.metric-card:hover {
    transform: translateY(-2px);
    border-color: rgba(56, 189, 248, 0.35);
}

.metric-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
}
.metric-val {
    font-size: 1.85rem;
    font-weight: 700;
    color: #f8fafc;
    line-height: 1.2;
}
.metric-delta {
    font-size: 0.82rem;
    font-weight: 500;
    margin-top: 4px;
}
.delta-good { color: #10b981; }
.delta-warn { color: #f59e0b; }
.delta-crit { color: #ef4444; }
.delta-cyan { color: #06b6d4; }

/* Safe Window Glowing Banner */
.safe-banner-safe {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.3) 100%);
    border: 1.5px solid #10b981;
    border-radius: 16px;
    padding: 24px 28px;
    box-shadow: 0 0 25px rgba(16, 185, 129, 0.2);
}
.safe-banner-warn {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(120, 53, 15, 0.3) 100%);
    border: 1.5px solid #f59e0b;
    border-radius: 16px;
    padding: 24px 28px;
    box-shadow: 0 0 25px rgba(245, 158, 11, 0.25);
}
.safe-banner-crit {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(127, 29, 29, 0.35) 100%);
    border: 1.5px solid #ef4444;
    border-radius: 16px;
    padding: 24px 28px;
    box-shadow: 0 0 30px rgba(239, 68, 68, 0.35);
}

/* SHAP Attribution Card */
.shap-card {
    background: rgba(15, 23, 42, 0.65);
    border-left: 4px solid #06b6d4;
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 12px;
    font-size: 0.95rem;
    color: #e2e8f0;
}

/* SMS Mock Box */
.sms-phone-frame {
    background: #0b1329;
    border: 1.5px solid #334155;
    border-radius: 14px;
    padding: 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.88rem;
    color: #a5f3fc;
    box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);
}

/* Header Badge */
.header-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: rgba(6, 182, 212, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
}

/* Streamlit Native Tweaks */
div[data-testid="stSidebarContent"] {
    background: #090e1d;
    border-right: 1px solid rgba(51, 65, 85, 0.4);
}
</style>
"""
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)


# --- Core Service Singletons ---
@st.cache_resource
def init_services():
    streamer = get_streamer_instance()
    predictor = get_predictor_instance()
    dr_engine = get_dr_engine()
    return streamer, predictor, dr_engine

streamer, predictor, dr_engine = init_services()

# --- Sidebar: Control & Environment Telemetry ---
with st.sidebar:
    st.markdown('<span class="header-badge">Digital Twin Control Room</span>', unsafe_allow_html=True)
    st.title("⚡ BengalGrid AI")
    st.caption("Predictive Digital Twin • Khardaha & Kolkata")

    # View Mode Switcher
    view_mode = st.radio(
        "Select Portal View:",
        ["👥 Citizen Outage Readiness", "⚡ SCADA Operator Digital Twin"],
        index=0
    )

    st.markdown("---")
    st.subheader("🌐 Live Environmental Feeds")

    # Environmental Fetch (Open-Meteo API)
    env_data = get_live_weather_and_aqi(lat=22.7196, lon=88.3803)

    c1, c2 = st.columns(2)
    with c1:
        st.metric("Ambient Temp", f"{env_data['temperature_c']}°C")
        st.metric("Heat Index", f"{env_data['apparent_temperature_c']}°C")
    with c2:
        st.metric("Relative Hum.", f"{env_data['relative_humidity_pct']}%")
        st.metric("US AQI (PM2.5)", f"{env_data['aqi_us']}")

    st.caption(f"Status: **{env_data['aqi_category']}** | Live: `{env_data['is_live']}`")
    st.info(f"💡 **AC Stress Factor: {env_data['ac_load_stress_factor']}x**\n(Correlated heat index & closed-window pollution surge)")

    st.markdown("---")
    # Simulation speed & live refresh
    st.caption("Live MQTT Telemetry Streamer: 50 Substations @ 5s payload interval.")
    if st.button("🔄 Refresh Live Telemetry Now"):
        st.rerun()


# ==============================================================================
# VIEW 1: CITIZEN OUTAGE READINESS PORTAL
# ==============================================================================
if view_mode == "👥 Citizen Outage Readiness":
    st.markdown("""
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div>
                <span class="header-badge">Citizen Transparency Portal</span>
                <h1 style="margin:4px 0 0 0; font-size:2.2rem; font-weight:800;">Are You at Risk of a Power Cut?</h1>
                <p style="color:#94a3b8; margin-top:2px;">AI-driven thermal stress forecasting for Khardaha, Barrackpore, & Greater Kolkata</p>
            </div>
        </div>
    """, unsafe_allow_html=True)

    # Search Bar with Pincode Selection
    col_search, col_chips = st.columns([1.6, 2.4])
    with col_search:
        pincode_options = [
            "700117 - Khardaha (North 24 Parganas)",
            "700118 - Rahara / Titagarh",
            "700120 - Barrackpore Cantonment",
            "700110 - Sodepur Station Road",
            "700056 - Belgharia / Kamarhati",
            "700091 - Salt Lake Sector V (Tech Hub)",
            "700001 - BBD Bagh / Kolkata Financial District",
            "700019 - Ballygunge / South Kolkata",
            "700053 - New Alipore",
            "711101 - Howrah Central"
        ]
        selected_pincode_str = st.selectbox("🔍 Enter or Select your 6-Digit West Bengal Pincode:", pincode_options, index=0)
        pincode = selected_pincode_str.split(" - ")[0].strip()

    with col_chips:
        st.markdown("<p style='font-size:0.8rem; color:#94a3b8; margin-bottom:6px;'>Quick Select Localities:</p>", unsafe_allow_html=True)
        q1, q2, q3, q4 = st.columns(4)
        if q1.button("📍 Khardaha"):
            pincode = "700117"
        if q2.button("📍 Rahara"):
            pincode = "700118"
        if q3.button("📍 Salt Lake"):
            pincode = "700091"
        if q4.button("📍 Central Kol"):
            pincode = "700001"

    # Fetch Substation Serving this Pincode
    substations = get_substation_by_pincode(pincode)
    active_ss = substations[0]
    ss_id = active_ss["id"]

    # Fetch live telemetry from MQTT cache
    all_telemetry = streamer.get_latest_telemetry()
    ss_telemetry = all_telemetry.get(ss_id, streamer.generate_substation_payload(active_ss, datetime.datetime.now()))

    # Run XGBoost 4-Hour Prediction & SHAP Explainability
    prediction = predictor.predict_risk(ss_telemetry, env_data)
    risk_pct = prediction["risk_percentage"]
    safe_hours = prediction["safe_window_hours"]
    status = prediction["status"]

    st.markdown("<div style='height: 12px;'></div>", unsafe_allow_html=True)

    # --- THE SAFE WINDOW BANNER ---
    now_time = datetime.datetime.now()
    safe_until = (now_time + datetime.timedelta(hours=safe_hours)).strftime("%I:%M %p")

    if risk_pct < 45:
        banner_class = "safe-banner-safe"
        banner_color = "#10b981"
        headline = "🛡️ Grid Stable: No Power Outage Expected"
        subtitle = f"Your local feeder ({active_ss['name']}) is operating within safe thermal parameters."
    elif risk_pct < 75:
        banner_class = "safe-banner-warn"
        banner_color = "#f59e0b"
        headline = "⚠️ Elevated Grid Stress: Minor Outage Risk"
        subtitle = f"High cooling demand detected in {active_ss['area']}. Transformer operating near thermal threshold."
    else:
        banner_class = "safe-banner-crit"
        banner_color = "#ef4444"
        headline = "🚨 Critical Thermal Overload Imminent: High Outage Risk"
        subtitle = f"Severe thermal accumulation detected at {active_ss['name']}. Automated tripping probable within 1-2 hours."

    st.markdown(f"""
        <div class="{banner_class}">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
                <div>
                    <h2 style="margin:0 0 6px 0; font-size:1.8rem; font-weight:800; color:{banner_color};">{headline}</h2>
                    <p style="margin:0; font-size:1.05rem; color:#cbd5e1;">{subtitle}</p>
                </div>
                <div style="text-align:right; margin-top:10px;">
                    <div style="font-size:0.85rem; color:#94a3b8; text-transform:uppercase; font-weight:600;">Calculated Safe Window</div>
                    <div style="font-size:2.2rem; font-weight:900; color:#f8fafc;">~{safe_hours} Hours</div>
                    <div style="font-size:0.88rem; color:{banner_color}; font-weight:600;">Guaranteed Stable Until: {safe_until}</div>
                </div>
            </div>
        </div>
    """, unsafe_allow_html=True)

    st.markdown("<div style='height: 20px;'></div>", unsafe_allow_html=True)

    # --- CITIZEN TELEMETRY METRICS ROW ---
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Substation Feeding Area</div>
                <div class="metric-val" style="font-size:1.3rem;">{active_ss['area']}</div>
                <div class="metric-delta delta-cyan">{active_ss['name']} ({active_ss['voltage_kv']}kV)</div>
            </div>
        """, unsafe_allow_html=True)
    with m2:
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Transformer Load Ratio</div>
                <div class="metric-val">{ss_telemetry['load_percentage']}%</div>
                <div class="metric-delta {'delta-good' if ss_telemetry['load_percentage'] < 75 else 'delta-warn' if ss_telemetry['load_percentage'] < 85 else 'delta-crit'}">
                    Capacity: {active_ss['capacity_mva']} MVA ({ss_telemetry['active_power_mw']} MW)
                </div>
            </div>
        """, unsafe_allow_html=True)
    with m3:
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Transformer Oil Temp</div>
                <div class="metric-val">{ss_telemetry['transformer_oil_temp_c']}°C</div>
                <div class="metric-delta {'delta-good' if ss_telemetry['transformer_oil_temp_c'] < 75 else 'delta-warn' if ss_telemetry['transformer_oil_temp_c'] < 82 else 'delta-crit'}">
                    Ambient Delta: +{ss_telemetry['temperature_delta_c']}°C
                </div>
            </div>
        """, unsafe_allow_html=True)
    with m4:
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">AI Outage Risk (4h)</div>
                <div class="metric-val">{risk_pct}%</div>
                <div class="metric-delta {'delta-good' if risk_pct < 45 else 'delta-warn' if risk_pct < 75 else 'delta-crit'}">
                    Status: {status}
                </div>
            </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height: 20px;'></div>", unsafe_allow_html=True)

    # --- PLAIN-LANGUAGE SHAP ROOT CAUSE ATTRIBUTION ---
    col_shap, col_dr = st.columns([1.5, 1.3])

    with col_shap:
        st.subheader("🔍 Why Is My Power at Risk? (Plain-Language AI Explainability)")
        st.caption("Powered by XGBoost + SHAP TreeExplainer decomposing non-grid vs electrical stressors")

        for idx, item in enumerate(prediction["plain_language_attributions"], 1):
            st.markdown(f"""
                <div class="shap-card">
                    <strong>Factor #{idx}:</strong> {item}
                </div>
            """, unsafe_allow_html=True)

        st.markdown("""
            <div style="background:rgba(30,41,59,0.5); border-radius:10px; padding:12px; margin-top:10px; font-size:0.85rem; color:#94a3b8;">
                <strong>How does AI calculate this?</strong> Standard SCADA alarms only sound <em>after</em> a transformer overheats.
                Our digital twin correlates local weather (43°C heat index) and severe air quality (which forces 92% of households to run continuous ACs with closed windows)
                to forecast thermal build-up <strong>4 hours ahead</strong>.
            </div>
        """, unsafe_allow_html=True)

    # --- CITIZEN VOLUNTARY DEMAND RESPONSE (MICRO-DISCOUNTS) ---
    with col_dr:
        st.subheader("💰 Earn Micro-Discounts on Your Electricity Bill")
        st.caption("Voluntarily shed load for 2 hours to help prevent community blackouts")

        st.markdown("""
            <div style="background:rgba(6, 182, 212, 0.08); border:1px solid rgba(6, 182, 212, 0.3); border-radius:12px; padding:16px; margin-bottom:14px;">
                <h4 style="margin:0 0 6px 0; color:#38bdf8;">WBSEDCL & CESC Pre-Emptive Demand Response</h4>
                <p style="font-size:0.9rem; color:#cbd5e1; margin:0;">
                    Instead of forced load shedding, we offer financial incentives to consumers who adjust their AC thermostats or turn off 1 heavy appliance.
                </p>
            </div>
        """, unsafe_allow_html=True)

        opt_in_tier = st.radio(
            "Select Your Voluntary Load Reduction:",
            [
                "Option A: Set AC to 26°C (Saves ~1.2 kW | Est. Bill Credit: ₹45)",
                "Option B: Switch off 1 AC for 2 Hours (Saves ~2.0 kW | Est. Bill Credit: ₹75)",
                "Option C: Industrial/MSME Motor Deferral (Saves ~8.0 kW | Est. Bill Credit: ₹300)"
            ],
            index=1
        )

        user_phone = st.text_input("Enter Mobile Number for SMS Confirmation:", value="+91 98301 44520")

        if st.button("📲 Opt-In & Receive Automated Discount SMS", type="primary", use_container_width=True):
            kw_saved = 2.0 if "Option B" in opt_in_tier else (1.2 if "Option A" in opt_in_tier else 8.0)
            rebate = kw_saved * 2 * 7.50
            st.success(f"✅ Success! Your meter is enrolled in the 2-Hour Demand Response Window for Pincode {pincode}.")

            st.markdown(f"""
                <div class="sms-phone-frame">
                    <strong>[INCOMING SMS FROM WBSEDCL-GRID]</strong><br>
                    "Thank you {user_phone}. Your participation in the Khardaha/Kolkata Smart Grid Relief Program is confirmed.
                    Please keep connected load reduced by ~{kw_saved} kW between 18:00 - 20:00.
                    A micro-discount credit of <strong>₹{rebate:.2f}</strong> has been logged to your consumer account."
                </div>
            """, unsafe_allow_html=True)

    # --- CITIZEN READINESS CHECKLIST ---
    st.markdown("---")
    st.subheader("📋 Citizen Readiness Recommendations for Pincode " + pincode)
    rc1, rc2, rc3 = st.columns(3)
    with rc1:
        st.info("🔋 **Inverter & Lamp Charging**\nEnsure emergency batteries, inverters, and phones are charged above 80% before the peak evening 18:00 window.")
    with rc2:
        st.info("💧 **Water Overhead Tank Pumping**\nRun domestic water pumps before 16:30 hrs to avoid peak transformer stress hours.")
    with rc3:
        st.info("❄️ **Pre-Cooling Living Rooms**\nCool living spaces to 23°C by 16:00, then raise thermostat to 26°C during the 18:00–20:00 peak to save power effortlessly.")


# ==============================================================================
# VIEW 2: SCADA OPERATOR DIGITAL TWIN CONSOLE
# ==============================================================================
else:
    st.markdown("""
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div>
                <span class="header-badge">SCADA Central Load Despatch Console</span>
                <h1 style="margin:4px 0 0 0; font-size:2.2rem; font-weight:800;">West Bengal Smart Grid Digital Twin</h1>
                <p style="color:#94a3b8; margin-top:2px;">50 Substations • Live MQTT Feeds • 4-Hour Advance Thermal Warning • Automated Demand Response</p>
            </div>
        </div>
    """, unsafe_allow_html=True)

    # Fetch live telemetry for all 50 substations
    all_telemetry = streamer.get_latest_telemetry()
    substations_df = get_substations_df()

    # Calculate live risk scores across all 50 substations
    records = []
    overloaded_count = 0
    warning_count = 0
    total_mw_load = 0.0

    for ss in CURATED_SUBSTATIONS:
        ss_id = ss["id"]
        t = all_telemetry.get(ss_id, streamer.generate_substation_payload(ss, datetime.datetime.now()))
        pred = predictor.predict_risk(t, env_data)
        risk = pred["risk_percentage"]

        if risk >= 75 or t["load_percentage"] >= 85:
            overloaded_count += 1
            status_tag = "CRITICAL"
        elif risk >= 45 or t["load_percentage"] >= 75:
            warning_count += 1
            status_tag = "ELEVATED"
        else:
            status_tag = "NORMAL"

        total_mw_load += t["active_power_mw"]

        records.append({
            "id": ss["id"],
            "name": ss["name"],
            "area": ss["area"],
            "pincode": ss["pincode"],
            "lat": ss["lat"],
            "lon": ss["lon"],
            "voltage_kv": ss["voltage_kv"],
            "capacity_mva": ss["capacity_mva"],
            "active_mw": t["active_power_mw"],
            "load_pct": t["load_percentage"],
            "oil_temp_c": t["transformer_oil_temp_c"],
            "temp_delta_c": t["temperature_delta_c"],
            "power_factor": t["power_factor"],
            "risk_pct": risk,
            "status": status_tag,
            "safe_window_h": pred["safe_window_hours"],
            "shap_dict": pred["shap_values"]
        })

    grid_df = pd.DataFrame(records)

    # Top SCADA KPIs
    k1, k2, k3, k4, k5 = st.columns(5)
    with k1:
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Total Monitored Load</div>
                <div class="metric-val">{total_mw_load:.1f} MW</div>
                <div class="metric-delta delta-cyan">50 Substations Active</div>
            </div>
        """, unsafe_allow_html=True)
    with k2:
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Thermal Overload Risk (4h)</div>
                <div class="metric-val" style="color:#ef4444;">{overloaded_count} SS</div>
                <div class="metric-delta delta-crit">Action Required Pre-Trip</div>
            </div>
        """, unsafe_allow_html=True)
    with k3:
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Elevated Stress Nodes</div>
                <div class="metric-val" style="color:#f59e0b;">{warning_count} SS</div>
                <div class="metric-delta delta-warn">70-85% Loading</div>
            </div>
        """, unsafe_allow_html=True)
    with k4:
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Live Grid Frequency</div>
                <div class="metric-val">49.98 Hz</div>
                <div class="metric-delta delta-good">Synchronous ERLDC</div>
            </div>
        """, unsafe_allow_html=True)
    with k5:
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">MQTT Stream Status</div>
                <div class="metric-val" style="font-size:1.3rem; color:#10b981;">CONNECTED</div>
                <div class="metric-delta delta-good">50 pkts / 5 sec</div>
            </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height: 16px;'></div>", unsafe_allow_html=True)

    # --- GEOSPATIAL SCADA DIGITAL TWIN MAP ---
    st.subheader("🗺️ Live SCADA Geospatial Twin Map (Khardaha, Barrackpore, Kolkata & Howrah)")

    # Color coding for map pins: Red = Critical, Amber = Elevated, Green = Normal
    def get_color(row):
        if row["status"] == "CRITICAL":
            return [239, 68, 68, 220]
        elif row["status"] == "ELEVATED":
            return [245, 158, 11, 220]
        return [16, 185, 129, 200]

    grid_df["color"] = grid_df.apply(get_color, axis=1)
    grid_df["radius"] = grid_df["capacity_mva"] * 25

    # PyDeck 3D Map View
    view_state = pdk.ViewState(
        latitude=22.65,
        longitude=88.38,
        zoom=10.5,
        pitch=42,
        bearing=15
    )

    layer = pdk.Layer(
        "ScatterplotLayer",
        data=grid_df,
        get_position=["lon", "lat"],
        get_color="color",
        get_radius="radius",
        pickable=True,
        auto_highlight=True,
        radius_min_pixels=6,
        radius_max_pixels=25
    )

    tooltip = {
        "html": """
            <div style="font-family:sans-serif; font-size:12px; background:#0f172a; color:#fff; padding:8px; border-radius:6px; border:1px solid #38bdf8;">
                <strong style="font-size:13px; color:#38bdf8;">{name}</strong><br/>
                <b>Area:</b> {area} (Pincode: {pincode})<br/>
                <b>Voltage:</b> {voltage_kv} kV | <b>Capacity:</b> {capacity_mva} MVA<br/>
                <b>Active Load:</b> {active_mw} MW ({load_pct}%)<br/>
                <b>Oil Temp:</b> {oil_temp_c}°C (Delta: +{temp_delta_c}°C)<br/>
                <b>AI 4h Overload Risk:</b> <span style="color:#ef4444; font-weight:bold;">{risk_pct}%</span> ({status})<br/>
                <b>Safe Window:</b> {safe_window_h} hours
            </div>
        """,
        "style": {"color": "white"}
    }

    deck = pdk.Deck(
        layers=[layer],
        initial_view_state=view_state,
        tooltip=tooltip,
        map_style="mapbox://styles/mapbox/dark-v10"
    )

    st.pydeck_chart(deck, use_container_width=True)

    # --- TABS FOR OPERATOR ACTIONS ---
    tab_dr, tab_table, tab_posoco, tab_shap = st.tabs([
        "⚡ Pre-Emptive Demand Response Console",
        "📊 Live SCADA Telemetry Stream (50 Substations)",
        "📈 POSOCO State Load Calibration",
        "🔬 Deep SHAP Diagnostic Waterfall"
    ])

    # 1. DEMAND RESPONSE CONSOLE
    with tab_dr:
        st.subheader("Automated Demand Response Dispatcher (Averting Forced Load Shedding)")
        st.markdown("""
            Standard SCADA systems reactively initiate rolling blackouts when feeders overheat.
            The **BengalGrid AI Pre-Emptive Demand Response Engine** calculates the exact MW deficit required to keep the transformer below 75%
            and autonomously dispatches micro-discount SMS offers to high-consumption users.
        """)

        # Identify candidate substations needing DR
        critical_ss = grid_df[grid_df["risk_pct"] >= 65].sort_values(by="risk_pct", ascending=False)

        c_select, c_action = st.columns([1.5, 1])
        with c_select:
            if not critical_ss.empty:
                selected_candidate_name = st.selectbox(
                    "Select High-Stress Substation for Automated DR Dispatch:",
                    critical_ss["name"].tolist()
                )
                cand_row = critical_ss[critical_ss["name"] == selected_candidate_name].iloc[0]
            else:
                st.success("All 50 substations are currently within safe thermal margins!")
                selected_candidate_name = grid_df.iloc[0]["name"]
                cand_row = grid_df.iloc[0]

            sub_info = {
                "substation_id": cand_row["id"],
                "substation_name": cand_row["name"],
                "pincode": cand_row["pincode"],
                "area": cand_row["area"],
                "capacity_mva": cand_row["capacity_mva"],
                "active_power_mw": cand_row["active_mw"],
                "load_percentage": cand_row["load_pct"]
            }

            dr_assessment = dr_engine.calculate_dr_trigger(sub_info, cand_row["risk_pct"])

            st.write(f"**Substation:** `{cand_row['name']}` | **Pincode:** `{cand_row['pincode']}`")
            st.write(f"**Current Load:** `{cand_row['load_pct']}%` ({cand_row['active_mw']} MW) | **Thermal Risk:** `{cand_row['risk_pct']}%`")
            st.write(f"**Calculated Deficit to Safety Limit:** `{dr_assessment['required_mw_reduction']} MW`")

        with c_action:
            discount_rate = st.slider("Micro-Discount Incentive Rate (₹ / kWh reduced):", min_value=3.0, max_value=12.0, value=7.50, step=0.50)
            dr_duration = st.slider("Demand Response Duration (Hours):", min_value=1, max_value=4, value=2)

            if st.button("🚀 TRIGGER PRE-EMPTIVE AUTOMATED SMS DISPATCH", type="primary", use_container_width=True):
                dispatch_res = dr_engine.execute_automated_dr_dispatch(
                    substation_info=sub_info,
                    required_mw=max(1.5, dr_assessment["required_mw_reduction"]),
                    micro_discount_rate_inr=discount_rate,
                    duration_hours=dr_duration
                )
                st.session_data = dispatch_res

        # Display Dispatch Result & SMS Telemetry Log
        history = dr_engine.get_dispatch_history()
        if history:
            latest = history[0]
            st.markdown("---")
            st.markdown(f"### 📬 Live Dispatch Audit Log: `{latest['dispatch_id']}`")

            d1, d2, d3, d4 = st.columns(4)
            d1.metric("SMS Notifications Sent", f"{latest['target_consumers_notified']} users")
            d2.metric("Confirmed Opt-Ins", f"{latest['confirmed_participants']} users ({latest['acceptance_rate_pct']}%)")
            d3.metric("Load Shaved Achieved", f"{latest['achieved_mw_reduction']} MW", delta=f"Target: {latest['required_mw_reduction']} MW")
            d4.metric("Blackout Averted?", "YES - PREVENTED" if latest['blackout_averted'] else "PARTIAL RELIEF", delta_color="normal")

            st.write("**Simulated Outgoing SMS Telemetry Feed (Sample):**")
            sms_df = pd.DataFrame(latest["sample_sms_logs"])
            st.dataframe(
                sms_df[["timestamp", "consumer_name", "mobile", "tier", "target_reduction_kw", "status", "estimated_bill_discount_inr", "sms_content"]],
                use_container_width=True
            )

    # 2. LIVE SCADA TELEMETRY TABLE
    with tab_table:
        st.subheader("Live SCADA Telemetry Stream (50 Monitored Substations)")
        st.caption("Updated via MQTT broker every 5 seconds. Filters by West Bengal distribution circles.")

        col_f1, col_f2 = st.columns([1, 2])
        with col_f1:
            status_filter = st.multiselect("Filter by Status:", ["CRITICAL", "ELEVATED", "NORMAL"], default=["CRITICAL", "ELEVATED", "NORMAL"])
        with col_f2:
            search_query = st.text_input("Filter by Area or Pincode:", placeholder="e.g. Khardaha, Rahara, Salt Lake...")

        filtered_df = grid_df[grid_df["status"].isin(status_filter)]
        if search_query:
            filtered_df = filtered_df[
                filtered_df["name"].str.contains(search_query, case=False) |
                filtered_df["area"].str.contains(search_query, case=False) |
                filtered_df["pincode"].str.contains(search_query, case=False)
            ]

        st.dataframe(
            filtered_df[[
                "id", "name", "area", "pincode", "voltage_kv", "capacity_mva",
                "active_mw", "load_pct", "oil_temp_c", "temp_delta_c",
                "risk_pct", "status", "safe_window_h"
            ]],
            use_container_width=True,
            height=400
        )

    # 3. POSOCO STATE LOAD CALIBRATION
    with tab_posoco:
        st.subheader("POSOCO / Grid-India State-Level Demand Curve Calibration")
        st.caption("Hourly load curves modeled on West Bengal SLDC / ERLDC historical diurnal profiles")

        posoco_df = load_posoco_wb_dataset()
        # Display last 72 hours
        sub_posoco = posoco_df.tail(72).copy()

        fig_posoco = px.line(
            sub_posoco,
            x="timestamp",
            y=["wb_total_demand_mw", "wbsedcl_demand_mw", "cesc_demand_mw"],
            labels={"value": "Demand (MW)", "timestamp": "Timestamp", "variable": "Grid Entity"},
            title="West Bengal State Electricity Demand vs Utility Split (CESC Kolkata Metro vs WBSEDCL Districts)",
            color_discrete_map={
                "wb_total_demand_mw": "#38bdf8",
                "wbsedcl_demand_mw": "#10b981",
                "cesc_demand_mw": "#f59e0b"
            }
        )
        fig_posoco.update_layout(template="plotly_dark", height=380, margin=dict(l=20, r=20, t=40, b=20))
        st.plotly_chart(fig_posoco, use_container_width=True)

        c_p1, c_p2 = st.columns(2)
        with c_p1:
            fig_freq = px.line(
                sub_posoco,
                x="timestamp",
                y="grid_frequency_hz",
                title="Grid Frequency Dynamics (Target: 50.00 Hz)",
                color_discrete_sequence=["#a855f7"]
            )
            fig_freq.update_layout(template="plotly_dark", height=260, margin=dict(l=20, r=20, t=40, b=20))
            st.plotly_chart(fig_freq, use_container_width=True)
        with c_p2:
            fig_env = px.line(
                sub_posoco,
                x="timestamp",
                y=["apparent_temp_c", "ambient_temp_c"],
                title="Monsoon Heat Index (Apparent Temp) vs Ambient Temp",
                color_discrete_map={"apparent_temp_c": "#ef4444", "ambient_temp_c": "#fbbf24"}
            )
            fig_env.update_layout(template="plotly_dark", height=260, margin=dict(l=20, r=20, t=40, b=20))
            st.plotly_chart(fig_env, use_container_width=True)

    # 4. DEEP SHAP DIAGNOSTIC WATERFALL
    with tab_shap:
        st.subheader("🔬 XGBoost SHAP TreeExplainer Attribution Diagnostics")
        st.caption("Quantifying the non-grid (Heat Index, AQI) vs electrical (MW, Oil Temp) contributors")

        selected_ss_name = st.selectbox("Inspect SHAP Waterfall for Substation:", grid_df["name"].tolist(), index=0)
        sel_row = grid_df[grid_df["name"] == selected_ss_name].iloc[0]
        shap_dict = sel_row["shap_dict"]

        shap_df = pd.DataFrame(list(shap_dict.items()), columns=["Feature", "SHAP_Impact"])
        shap_df["Abs_Impact"] = shap_df["SHAP_Impact"].abs()
        shap_df = shap_df.sort_values(by="Abs_Impact", ascending=True)

        shap_df["Color"] = shap_df["SHAP_Impact"].apply(lambda v: "#ef4444" if v > 0 else "#10b981")

        fig_shap = go.Figure(go.Bar(
            x=shap_df["SHAP_Impact"],
            y=shap_df["Feature"],
            orientation="h",
            marker=dict(color=shap_df["Color"])
        ))
        fig_shap.update_layout(
            title=f"Feature Impact on 4-Hour Thermal Overload Risk: {selected_ss_name}",
            xaxis_title="SHAP Value (Positive = Escalates Risk, Negative = Mitigates Risk)",
            template="plotly_dark",
            height=420,
            margin=dict(l=30, r=30, t=50, b=30)
        )
        st.plotly_chart(fig_shap, use_container_width=True)
