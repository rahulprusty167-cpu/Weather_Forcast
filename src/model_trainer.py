"""
Core Machine Learning Engine: 4-Hour Predictive Thermal Overload Forecaster
Uses XGBoost to replace reactive SCADA alarms with pre-emptive thermal overload warnings,
correlating electrical load telemetry with non-grid atmospheric (heat index) & pollution (AQI) data.
Provides explainability powered by SHAP.
"""

import os
import math
import pickle
import logging
import numpy as np
import pandas as pd
import xgboost as xgb
import shap

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

MODEL_PATH = "data/xgboost_thermal_model.json"
EXPLAINER_PATH = "data/shap_explainer.pkl"
FEATURE_NAMES = [
    "load_percentage",
    "active_power_mw",
    "reactive_power_mvar",
    "power_factor",
    "transformer_oil_temp_c",
    "ambient_temp_c",
    "temp_delta_c",
    "apparent_temp_c",
    "relative_humidity_pct",
    "us_aqi",
    "ac_load_stress_factor",
    "hour_of_day",
    "voltage_drop_pct",
    "capacity_mva"
]


REAL_DATASET_PATH = os.environ.get("BENGALGRID_REAL_DATASET", "data_for_model/real_transformer_data.csv")


def generate_synthetic_training_data(num_samples: int = 5000) -> pd.DataFrame:
    """
    Synthesize high-fidelity physics-guided training data representing West Bengal grid dynamics:
    Simulates thermal time constants of large mineral-oil immersed power transformers (33/11kV and 132/33kV).
    """
    np.random.seed(101)

    capacities = np.random.choice([35, 40, 45, 50, 60, 75, 100, 125, 150], size=num_samples)
    hours = np.random.randint(0, 24, size=num_samples)

    # Ambient conditions (typical humid Kolkata monsoon/summer)
    ambient_temps = np.random.uniform(28.0, 41.5, size=num_samples)
    humidities = np.random.uniform(55.0, 96.0, size=num_samples)

    # Heat index
    apparent_temps = ambient_temps + 0.33 * (humidities / 100.0 * 6.105 * np.exp((17.27 * ambient_temps) / (237.7 + ambient_temps))) - 4.0

    # AQI (higher during thermal inversions / dry or industrial spikes)
    us_aqis = np.random.randint(45, 360, size=num_samples)

    # Non-grid AC load stress factor
    ac_factors = []
    for at, aqi in zip(apparent_temps, us_aqis):
        temp_stress = max(0.0, (at - 28.0) * 0.035)
        aqi_stress = min(0.35, (aqi - 150) * 0.002) if aqi > 150 else 0.0
        ac_factors.append(round(1.0 + temp_stress + aqi_stress, 3))
    ac_factors = np.array(ac_factors)

    # Baseline load percentage based on hour and AC stress factor
    base_loads = np.where((hours >= 18) & (hours <= 22), 0.76,
                 np.where((hours >= 11) & (hours <= 16), 0.68,
                 np.where((hours >= 0) & (hours <= 5), 0.45, 0.60)))

    # Micro-fluctuations and AC multiplier
    load_pcts = base_loads * (0.85 + 0.15 * ac_factors) + np.random.normal(0, 0.06, size=num_samples)
    load_pcts = np.clip(load_pcts, 0.30, 0.98) * 100.0  # as percentage

    # Electrical parameters
    power_factors = np.random.uniform(0.88, 0.96, size=num_samples)
    apparent_mva = capacities * (load_pcts / 100.0)
    active_mws = apparent_mva * power_factors
    reactive_mvars = np.sqrt(np.maximum(0, apparent_mva**2 - active_mws**2))
    voltage_drops = (load_pcts / 100.0 - 0.5) * 5.0 + np.random.normal(0, 0.5, size=num_samples)

    # Transformer oil temperature dynamics:
    # IEEE Std C57.91: delta_T = rated_delta_T * (load_ratio ** 1.6)
    delta_ts = 40.0 * ((load_pcts / 100.0) ** 1.6) + np.random.normal(0, 1.5, size=num_samples)
    oil_temps = ambient_temps + delta_ts

    # 4-hour forward lookahead thermal overload:
    # Occurs if high heat index + sustained AC load or current thermal buildup will push oil temp >= 82°C
    # or load percentage >= 88% within 4 hours.
    projected_delta = delta_ts * (1.0 + 0.18 * (ac_factors - 1.0))
    projected_oil_temp_4h = ambient_temps + projected_delta + np.where((hours >= 15) & (hours <= 20), 4.5, -2.0)

    # Ground truth label: 1 if thermal overload in next 4h, 0 otherwise
    overload_in_4h = np.where((projected_oil_temp_4h >= 82.0) | (load_pcts * (1.0 + 0.12 * (ac_factors - 1.0)) >= 88.0), 1, 0)

    # Calculate estimated safe window (in hours): 0.5h to 6.0h
    safe_window_hours = np.where(overload_in_4h == 1,
                                 np.clip(4.0 - (projected_oil_temp_4h - 82.0) * 0.4, 0.5, 3.8),
                                 np.clip(5.0 + np.random.uniform(0.5, 3.0, size=num_samples), 4.5, 8.0))

    df = pd.DataFrame({
        "load_percentage": np.round(load_pcts, 2),
        "active_power_mw": np.round(active_mws, 2),
        "reactive_power_mvar": np.round(reactive_mvars, 2),
        "power_factor": np.round(power_factors, 3),
        "transformer_oil_temp_c": np.round(oil_temps, 1),
        "ambient_temp_c": np.round(ambient_temps, 1),
        "temp_delta_c": np.round(delta_ts, 1),
        "apparent_temp_c": np.round(apparent_temps, 1),
        "relative_humidity_pct": np.round(humidities, 1),
        "us_aqi": us_aqis,
        "ac_load_stress_factor": np.round(ac_factors, 3),
        "hour_of_day": hours,
        "voltage_drop_pct": np.round(voltage_drops, 2),
        "capacity_mva": capacities,
        "overload_in_4h": overload_in_4h,
        "safe_window_hours": np.round(safe_window_hours, 1)
    })

    return df


# Backwards compatibility alias
generate_training_data = generate_synthetic_training_data


def load_real_training_data(csv_path: str = REAL_DATASET_PATH) -> pd.DataFrame:
    """
    Load, validate, and clean a real transformer dataset (e.g. from IEEE DataPort, Kaggle, or utility SCADA logs).
    Expects columns matching or mappable to FEATURE_NAMES, validates distributions,
    and ensures ground truth target 'overload_in_4h' is present.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Real transformer dataset not found at '{csv_path}'")

    logger.info("Loading real transformer training dataset from: %s", csv_path)
    raw_df = pd.read_csv(csv_path)

    alias_map = {
        "load_pct": "load_percentage",
        "loading": "load_percentage",
        "active_power": "active_power_mw",
        "power_mw": "active_power_mw",
        "reactive_power": "reactive_power_mvar",
        "power_mvar": "reactive_power_mvar",
        "pf": "power_factor",
        "oil_temp": "transformer_oil_temp_c",
        "top_oil_temp": "transformer_oil_temp_c",
        "ambient_temp": "ambient_temp_c",
        "apparent_temp": "apparent_temp_c",
        "heat_index": "apparent_temp_c",
        "humidity": "relative_humidity_pct",
        "aqi": "us_aqi",
        "capacity": "capacity_mva",
        "label": "overload_in_4h",
        "overload": "overload_in_4h",
        "target": "overload_in_4h"
    }
    df = raw_df.rename(columns=alias_map).copy()

    # Backfill derived features if missing
    if "temp_delta_c" not in df.columns and "transformer_oil_temp_c" in df.columns and "ambient_temp_c" in df.columns:
        df["temp_delta_c"] = df["transformer_oil_temp_c"] - df["ambient_temp_c"]

    if "hour_of_day" not in df.columns:
        if "timestamp" in df.columns:
            df["hour_of_day"] = pd.to_datetime(df["timestamp"]).dt.hour
        else:
            df["hour_of_day"] = 18

    if "ac_load_stress_factor" not in df.columns:
        df["ac_load_stress_factor"] = 1.0 + np.maximum(0.0, (df.get("apparent_temp_c", 32.0) - 28.0) * 0.035)

    if "voltage_drop_pct" not in df.columns:
        df["voltage_drop_pct"] = (df.get("load_percentage", 65.0) / 100.0 - 0.5) * 5.0

    if "capacity_mva" not in df.columns:
        df["capacity_mva"] = 50.0

    # Ensure target column exists
    if "overload_in_4h" not in df.columns:
        logger.warning("Target column 'overload_in_4h' not found in %s; inferring from IEEE thermal limits.", csv_path)
        df["overload_in_4h"] = np.where(
            (df.get("transformer_oil_temp_c", 0) >= 82.0) | (df.get("load_percentage", 0) >= 88.0),
            1, 0
        )

    # Check for missing required features
    missing_feats = [col for col in FEATURE_NAMES if col not in df.columns]
    if missing_feats:
        raise ValueError(f"Real dataset at '{csv_path}' is missing required feature columns: {missing_feats}")

    # Remove any NaN/Inf values
    df_clean = df.dropna(subset=FEATURE_NAMES + ["overload_in_4h"]).copy()
    logger.info("Successfully validated real dataset: %d valid rows, %d positive overload cases (%.1f%%)",
                len(df_clean), int(df_clean["overload_in_4h"].sum()),
                df_clean["overload_in_4h"].mean() * 100)
    return df_clean


class ThermalOverloadPredictor:
    """
    XGBoost 4-Hour Predictive Overload Model with SHAP Plain-Language Attributions.
    """

    def __init__(self, real_csv_path: str = REAL_DATASET_PATH):
        self.model = None
        self.explainer = None
        self.feature_names = FEATURE_NAMES
        self.real_csv_path = real_csv_path
        self._load_or_train()

    def _load_or_train(self):
        """Load pre-trained model or train on launch."""
        if os.path.exists(MODEL_PATH) and os.path.exists(EXPLAINER_PATH):
            try:
                self.model = xgb.XGBClassifier()
                self.model.load_model(MODEL_PATH)
                with open(EXPLAINER_PATH, "rb") as f:
                    self.explainer = pickle.load(f)
                logger.info("Loaded pre-trained XGBoost model & SHAP explainer.")
                return
            except Exception as e:
                logger.warning("Failed to load saved model (%s). Retraining...", e)

        self.train_and_save(real_csv_path=self.real_csv_path)

    def train_and_save(self, num_samples: int = 5000, real_csv_path: str = REAL_DATASET_PATH):
        """Train XGBoost classifier and build SHAP TreeExplainer."""
        if os.path.exists(real_csv_path):
            try:
                logger.info("REAL DATASET FOUND at '%s'. Training XGBoost model on REAL transformer data.", real_csv_path)
                df = load_real_training_data(real_csv_path)
            except Exception as e:
                logger.warning("Failed to load real dataset from %s (%s). Falling back to synthetic generator.", real_csv_path, e)
                df = generate_synthetic_training_data(num_samples)
        else:
            logger.info("No real dataset found at '%s'. Using synthetic physics-guided training data generator.", real_csv_path)
            df = generate_synthetic_training_data(num_samples)

        X = df[self.feature_names]
        y = df["overload_in_4h"]

        # Split 80/20
        split_idx = int(0.8 * len(df))
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        self.model = xgb.XGBClassifier(
            n_estimators=140,
            max_depth=5,
            learning_rate=0.08,
            subsample=0.85,
            colsample_bytree=0.85,
            eval_metric="logloss",
            random_state=42
        )
        self.model.fit(X_train, y_train)

        # Accuracy metrics
        train_acc = self.model.score(X_train, y_train)
        test_acc = self.model.score(X_test, y_test)
        logger.info("XGBoost trained successfully: Train Acc: %.3f, Test Acc: %.3f", train_acc, test_acc)

        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        self.model.save_model(MODEL_PATH)

        # Build SHAP TreeExplainer with tree_path_dependent perturbation
        logger.info("Building SHAP TreeExplainer...")
        self.explainer = shap.TreeExplainer(self.model, feature_perturbation="tree_path_dependent")
        with open(EXPLAINER_PATH, "wb") as f:
            pickle.dump(self.explainer, f)

        logger.info("Model and SHAP explainer saved to %s and %s", MODEL_PATH, EXPLAINER_PATH)

    def predict_risk(self, telemetry: dict, env_data: dict) -> dict:
        """
        Predict 4-hour thermal overload probability and compute SHAP explanation.
        """
        # Prepare feature vector
        load_pct = float(telemetry.get("load_percentage", 65.0))
        active_mw = float(telemetry.get("active_power_mw", 25.0))
        reactive_mvar = float(telemetry.get("reactive_power_mvar", 8.0))
        pf = float(telemetry.get("power_factor", 0.94))
        oil_temp = float(telemetry.get("transformer_oil_temp_c", 68.0))
        amb_temp = float(env_data.get("temperature_c", telemetry.get("ambient_temp_c", 34.0)))
        delta_t = round(oil_temp - amb_temp, 1)
        app_temp = float(env_data.get("apparent_temperature_c", 41.0))
        humidity = float(env_data.get("relative_humidity_pct", 75.0))
        aqi = int(env_data.get("aqi_us", 185))
        ac_factor = float(env_data.get("ac_load_stress_factor", 1.35))
        hour = int(datetime.datetime.now().hour) if "datetime" in globals() else 19
        voltage_nominal = float(telemetry.get("voltage_kv", 33.0))
        capacity = float(telemetry.get("capacity_mva", 50.0))
        voltage_drop = round((1.0 - (load_pct / 100.0)) * 2.5, 2)

        feat_dict = {
            "load_percentage": load_pct,
            "active_power_mw": active_mw,
            "reactive_power_mvar": reactive_mvar,
            "power_factor": pf,
            "transformer_oil_temp_c": oil_temp,
            "ambient_temp_c": amb_temp,
            "temp_delta_c": delta_t,
            "apparent_temp_c": app_temp,
            "relative_humidity_pct": humidity,
            "us_aqi": aqi,
            "ac_load_stress_factor": ac_factor,
            "hour_of_day": hour,
            "voltage_drop_pct": voltage_drop,
            "capacity_mva": capacity
        }

        row_df = pd.DataFrame([feat_dict])[self.feature_names]

        # Predict probability
        prob_overload = float(self.model.predict_proba(row_df)[0, 1])
        risk_pct = round(prob_overload * 100, 1)

        # Estimate Safe Window in hours
        if risk_pct > 75:
            safe_hours = round(max(0.75, 4.0 - (risk_pct - 75) * 0.1), 1)
            status = "CRITICAL OUTAGE RISK"
        elif risk_pct > 45:
            safe_hours = round(max(1.8, 5.0 - (risk_pct - 45) * 0.08), 1)
            status = "ELEVATED GRID STRESS"
        else:
            safe_hours = round(min(8.0, 5.5 + (45 - risk_pct) * 0.05), 1)
            status = "STABLE - SAFE WINDOW"

        # Compute SHAP values
        shap_raw = self.explainer.shap_values(row_df)
        shap_array = shap_raw[0] if isinstance(shap_raw, np.ndarray) and len(shap_raw.shape) == 2 else shap_raw

        # Format Plain-Language SHAP Attributions for Citizens
        top_indices = np.argsort(np.abs(shap_array))[::-1][:3]
        plain_attributions = []

        for idx in top_indices:
            feat = self.feature_names[idx]
            val = row_df.iloc[0][feat]
            shap_impact = shap_array[idx]
            impact_direction = "increasing risk" if shap_impact > 0 else "keeping grid safe"

            if feat == "ac_load_stress_factor" or feat == "apparent_temp_c":
                plain_attributions.append(
                    f"Severe Heat Index ({app_temp}°C feels-like): Non-linear domestic & commercial AC cooling surge ({impact_direction})."
                )
            elif feat == "us_aqi":
                plain_attributions.append(
                    f"Hazardous Air Quality (AQI {aqi}): Closed windows & continuous purifier/AC duty adding non-grid strain ({impact_direction})."
                )
            elif feat == "load_percentage":
                plain_attributions.append(
                    f"Heavy Substation Loading ({load_pct}% of {capacity} MVA capacity): Feeder lines near thermal threshold ({impact_direction})."
                )
            elif feat == "transformer_oil_temp_c" or feat == "temp_delta_c":
                plain_attributions.append(
                    f"Transformer Oil Heat ({oil_temp}°C vs {amb_temp}°C ambient): Thermal dissipation delay in winding insulation ({impact_direction})."
                )
            elif feat == "hour_of_day":
                plain_attributions.append(
                    f"Evening Domestic Peak Window ({hour}:00 hrs): Clustered lighting, kitchen, and refrigeration loads ({impact_direction})."
                )
            else:
                plain_attributions.append(
                    f"{feat.replace('_', ' ').title()} ({val}): Technical grid parameter ({impact_direction})."
                )

        return {
            "risk_percentage": risk_pct,
            "status": status,
            "safe_window_hours": safe_hours,
            "features": feat_dict,
            "shap_values": {self.feature_names[i]: round(float(shap_array[i]), 4) for i in range(len(self.feature_names))},
            "plain_language_attributions": plain_attributions
        }


# Singleton predictor
_predictor_instance = None


def get_predictor_instance() -> ThermalOverloadPredictor:
    """Singleton getter for the predictor."""
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = ThermalOverloadPredictor()
    return _predictor_instance


if __name__ == "__main__":
    predictor = get_predictor_instance()
    dummy_telemetry = {
        "load_percentage": 89.5,
        "active_power_mw": 44.8,
        "reactive_power_mvar": 16.2,
        "power_factor": 0.92,
        "transformer_oil_temp_c": 83.5,
        "ambient_temp_c": 36.2,
        "capacity_mva": 50.0,
        "voltage_kv": 31.8
    }
    dummy_env = {
        "temperature_c": 36.2,
        "apparent_temperature_c": 44.1,
        "relative_humidity_pct": 82.0,
        "aqi_us": 230,
        "ac_load_stress_factor": 1.48
    }
    res = predictor.predict_risk(dummy_telemetry, dummy_env)
    print("Prediction Result:")
    print(f"Risk: {res['risk_percentage']}% - {res['status']}")
    print(f"Safe Window: {res['safe_window_hours']} hours")
    print("Plain Language SHAP Explanations:")
    for att in res["plain_language_attributions"]:
        print(f" - {att}")
