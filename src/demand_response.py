"""
Automated Pre-Emptive Demand Response (DR) Engine
Triggers before forced load shedding occurs.
Simulates sending automated SMS messages offering micro-discounts to high-consumption
users who voluntarily reduce their load for 2 hours.
"""

import math
import random
import logging
import datetime
from typing import List, Dict, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Simulated consumer registry across key Pincodes
CONSUMER_NAMES = [
    "Anirban Mukherjee", "Debjani Roy", "Subrata Ghosh", "Tanushree Das",
    "Sourav Ganguly", "Kakali Bhattacharya", "Bikramjit Sen", "Rupa Chakraborty",
    "Prabir Banerjee", "Aparna Dutta", "Surajit Samanta", "Mousumi Mondal",
    "Kallol Majumdar", "Poulomi Chatterjee", "Subhashis Paul", "Madhurima Bose"
]


class DemandResponseEngine:
    """
    Automated Demand Response orchestrator calculating required load reduction,
    selecting high-consumption tier users, dispatching SMS offers, and computing grid relief.
    """

    def __init__(self):
        self.dispatch_history: List[Dict[str, Any]] = []

    def calculate_dr_trigger(self, telemetry: Dict[str, Any], risk_percentage: float) -> Dict[str, Any]:
        """
        Evaluate whether pre-emptive Demand Response is required to avert forced tripping.
        Safety threshold: Trigger DR if predicted risk > 65% or current load > 80%.
        """
        load_pct = telemetry.get("load_percentage", 70.0)
        capacity_mva = telemetry.get("capacity_mva", 50.0)
        active_mw = telemetry.get("active_power_mw", 35.0)
        pincode = telemetry.get("pincode", "700117")
        area = telemetry.get("area", "Khardaha")
        substation_name = telemetry.get("substation_name", "Khardaha Substation")

        trigger_needed = (risk_percentage >= 65.0) or (load_pct >= 82.0)

        # Target: bring substation loading down to 74%
        target_load_pct = 74.0
        if load_pct > target_load_pct:
            excess_pct = load_pct - target_load_pct
            required_mw_reduction = round((excess_pct / 100.0) * capacity_mva * 0.92, 2)
        else:
            required_mw_reduction = round(0.08 * capacity_mva, 2) if trigger_needed else 0.0

        return {
            "trigger_needed": trigger_needed,
            "substation_id": telemetry.get("substation_id"),
            "substation_name": substation_name,
            "pincode": pincode,
            "area": area,
            "current_load_pct": load_pct,
            "current_active_mw": active_mw,
            "risk_percentage": risk_percentage,
            "required_mw_reduction": required_mw_reduction,
            "status": "ACTION REQUIRED: DISPATCH DR" if trigger_needed else "GRID BALANCED"
        }

    def execute_automated_dr_dispatch(
        self,
        substation_info: Dict[str, Any],
        required_mw: float,
        micro_discount_rate_inr: float = 7.50,
        duration_hours: int = 2
    ) -> Dict[str, Any]:
        """
        Simulate automated SMS dispatch to high-consumption domestic & commercial consumers.
        Calculates opt-in rates, total load shaved, financial rewards, and blackout prevention.
        """
        pincode = substation_info.get("pincode", "700117")
        area = substation_info.get("area", "Khardaha")
        substation_name = substation_info.get("substation_name", "Khardaha SS")

        # Estimate number of high-consumption users needed
        # Each domestic AC user shaves ~1.8 kW (raising thermostat to 26°C or turning off 1 AC)
        # Commercial / MSME users shave ~8.5 kW (mix yields ~2.4 kW average across pool)
        avg_kw_per_user = 2.45
        users_needed = int(math.ceil((required_mw * 1000) / avg_kw_per_user))
        pool_size = max(120, int(users_needed * 1.65))

        # Generate realistic simulated SMS records
        sms_logs = []
        total_shaved_kw = 0.0
        accepted_count = 0

        # Deterministic simulation sample for UI inspection (first 10 records)
        sample_recipients = []
        for i in range(min(12, pool_size)):
            name = CONSUMER_NAMES[i % len(CONSUMER_NAMES)]
            mobile_suffix = str(random.randint(1000, 9999))
            mobile = f"+91 9830{pincode[:2]} {mobile_suffix}"
            user_type = "Commercial / MSME" if i % 4 == 0 else "Residential (2+ ACs)"
            expected_reduction_kw = round(random.uniform(5.0, 12.0) if "Commercial" in user_type else random.uniform(1.2, 2.5), 1)

            # Historical response rate ~60-70% for ₹7.50/kWh discount
            opted_in = random.random() < 0.68
            status = "OPTED-IN (DISCOUNT APPLIED)" if opted_in else "NO RESPONSE"

            rebate_earned = round(expected_reduction_kw * duration_hours * micro_discount_rate_inr, 1) if opted_in else 0.0

            sms_text = (
                f"WBSEDCL Smart Grid Alert: Critical transformer stress in {area} ({pincode}). "
                f"Reduce ~{expected_reduction_kw} kW for {duration_hours} hrs to earn ₹{micro_discount_rate_inr}/kWh "
                f"(est. ₹{rebate_earned} bill credit). Reply YES to confirm."
            )

            rec = {
                "consumer_name": name,
                "mobile": mobile,
                "tier": user_type,
                "target_reduction_kw": expected_reduction_kw,
                "opted_in": opted_in,
                "status": status,
                "estimated_bill_discount_inr": rebate_earned,
                "sms_content": sms_text,
                "timestamp": datetime.datetime.now().strftime("%H:%M:%S")
            }
            sample_recipients.append(rec)

        # Statistical aggregation for total simulated pool
        simulated_accept_rate = random.uniform(0.62, 0.74)
        accepted_count = int(pool_size * simulated_accept_rate)
        total_shaved_mw = round((accepted_count * avg_kw_per_user) / 1000.0, 2)

        # Check if required load shed was averted
        blackout_averted = total_shaved_mw >= (required_mw * 0.88)
        total_financial_incentive_inr = round(total_shaved_mw * 1000 * duration_hours * micro_discount_rate_inr, 2)

        dispatch_result = {
            "dispatch_id": f"DR-WB-{pincode}-{datetime.datetime.now().strftime('%H%M%S')}",
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "substation_name": substation_name,
            "pincode": pincode,
            "area": area,
            "required_mw_reduction": required_mw,
            "duration_hours": duration_hours,
            "micro_discount_rate_inr": micro_discount_rate_inr,
            "target_consumers_notified": pool_size,
            "confirmed_participants": accepted_count,
            "acceptance_rate_pct": round(simulated_accept_rate * 100, 1),
            "achieved_mw_reduction": total_shaved_mw,
            "blackout_averted": blackout_averted,
            "total_incentive_payout_inr": total_financial_incentive_inr,
            "sample_sms_logs": sample_recipients
        }

        self.dispatch_history.insert(0, dispatch_result)
        logger.info(
            "Executed DR Dispatch in %s: Required %.2f MW, Shaved %.2f MW, Blackout Averted: %s",
            area, required_mw, total_shaved_mw, blackout_averted
        )
        return dispatch_result

    def get_dispatch_history(self) -> List[Dict[str, Any]]:
        return self.dispatch_history


# Singleton engine
_dr_engine_instance = None


def get_dr_engine() -> DemandResponseEngine:
    global _dr_engine_instance
    if _dr_engine_instance is None:
        _dr_engine_instance = DemandResponseEngine()
    return _dr_engine_instance


if __name__ == "__main__":
    engine = get_dr_engine()
    dummy_substation = {
        "substation_id": "WB_SS_01",
        "substation_name": "Khardaha 33/11kV Substation",
        "pincode": "700117",
        "area": "Khardaha",
        "capacity_mva": 50.0,
        "active_power_mw": 43.5,
        "load_percentage": 87.0
    }
    trigger_status = engine.calculate_dr_trigger(dummy_substation, risk_percentage=82.5)
    print("Trigger Status:", trigger_status)
    res = engine.execute_automated_dr_dispatch(dummy_substation, required_mw=trigger_status["required_mw_reduction"])
    print(f"Dispatched SMS to {res['target_consumers_notified']} users. Achieved {res['achieved_mw_reduction']} MW reduction.")
    print(f"Blackout Averted: {res['blackout_averted']}")
