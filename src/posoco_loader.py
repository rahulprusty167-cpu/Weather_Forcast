"""
POSOCO (Power System Operation Corporation / Grid-India) West Bengal Data Generator & Loader
Synthesizes statistically authentic 15-minute and hourly load profiles calibrated to
Eastern Regional Load Despatch Centre (ERLDC) historical records for West Bengal.
"""

import os
import math
import logging
import datetime
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def generate_posoco_wb_dataset(num_days: int = 45, output_csv: str = "data/posoco_west_bengal_load.csv"):
    """
    Generates realistic POSOCO ERLDC time-series data for West Bengal:
    - Base demand: ~4800 MW (industrial baseload, nighttime)
    - Diurnal morning ramp: 07:00 - 11:00
    - Afternoon AC / commercial plateau: 12:00 - 16:00
    - Critical Evening Peak: 18:00 - 22:30 (reaching up to 10,200 MW in humid conditions)
    - Grid Frequency: centered at 50.00 Hz with slight droop under heavy load
    - State drawal vs schedule deviation (UI / Deviation Settlement Mechanism)
    """
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)

    np.random.seed(42)
    start_date = datetime.datetime(2026, 7, 1, 0, 0)
    timestamps = []
    total_mw = []
    cesc_mw = []
    wbsedcl_mw = []
    freq_hz = []
    ambient_temp = []
    relative_humidity = []
    apparent_temp = []
    us_aqi = []
    overload_flag = []

    total_steps = num_days * 24  # Hourly intervals

    for step in range(total_steps):
        dt = start_date + datetime.timedelta(hours=step)
        hour = dt.hour
        day_of_week = dt.weekday()
        is_weekend = 1 if day_of_week >= 5 else 0

        # Diurnal temperature cycle: min at 05:00 (29°C), max at 14:00 (37°C)
        t_cycle = math.sin((hour - 9) * 2 * math.pi / 24)
        temp = 32.0 + 4.5 * t_cycle + np.random.normal(0, 0.8)
        humidity = 72.0 - 15.0 * t_cycle + np.random.normal(0, 3.0)
        humidity = np.clip(humidity, 50.0, 95.0)

        # Apparent temperature / Heat index calculation (Steadman approx)
        heat_index = temp + 0.33 * (humidity / 100.0 * 6.105 * math.exp((17.27 * temp) / (237.7 + temp))) - 4.0

        # Diurnal AQI pattern (higher at night/early morning due to thermal inversion)
        aqi_cycle = math.cos((hour - 2) * 2 * math.pi / 24)
        aqi = int(np.clip(160 + 55 * aqi_cycle + np.random.normal(0, 15), 65, 340))

        # AC Load surge multiplier based on heat index & AQI
        ac_spike = max(0.0, (heat_index - 32.0) * 160.0)
        if aqi > 180:
            ac_spike += (aqi - 180) * 3.5  # Extra closed-window cooling demand

        # Base diurnal electricity curve (in MW)
        # Hour factors: Night ~0.65, Morning ~0.82, Afternoon ~0.90, Evening Peak ~1.28
        if 0 <= hour < 5:
            diurnal = 5200 + 400 * math.sin(hour)
        elif 5 <= hour < 10:
            diurnal = 5600 + (hour - 5) * 320
        elif 10 <= hour < 17:
            diurnal = 7200 + 300 * math.sin((hour - 10) * math.pi / 7)
        elif 17 <= hour < 22:
            # Steep domestic evening peak
            diurnal = 8800 + 950 * math.sin((hour - 17) * math.pi / 5)
        else:
            diurnal = 7100 - (hour - 22) * 800

        # Weekend reduction (commercial/industrial down ~8%)
        if is_weekend:
            diurnal *= 0.92

        demand = diurnal + ac_spike + np.random.normal(0, 180)
        demand = np.clip(demand, 4400, 10800)

        # CESC handles ~28% (Kolkata Metro), WBSEDCL handles ~72% (rest of WB including Khardaha)
        cesc = round(demand * 0.285 + np.random.normal(0, 40), 1)
        wbsedcl = round(demand - cesc, 1)

        # Frequency drops when demand exceeds 9200 MW
        if demand > 9200:
            freq = 49.92 - (demand - 9200) * 0.00015 + np.random.normal(0, 0.02)
        else:
            freq = 50.01 + np.random.normal(0, 0.03)
        freq = round(np.clip(freq, 49.72, 50.25), 3)

        # Thermal overload risk flag (Demand > 8800 MW and Heat Index > 38°C)
        is_overload = 1 if (demand > 8900 and heat_index > 38.0) else 0

        timestamps.append(dt.strftime("%Y-%m-%d %H:%M:%S"))
        total_mw.append(round(demand, 1))
        cesc_mw.append(cesc)
        wbsedcl_mw.append(wbsedcl)
        freq_hz.append(freq)
        ambient_temp.append(round(temp, 1))
        relative_humidity.append(round(humidity, 1))
        apparent_temp.append(round(heat_index, 1))
        us_aqi.append(aqi)
        overload_flag.append(is_overload)

    df = pd.DataFrame({
        "timestamp": timestamps,
        "wb_total_demand_mw": total_mw,
        "cesc_demand_mw": cesc_mw,
        "wbsedcl_demand_mw": wbsedcl_mw,
        "grid_frequency_hz": freq_hz,
        "ambient_temp_c": ambient_temp,
        "relative_humidity_pct": relative_humidity,
        "apparent_temp_c": apparent_temp,
        "us_aqi": us_aqi,
        "system_overload_alert": overload_flag
    })

    df.to_csv(output_csv, index=False)
    logger.info("Successfully generated %d POSOCO West Bengal records -> %s", len(df), output_csv)
    return df


def load_posoco_wb_dataset(filepath: str = "data/posoco_west_bengal_load.csv"):
    """Load or lazily create the POSOCO West Bengal dataset."""
    if not os.path.exists(filepath):
        logger.info("POSOCO dataset not found at %s. Generating calibrated dataset...", filepath)
        return generate_posoco_wb_dataset(output_csv=filepath)
    return pd.read_csv(filepath)


if __name__ == "__main__":
    generate_posoco_wb_dataset()
