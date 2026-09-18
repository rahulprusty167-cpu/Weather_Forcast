"""
MQTT Telemetry Streamer & Smart Meter Simulator
Simulates a live smart meter / SCADA stream for 50 West Bengal substations,
publishing load, voltage, power factor, and transformer oil temperature JSON payloads every 5 seconds.
"""

import json
import time
import math
import random
import logging
import threading
import datetime
from typing import Dict, Any, List

try:
    import paho.mqtt.client as mqtt
    PAHO_AVAILABLE = True
except ImportError:
    PAHO_AVAILABLE = False

from src.geo_substations import CURATED_SUBSTATIONS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DEFAULT_BROKER = "broker.hivemq.com"
DEFAULT_PORT = 1883
BASE_TOPIC = "wbsedcl/smartgrid/telemetry"


class SmartGridTelemetryStreamer:
    """
    Manages live MQTT publication and subscription for 50 substations.
    Maintains a thread-safe cache of latest readings for the Streamlit Digital Twin.
    """

    def __init__(self, broker: str = DEFAULT_BROKER, port: int = DEFAULT_PORT):
        self.broker = broker
        self.port = port
        self.substations = CURATED_SUBSTATIONS
        self.latest_telemetry: Dict[str, Dict[str, Any]] = {}
        self.history: Dict[str, List[Dict[str, Any]]] = {}
        self._lock = threading.Lock()
        self.is_running = False
        self._thread = None
        self.connected = False
        self.client = None

        self._init_fallback_cache()

    def _init_fallback_cache(self):
        """Pre-populate initial realistic readings for all 50 substations."""
        now = datetime.datetime.now()
        for ss in self.substations:
            reading = self.generate_substation_payload(ss, now)
            self.latest_telemetry[ss["id"]] = reading
            self.history[ss["id"]] = [reading]

    def _create_mqtt_client(self):
        """Create and configure paho-mqtt client with version compatibility."""
        if not PAHO_AVAILABLE:
            logger.warning("paho-mqtt not available. Operating in local loopback simulation mode.")
            return None

        try:
            # Paho MQTT 2.0+ API
            client = mqtt.Client(
                callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
                client_id=f"wb_digital_twin_{random.randint(1000, 9999)}"
            )
        except (AttributeError, TypeError):
            # Paho MQTT 1.x fallback
            client = mqtt.Client(client_id=f"wb_digital_twin_{random.randint(1000, 9999)}")

        def on_connect(c, userdata, flags, reason_code, properties=None):
            if hasattr(reason_code, "is_failure") and not reason_code.is_failure:
                self.connected = True
                logger.info("Connected to MQTT Broker %s:%d. Subscribing to %s/#", self.broker, self.port, BASE_TOPIC)
                c.subscribe(f"{BASE_TOPIC}/#")
            elif reason_code == 0:
                self.connected = True
                logger.info("Connected to MQTT Broker %s:%d", self.broker, self.port)
                c.subscribe(f"{BASE_TOPIC}/#")
            else:
                logger.warning("MQTT connection failed with code: %s", reason_code)

        def on_message(c, userdata, msg):
            try:
                payload = json.loads(msg.payload.decode("utf-8"))
                ss_id = payload.get("substation_id")
                if ss_id:
                    with self._lock:
                        self.latest_telemetry[ss_id] = payload
                        if ss_id not in self.history:
                            self.history[ss_id] = []
                        self.history[ss_id].append(payload)
                        if len(self.history[ss_id]) > 60:
                            self.history[ss_id].pop(0)
            except Exception as e:
                logger.debug("Failed to parse incoming MQTT message: %s", e)

        client.on_connect = on_connect
        client.on_message = on_message
        return client

    def generate_substation_payload(self, ss: Dict[str, Any], dt: datetime.datetime, ambient_temp: float = 34.5) -> Dict[str, Any]:
        """Generate statistically realistic electrical & thermal SCADA telemetry."""
        hour = dt.hour
        minute = dt.minute

        # Diurnal base load factor (evening spike from 18 to 22)
        if 18 <= hour <= 22:
            time_factor = 0.82 + 0.12 * math.sin((hour - 18) * math.pi / 4)
        elif 12 <= hour <= 16:
            time_factor = 0.74 + 0.08 * math.sin((hour - 12) * math.pi / 4)
        elif 0 <= hour <= 5:
            time_factor = 0.48 + 0.05 * math.sin(hour)
        else:
            time_factor = 0.65

        # Khardaha / Rahara / Titagarh area (dense residential & MSME) experiences heightened evening load
        is_khardaha_belt = ss["pincode"] in ["700117", "700118", "700119", "700110"]
        if is_khardaha_belt:
            time_factor += 0.08

        # Random micro-fluctuations (substation tap changers, AC cycling)
        micro_jitter = random.uniform(-0.04, 0.05)
        load_pct = min(0.98, max(0.35, time_factor + micro_jitter))

        capacity_mva = float(ss.get("capacity_mva", 50))
        apparent_mva = round(capacity_mva * load_pct, 2)
        power_factor = round(random.uniform(0.89, 0.96), 3)
        active_mw = round(apparent_mva * power_factor, 2)
        reactive_mvar = round(math.sqrt(max(0, apparent_mva**2 - active_mw**2)), 2)

        nominal_kv = float(ss.get("voltage_kv", 33))
        # Voltage drops slightly under heavy loading
        voltage_kv = round(nominal_kv * (1.0 - (load_pct - 0.5) * 0.05 + random.uniform(-0.01, 0.01)), 2)
        current_a = round((apparent_mva * 1000) / (math.sqrt(3) * nominal_kv), 1)

        # Transformer Oil Temperature dynamics:
        # Standard dissipation: Oil Temp = Ambient + k * (Load_Pct ^ 1.6)
        delta_t = 42.0 * (load_pct ** 1.6) + random.uniform(-1.5, 2.0)
        oil_temp_c = round(ambient_temp + delta_t, 1)

        # Thermal overload risk criterion:
        # IEEE std: Continuous operation above 85°C oil temp or >88% capacity accelerates insulation degradation
        is_thermal_alert = bool(oil_temp_c >= 82.0 or load_pct >= 0.87)

        return {
            "substation_id": ss["id"],
            "substation_name": ss["name"],
            "pincode": ss["pincode"],
            "area": ss["area"],
            "operator": ss["operator"],
            "lat": ss["lat"],
            "lon": ss["lon"],
            "timestamp": dt.strftime("%Y-%m-%d %H:%M:%S"),
            "capacity_mva": capacity_mva,
            "apparent_power_mva": apparent_mva,
            "active_power_mw": active_mw,
            "reactive_power_mvar": reactive_mvar,
            "voltage_kv": voltage_kv,
            "current_a": current_a,
            "power_factor": power_factor,
            "load_percentage": round(load_pct * 100, 1),
            "ambient_temp_c": ambient_temp,
            "transformer_oil_temp_c": oil_temp_c,
            "temperature_delta_c": round(oil_temp_c - ambient_temp, 1),
            "frequency_hz": round(random.uniform(49.92, 50.08), 2),
            "thermal_overload_alert": is_thermal_alert
        }

    def _stream_loop(self):
        """Background streaming worker sending payloads every 5 seconds."""
        logger.info("Starting live telemetry stream worker (5s interval)...")
        while self.is_running:
            now = datetime.datetime.now()
            for ss in self.substations:
                payload = self.generate_substation_payload(ss, now)
                ss_id = ss["id"]

                # Update internal memory cache immediately
                with self._lock:
                    self.latest_telemetry[ss_id] = payload
                    if ss_id not in self.history:
                        self.history[ss_id] = []
                    self.history[ss_id].append(payload)
                    if len(self.history[ss_id]) > 60:
                        self.history[ss_id].pop(0)

                # Publish to MQTT broker if connected
                if self.client and self.connected:
                    try:
                        topic = f"{BASE_TOPIC}/{ss_id}"
                        self.client.publish(topic, json.dumps(payload), qos=0)
                    except Exception as exc:
                        logger.debug("MQTT publish error: %s", exc)

            time.sleep(5)

    def start(self):
        """Start the background streaming worker."""
        if self.is_running:
            return

        self.is_running = True
        self.client = self._create_mqtt_client()
        if self.client:
            try:
                self.client.connect_async(self.broker, self.port, keepalive=60)
                self.client.loop_start()
            except Exception as e:
                logger.warning("Could not connect to external MQTT broker (%s). Running local simulation.", e)

        self._thread = threading.Thread(target=self._stream_loop, daemon=True)
        self._thread.start()
        logger.info("Smart Grid Telemetry Streamer started successfully.")

    def stop(self):
        """Stop streamer."""
        self.is_running = False
        if self.client:
            try:
                self.client.loop_stop()
                self.client.disconnect()
            except Exception:
                pass

    def get_latest_telemetry(self) -> Dict[str, Dict[str, Any]]:
        """Return snapshot of latest telemetry for all 50 substations."""
        with self._lock:
            return dict(self.latest_telemetry)

    def get_telemetry_for_pincode(self, pincode: str) -> List[Dict[str, Any]]:
        """Return latest telemetry for substations in given Pincode."""
        pincode = str(pincode).strip()
        with self._lock:
            matches = [t for t in self.latest_telemetry.values() if t.get("pincode") == pincode]
            if matches:
                return matches
            # Fallback to Khardaha
            return [self.latest_telemetry.get("WB_SS_01", list(self.latest_telemetry.values())[0])]


# Global singleton instance for Streamlit runtime sharing
_streamer_instance = None


def get_streamer_instance() -> SmartGridTelemetryStreamer:
    """Retrieve or create the shared telemetry streamer."""
    global _streamer_instance
    if _streamer_instance is None:
        _streamer_instance = SmartGridTelemetryStreamer()
        _streamer_instance.start()
    return _streamer_instance


if __name__ == "__main__":
    streamer = SmartGridTelemetryStreamer()
    streamer.start()
    print("Streaming for 12 seconds...")
    time.sleep(12)
    sample = streamer.get_latest_telemetry().get("WB_SS_01")
    print("Sample telemetry (Khardaha SS):", json.dumps(sample, indent=2))
    streamer.stop()
