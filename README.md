# BengalGrid AI: Smart Grid Digital Twin for West Bengal (Khardaha & Kolkata)

An AI-driven predictive smart grid digital twin engineered for localized power distribution around **Khardaha (North 24 Parganas)** and the **Kolkata Metropolitan Area**. 

This system shifts utilities away from reactive SCADA alarms by forecasting **transformer thermal overloads up to 4 hours in advance**, correlating electrical SCADA telemetry with non-grid atmospheric stress (high heat index + severe AQI causing continuous closed-window AC run), and automating **Pre-Emptive Demand Response (DR)** with micro-discount SMS offers to avert community blackouts.

---

## Key Features

1. **Geospatial SCADA Twin (50 Substations)**:
   - Integrates OpenStreetMap Overpass Turbo API for West Bengal (`power=substation`).
   - Mapped 50 key substations across Khardaha (`700117`), Rahara (`700118`), Titagarh (`700119`), Barrackpore (`700120`), Salt Lake (`700091`), BBD Bagh (`700001`), New Alipore (`700053`), and Howrah (`711101`).

2. **Live Open-Meteo Weather & AQI Integration**:
   - Real-time atmospheric metrics (ambient temperature, apparent temperature/heat index, humidity).
   - Air quality telemetry (PM2.5, PM10, US AQI).
   - Non-grid interaction modeling: captures severe AQI events that force residents to seal windows and run ACs continuously, creating severe thermal spikes.

3. **Live MQTT Smart Meter Streamer (`paho-mqtt`)**:
   - Streams 50 substation payloads every 5 seconds (active power MW, reactive MVAR, voltage kV, current A, transformer oil temperature °C, power factor, capacity utilization).

4. **Predictive Machine Learning Engine (XGBoost + SHAP)**:
   - 4-hour forward lookahead classification and time-to-outage forecasting.
   - Plain-language failure attributions powered by `shap.TreeExplainer` for non-technical citizens, alongside technical SHAP waterfall charts for engineers.

5. **Pre-Emptive Demand Response & Automated SMS Dispatch**:
   - Triggers before forced load shedding occurs.
   - Calculates MW deficit needed to bring transformers below safe 75% thresholds.
   - Simulates automated SMS dispatch offering ₹7.50/kWh micro-discounts to high-consumption domestic and MSME meters.

6. **Dual-View Streamlit Dashboard**:
   - **Citizen View**: 6-digit Pincode search, real-time "Safe Window" countdown, plain-language root causes, voluntary load-shedding opt-in, and outage readiness checklist.
   - **Operator View**: 3D PyDeck SCADA map, live 5s MQTT telemetry table, POSOCO state load curve calibrations, and one-click DR dispatch console.

---

## Installation & Running Locally

```bash
# 1. Activate the virtual environment
.\.venv\Scripts\activate

# 2. Run the Streamlit Web Application
streamlit run app.py
```
Open your browser at `http://localhost:8501`.
