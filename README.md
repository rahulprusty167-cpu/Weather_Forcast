# BengalGrid AI: Smart Grid Digital Twin
> **AI-Driven 4-Hour Predictive Thermal Overload Forecasting & 3D SCADA Twin for West Bengal**  
> *Targeted for Khardaha (700117), Barrackpore, Salt Lake & the Greater Kolkata Metropolitan Area.*

[![React 18](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61dafb?logo=react)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/3D-Three.js_WebGL-black?logo=three.js)](https://threejs.org/)
[![ML](https://img.shields.io/badge/ML-XGBoost_%2B_SHAP-eb6134?logo=xgboost)](https://xgboost.readthedocs.io/)
[![Weather API](https://img.shields.io/badge/API-Open--Meteo_Weather_%26_AQI-059669)](https://open-meteo.com/)

---

## ⚡ What It Does

Traditional grid SCADA systems sound alarms only *after* a transformer overheats. **BengalGrid AI** shifts grid operations from reactive alarms to **pre-emptive prevention**:

1. **4-Hour Early Warning (XGBoost + SHAP)**: Predicts transformer thermal overload up to 4 hours ahead using IEEE Std C57.91 thermal dynamics and translates risks into plain-language citizen explanations.
2. **Weather & Air Quality Coupling**: Pulls live Open-Meteo atmospheric metrics (apparent heat index + PM2.5/AQI) to model non-grid behavioral surges (continuous closed-window AC usage) via a dynamic **AC Load Stress Factor**.
3. **Interactive 3D Digital Twin (Three.js WebGL)**: Real-time 3D substation yard and transformer with rotating cooling fans, live thermal heatmap inspection, and electromagnetic flux (EMF) particle flows.
4. **Citizen Outage Transparency**: Pincode-based search (Khardaha `700117`, Rahara `700118`, Barrackpore `700120`, etc.), real-time "Safe Window" countdown, outage readiness checklists, and voluntary Demand Response (DR) micro-discount enrollment with simulated SMS dispatch.
5. **SCADA Operator Console**: Geospatial monitoring across 50 West Bengal substations via Leaflet topographical map, live telemetry feeds, and one-click pre-emptive DR load curtailment dispatch.

---

## 🚀 Quick Start

### Option 1: One-Click Launch (Windows)
Double-click **`start_app.bat`** or run:
```bash
python run.py
```
*Automatically launches the Vite server and opens **`http://localhost:3000`** in your browser.*

### Option 2: Run via NPM (React + Vite)
```bash
npm install
npm run dev
```
Open **`http://localhost:3000`**.

### Option 3: Companion Streamlit App (Python)
```bash
.\.venv\Scripts\activate
pip install streamlit plotly pydeck pandas numpy xgboost shap requests
streamlit run app.py
```
Open **`http://localhost:8501`**.

---

## 🛠️ Tech Stack & Key Files

| Layer | Technologies | Key Files |
| :--- | :--- | :--- |
| **Web Frontend** | React 18, Vite 5, Tailwind CSS 3 | [`src/App.jsx`](src/App.jsx), [`src/components/`](src/components/) |
| **3D Engine** | Three.js (WebGL, OrbitControls) | [`Substation3DScene.jsx`](src/components/3d/Substation3DScene.jsx), [`CitizenTransformer3D.jsx`](src/components/3d/CitizenTransformer3D.jsx) |
| **Map & Charts** | Leaflet, Recharts | [`TopographicalGridMap.jsx`](src/components/TopographicalGridMap.jsx), [`TelemetryCards.jsx`](src/components/TelemetryCards.jsx) |
| **Simulation & ML** | XGBoost, SHAP, IEEE C57.91 | [`src/model_trainer.py`](src/model_trainer.py), [`src/services/gridEngine.js`](src/services/gridEngine.js) |
| **Live Telemetry** | Open-Meteo Weather & AQI APIs | [`src/services/liveWeatherService.js`](src/services/liveWeatherService.js), [`src/weather_aqi.py`](src/weather_aqi.py) |

---

## ⚠️ Disclaimer
**Simulation for Demonstration & Academic Research**: This project is not affiliated with or endorsed by **WBSEDCL**, **CESC**, or **WBSETCL**. All grid telemetry, SMS messages, and bill rebates are synthetically generated for demonstration purposes.

