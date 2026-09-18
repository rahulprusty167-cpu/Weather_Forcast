/**
 * Open-Meteo Live Atmospheric & Air Quality API Connector
 * Fetches real-time, live weather and air quality telemetry for West Bengal localities.
 * APIs used:
 * - Weather: https://api.open-meteo.com/v1/forecast
 * - Air Quality: https://air-quality-api.open-meteo.com/v1/air-quality
 */

const OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_AQI_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

// Simple in-memory cache to prevent excessive redundant API calls within 20 seconds
const cache = new Map();
const CACHE_TTL_MS = 20000;

export function getAqiCategory(usAqi) {
  if (usAqi <= 50) return "Good";
  if (usAqi <= 100) return "Moderate";
  if (usAqi <= 150) return "Unhealthy for Sensitive";
  if (usAqi <= 200) return "Poor";
  if (usAqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

export function computeAcStressFactor(apparentTemp, usAqi) {
  // Baseline multiplier: 1.0 at 28°C
  const tempStress = Math.max(0, (apparentTemp - 28.0) * 0.035);

  // AQI stress: above 150, closed-room AC continuous duty factor increases
  let aqiStress = 0;
  if (usAqi > 150) {
    aqiStress = Math.min(0.35, (usAqi - 150) * 0.002);
  }

  const totalFactor = Math.round((1.0 + tempStress + aqiStress) * 100) / 100;
  return Math.max(1.0, totalFactor);
}

/**
 * Fetch live weather and air quality for exact coordinates
 */
export async function fetchLiveEnvironmentalData(lat = 22.7196, lon = 88.3803, areaName = "Khardaha") {
  const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
  const now = Date.now();

  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return { ...cached.data, from_cache: true };
    }
  }

  const startTime = performance.now();

  const weatherUrl = `${OPEN_METEO_WEATHER_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,direct_radiation,wind_speed_10m&timezone=Asia/Kolkata`;
  const aqiUrl = `${OPEN_METEO_AQI_URL}?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,us_aqi,european_aqi&timezone=Asia/Kolkata`;

  try {
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(weatherUrl, { headers: { 'Accept': 'application/json' } }),
      fetch(aqiUrl, { headers: { 'Accept': 'application/json' } })
    ]);

    if (!weatherRes.ok || !aqiRes.ok) {
      throw new Error(`Open-Meteo HTTP error: weather ${weatherRes.status}, aqi ${aqiRes.status}`);
    }

    const weatherJson = await weatherRes.json();
    const aqiJson = await aqiRes.json();

    const currWeather = weatherJson.current || {};
    const currAqi = aqiJson.current || {};

    const tempC = Number(currWeather.temperature_2m ?? 31.8);
    const apparentTempC = Number(currWeather.apparent_temperature ?? 40.5);
    const humidity = Number(currWeather.relative_humidity_2m ?? 74);
    const radiation = Number(currWeather.direct_radiation ?? 485);
    const windSpeed = Number(currWeather.wind_speed_10m ?? 2.6);

    const usAqi = Math.round(Number(currAqi.us_aqi ?? 154));
    const pm25 = Number(currAqi.pm2_5 ?? 61.9);
    const pm10 = Number(currAqi.pm10 ?? 63.3);

    const acFactor = computeAcStressFactor(apparentTempC, usAqi);
    const latencyMs = Math.round(performance.now() - startTime);
    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const liveData = {
      temperature_c: Math.round(tempC * 10) / 10,
      apparent_temperature_c: Math.round(apparentTempC * 10) / 10,
      relative_humidity_pct: Math.round(humidity),
      direct_radiation_wm2: Math.round(radiation),
      wind_speed_kmh: Math.round(windSpeed * 10) / 10,
      pm2_5: Math.round(pm25 * 10) / 10,
      pm10: Math.round(pm10 * 10) / 10,
      aqi_us: usAqi,
      aqi_category: getAqiCategory(usAqi),
      ac_load_stress_factor: acFactor,
      is_live: true,
      source: "Open-Meteo Live API",
      lat,
      lon,
      area: areaName,
      latency_ms: latencyMs,
      timestamp: formattedTime,
      api_timestamp: currWeather.time || new Date().toISOString()
    };

    cache.set(cacheKey, { timestamp: now, data: liveData });
    return liveData;
  } catch (err) {
    console.warn("Live Open-Meteo fetch failed, using realistic fallback:", err);

    // Dynamic fallback with time-of-day physics
    const currentHour = new Date().getHours();
    const diurnalOffset = Math.sin(((currentHour - 8) / 24) * Math.PI * 2);
    const fallbackTemp = Math.round((32.0 + diurnalOffset * 4.0) * 10) / 10;
    const fallbackApparent = Math.round((fallbackTemp + 7.5 + diurnalOffset * 1.5) * 10) / 10;
    const fallbackHumidity = Math.round(75 - diurnalOffset * 10);
    const fallbackAqi = Math.round(155 + Math.sin(currentHour) * 15);

    return {
      temperature_c: fallbackTemp,
      apparent_temperature_c: fallbackApparent,
      relative_humidity_pct: fallbackHumidity,
      direct_radiation_wm2: 480,
      wind_speed_kmh: 4.5,
      pm2_5: 64.2,
      pm10: 71.0,
      aqi_us: fallbackAqi,
      aqi_category: getAqiCategory(fallbackAqi),
      ac_load_stress_factor: computeAcStressFactor(fallbackApparent, fallbackAqi),
      is_live: false,
      source: "Open-Meteo Synthetic Physics Fallback",
      lat,
      lon,
      area: areaName,
      latency_ms: 0,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      api_timestamp: new Date().toISOString()
    };
  }
}
