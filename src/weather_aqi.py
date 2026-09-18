"""
Open-Meteo Weather & Air Quality API Connector
Fetches live ambient temperature, apparent temperature (heat index), humidity,
PM2.5, PM10, and AQI for West Bengal (focusing on Khardaha & Kolkata).
"""

import datetime
import logging
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_AQI_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

# Reference Coordinates for Localized Zones
ZONES = {
    "Khardaha": {"lat": 22.7196, "lon": 88.3803, "pincode": "700117"},
    "Kolkata": {"lat": 22.5726, "lon": 88.3639, "pincode": "700001"},
    "Barrackpore": {"lat": 22.7644, "lon": 88.3776, "pincode": "700120"},
    "Salt Lake": {"lat": 22.5800, "lon": 88.4330, "pincode": "700091"},
    "Howrah": {"lat": 22.5890, "lon": 88.3430, "pincode": "711101"}
}

# Fallback realistic weather profiles for West Bengal summer/monsoon
FALLBACK_ENV = {
    "temperature_c": 35.4,
    "apparent_temperature_c": 43.1,  # High heat index common in Gangetic West Bengal
    "relative_humidity_pct": 78.0,
    "direct_radiation_wm2": 620.0,
    "wind_speed_kmh": 12.5,
    "pm2_5": 168.0,                  # Elevated particulate pollution
    "pm10": 215.0,
    "aqi_us": 218,                   # 'Very Unhealthy' -> triggers closed windows & AC spikes
    "aqi_category": "Very Unhealthy",
    "ac_load_stress_factor": 1.42,    # Heat index + PM2.5 multiplier
    "timestamp": datetime.datetime.now().isoformat(),
    "is_live": False
}


def get_aqi_category(us_aqi: int) -> str:
    """Categorize US AQI scale."""
    if us_aqi <= 50:
        return "Good"
    elif us_aqi <= 100:
        return "Moderate"
    elif us_aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    elif us_aqi <= 200:
        return "Unhealthy"
    elif us_aqi <= 300:
        return "Very Unhealthy"
    else:
        return "Hazardous"


def compute_ac_stress_factor(apparent_temp: float, us_aqi: int) -> float:
    """
    Correlates non-grid data streams:
    High apparent temperature (heat index) combined with severe AQI forces residents
    to keep all windows closed and operate air conditioning / chillers at maximum continuous duty,
    producing an anomalous non-linear transformer load spike.
    """
    # Baseline multiplier: 1.0 at 28°C
    temp_stress = max(0.0, (apparent_temp - 28.0) * 0.035)

    # AQI stress: above 150, closed-room AC factor increases by 0.15 to 0.35
    aqi_stress = 0.0
    if us_aqi > 150:
        aqi_stress = min(0.35, (us_aqi - 150) * 0.002)

    total_factor = round(1.0 + temp_stress + aqi_stress, 3)
    return max(1.0, total_factor)


def fetch_live_weather(lat: float, lon: float, timeout_sec: int = 5):
    """Fetch live atmospheric conditions from Open-Meteo."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,direct_radiation,wind_speed_10m",
        "timezone": "Asia/Kolkata"
    }
    try:
        resp = requests.get(OPEN_METEO_WEATHER_URL, params=params, timeout=timeout_sec)
        if resp.status_code == 200:
            data = resp.json().get("current", {})
            return {
                "temperature_c": data.get("temperature_2m", FALLBACK_ENV["temperature_c"]),
                "apparent_temperature_c": data.get("apparent_temperature", FALLBACK_ENV["apparent_temperature_c"]),
                "relative_humidity_pct": data.get("relative_humidity_2m", FALLBACK_ENV["relative_humidity_pct"]),
                "direct_radiation_wm2": data.get("direct_radiation", FALLBACK_ENV["direct_radiation_wm2"]),
                "wind_speed_kmh": data.get("wind_speed_10m", FALLBACK_ENV["wind_speed_kmh"])
            }
    except Exception as exc:
        logger.warning("Open-Meteo weather fetch failed (%s). Using fallback.", exc)
    return None


def fetch_live_aqi(lat: float, lon: float, timeout_sec: int = 5):
    """Fetch live air quality indicators from Open-Meteo Air Quality API."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "pm10,pm2_5,us_aqi,european_aqi",
        "timezone": "Asia/Kolkata"
    }
    try:
        resp = requests.get(OPEN_METEO_AQI_URL, params=params, timeout=timeout_sec)
        if resp.status_code == 200:
            data = resp.json().get("current", {})
            us_aqi = int(data.get("us_aqi", FALLBACK_ENV["aqi_us"]))
            return {
                "pm2_5": float(data.get("pm2_5", FALLBACK_ENV["pm2_5"])),
                "pm10": float(data.get("pm10", FALLBACK_ENV["pm10"])),
                "aqi_us": us_aqi,
                "aqi_category": get_aqi_category(us_aqi)
            }
    except Exception as exc:
        logger.warning("Open-Meteo AQI fetch failed (%s). Using fallback.", exc)
    return None


def get_live_weather_and_aqi(lat: float = 22.7196, lon: float = 88.3803) -> dict:
    """
    Unified function fetching both weather and air quality with automatic fallback.
    Default coords: Khardaha (North 24 Parganas).
    """
    weather = fetch_live_weather(lat, lon)
    aqi = fetch_live_aqi(lat, lon)

    result = FALLBACK_ENV.copy()
    result["timestamp"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if weather:
        result.update(weather)
        result["is_live"] = True
    if aqi:
        result.update(aqi)
        result["is_live"] = True

    # Recompute non-grid AC stress factor
    result["ac_load_stress_factor"] = compute_ac_stress_factor(
        result["apparent_temperature_c"],
        result["aqi_us"]
    )
    return result


if __name__ == "__main__":
    data = get_live_weather_and_aqi()
    print("Fetched Environmental Snapshot for Khardaha/Kolkata:")
    for k, v in data.items():
        print(f"  {k}: {v}")
