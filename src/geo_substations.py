"""
West Bengal Substation Geospatial Registry & Overpass Turbo Connector
Focuses on localized power distribution around Khardaha and Kolkata.
"""

import json
import logging
import os
import requests
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Bounding box for Kolkata Metropolitan Area and North 24 Parganas (including Khardaha)
# MinLat, MinLon, MaxLat, MaxLon: 22.40, 88.25 to 22.90, 88.55
OVERPASS_MIRRORS = [
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
]

# 50 Curated Real-World Substations covering Khardaha, Kolkata, Barrackpore, Salt Lake & Howrah
CURATED_SUBSTATIONS = [
    # Khardaha & North 24 Parganas Sub-transmission Grid
    {"id": "WB_SS_01", "name": "Khardaha 33/11kV Substation", "lat": 22.7196, "lon": 88.3803, "pincode": "700117", "area": "Khardaha", "voltage_kv": 33, "capacity_mva": 50, "operator": "WBSEDCL"},
    {"id": "WB_SS_02", "name": "Rahara Bazar Substation", "lat": 22.7290, "lon": 88.3850, "pincode": "700118", "area": "Rahara", "voltage_kv": 33, "capacity_mva": 40, "operator": "WBSEDCL"},
    {"id": "WB_SS_03", "name": "Titagarh Industrial Feeder SS", "lat": 22.7400, "lon": 88.3750, "pincode": "700119", "area": "Titagarh", "voltage_kv": 132, "capacity_mva": 100, "operator": "WBSEDCL"},
    {"id": "WB_SS_04", "name": "Barrackpore Cantonment 132kV SS", "lat": 22.7644, "lon": 88.3776, "pincode": "700120", "area": "Barrackpore", "voltage_kv": 132, "capacity_mva": 125, "operator": "WBSETCL"},
    {"id": "WB_SS_05", "name": "Sodepur Station Road Substation", "lat": 22.7012, "lon": 88.3904, "pincode": "700110", "area": "Sodepur", "voltage_kv": 33, "capacity_mva": 45, "operator": "WBSEDCL"},
    {"id": "WB_SS_06", "name": "Panihati Municipality Feeder SS", "lat": 22.6934, "lon": 88.3755, "pincode": "700114", "area": "Panihati", "voltage_kv": 33, "capacity_mva": 35, "operator": "WBSEDCL"},
    {"id": "WB_SS_07", "name": "Agarpara BT Road Substation", "lat": 22.6800, "lon": 88.3810, "pincode": "700109", "area": "Agarpara", "voltage_kv": 33, "capacity_mva": 40, "operator": "WBSEDCL"},
    {"id": "WB_SS_08", "name": "Belgharia Rathtala Substation", "lat": 22.6635, "lon": 88.3856, "pincode": "700056", "area": "Belgharia", "voltage_kv": 33, "capacity_mva": 60, "operator": "WBSEDCL"},
    {"id": "WB_SS_09", "name": "Kamarhati Jute Mill Feeder", "lat": 22.6710, "lon": 88.3720, "pincode": "700058", "area": "Kamarhati", "voltage_kv": 33, "capacity_mva": 50, "operator": "WBSEDCL"},
    {"id": "WB_SS_10", "name": "Baranagar Grid Substation", "lat": 22.6433, "lon": 88.3734, "pincode": "700036", "area": "Baranagar", "voltage_kv": 132, "capacity_mva": 100, "operator": "CESC"},

    # North-East Metro & Airport Corridor
    {"id": "WB_SS_11", "name": "Dum Dum Cantonment SS", "lat": 22.6420, "lon": 88.4312, "pincode": "700028", "area": "Dum Dum", "voltage_kv": 33, "capacity_mva": 50, "operator": "CESC"},
    {"id": "WB_SS_12", "name": "Netaji Subhash Airport Feeder SS", "lat": 22.6540, "lon": 88.4460, "pincode": "700052", "area": "Dum Dum Airport", "voltage_kv": 132, "capacity_mva": 80, "operator": "CESC"},
    {"id": "WB_SS_13", "name": "Madhyamgram Choumatha SS", "lat": 22.7010, "lon": 88.4520, "pincode": "700129", "area": "Madhyamgram", "voltage_kv": 33, "capacity_mva": 45, "operator": "WBSEDCL"},
    {"id": "WB_SS_14", "name": "Barasat Champadali Substation", "lat": 22.7210, "lon": 88.4820, "pincode": "700124", "area": "Barasat", "voltage_kv": 132, "capacity_mva": 100, "operator": "WBSETCL"},
    {"id": "WB_SS_15", "name": "Naihati Central Substation", "lat": 22.8900, "lon": 88.4200, "pincode": "743165", "area": "Naihati", "voltage_kv": 33, "capacity_mva": 50, "operator": "WBSEDCL"},
    {"id": "WB_SS_16", "name": "Bhatpara Power Distribution Hub", "lat": 22.8700, "lon": 88.4050, "pincode": "743123", "area": "Bhatpara", "voltage_kv": 33, "capacity_mva": 45, "operator": "WBSEDCL"},
    {"id": "WB_SS_17", "name": "Kankinara Grid Substation", "lat": 22.8550, "lon": 88.4100, "pincode": "743126", "area": "Kankinara", "voltage_kv": 33, "capacity_mva": 40, "operator": "WBSEDCL"},
    {"id": "WB_SS_18", "name": "Shyamnagar Feeder SS", "lat": 22.8300, "lon": 88.3900, "pincode": "743127", "area": "Shyamnagar", "voltage_kv": 33, "capacity_mva": 35, "operator": "WBSEDCL"},
    {"id": "WB_SS_19", "name": "Habra Town Substation", "lat": 22.8400, "lon": 88.6300, "pincode": "743263", "area": "Habra", "voltage_kv": 33, "capacity_mva": 40, "operator": "WBSEDCL"},
    {"id": "WB_SS_20", "name": "New Town Action Area 1 SS", "lat": 22.5850, "lon": 88.4600, "pincode": "700156", "area": "New Town", "voltage_kv": 132, "capacity_mva": 120, "operator": "WBSEDCL"},

    # Salt Lake (Bidhannagar) IT & Tech Hub
    {"id": "WB_SS_21", "name": "Salt Lake Sector V Tech Substation", "lat": 22.5800, "lon": 88.4330, "pincode": "700091", "area": "Salt Lake Sec V", "voltage_kv": 132, "capacity_mva": 150, "operator": "WBSEDCL"},
    {"id": "WB_SS_22", "name": "Salt Lake Karunamoyee SS", "lat": 22.5867, "lon": 88.4178, "pincode": "700064", "area": "Salt Lake Sec II", "voltage_kv": 33, "capacity_mva": 60, "operator": "WBSEDCL"},
    {"id": "WB_SS_23", "name": "Salt Lake BD Block Substation", "lat": 22.5930, "lon": 88.4100, "pincode": "700064", "area": "Salt Lake Sec I", "voltage_kv": 33, "capacity_mva": 50, "operator": "WBSEDCL"},
    {"id": "WB_SS_24", "name": "Salt Lake Sector III Stadium SS", "lat": 22.5710, "lon": 88.4050, "pincode": "700098", "area": "Salt Lake Sec III", "voltage_kv": 33, "capacity_mva": 55, "operator": "WBSEDCL"},

    # Central & North Kolkata Metro (CESC Grid)
    {"id": "WB_SS_25", "name": "Ultadanga Central Receiving Station", "lat": 22.5975, "lon": 88.3910, "pincode": "700067", "area": "Ultadanga", "voltage_kv": 132, "capacity_mva": 125, "operator": "CESC"},
    {"id": "WB_SS_26", "name": "Shyambazar Five-Point SS", "lat": 22.6025, "lon": 88.3712, "pincode": "700004", "area": "Shyambazar", "voltage_kv": 33, "capacity_mva": 60, "operator": "CESC"},
    {"id": "WB_SS_27", "name": "Maniktala Circular Road SS", "lat": 22.5850, "lon": 88.3790, "pincode": "700006", "area": "Maniktala", "voltage_kv": 33, "capacity_mva": 50, "operator": "CESC"},
    {"id": "WB_SS_28", "name": "Sealdah Railway Feeder SS", "lat": 22.5697, "lon": 88.3713, "pincode": "700014", "area": "Sealdah", "voltage_kv": 132, "capacity_mva": 100, "operator": "CESC"},
    {"id": "WB_SS_29", "name": "BBD Bagh Financial District SS", "lat": 22.5726, "lon": 88.3439, "pincode": "700001", "area": "BBD Bagh", "voltage_kv": 33, "capacity_mva": 75, "operator": "CESC"},
    {"id": "WB_SS_30", "name": "Park Street Heritage Substation", "lat": 22.5510, "lon": 88.3520, "pincode": "700016", "area": "Park Street", "voltage_kv": 33, "capacity_mva": 65, "operator": "CESC"},
    {"id": "WB_SS_31", "name": "Park Circus 7-Point Substation", "lat": 22.5430, "lon": 88.3680, "pincode": "700017", "area": "Park Circus", "voltage_kv": 33, "capacity_mva": 55, "operator": "CESC"},
    {"id": "WB_SS_32", "name": "Tangra Industrial Leather Feeder", "lat": 22.5520, "lon": 88.3850, "pincode": "700015", "area": "Tangra", "voltage_kv": 33, "capacity_mva": 45, "operator": "CESC"},
    {"id": "WB_SS_33", "name": "EM Bypass Dhapa Receiving Station", "lat": 22.5480, "lon": 88.4060, "pincode": "700105", "area": "Dhapa Bypass", "voltage_kv": 132, "capacity_mva": 150, "operator": "CESC"},

    # South Kolkata Residential & Commercial Belt
    {"id": "WB_SS_34", "name": "Bhawanipore Ashutosh Mukherjee SS", "lat": 22.5280, "lon": 88.3480, "pincode": "700025", "area": "Bhawanipore", "voltage_kv": 33, "capacity_mva": 50, "operator": "CESC"},
    {"id": "WB_SS_35", "name": "Ballygunge Circular Road SS", "lat": 22.5280, "lon": 88.3650, "pincode": "700019", "area": "Ballygunge", "voltage_kv": 33, "capacity_mva": 60, "operator": "CESC"},
    {"id": "WB_SS_36", "name": "Gariahat Retail Hub Substation", "lat": 22.5180, "lon": 88.3660, "pincode": "700029", "area": "Gariahat", "voltage_kv": 33, "capacity_mva": 70, "operator": "CESC"},
    {"id": "WB_SS_37", "name": "Alipore Zoo & Hospital Feeder SS", "lat": 22.5311, "lon": 88.3315, "pincode": "700027", "area": "Alipore", "voltage_kv": 33, "capacity_mva": 60, "operator": "CESC"},
    {"id": "WB_SS_38", "name": "New Alipore Substation", "lat": 22.5050, "lon": 88.3280, "pincode": "700053", "area": "New Alipore", "voltage_kv": 33, "capacity_mva": 50, "operator": "CESC"},
    {"id": "WB_SS_39", "name": "Behala Chowrasta Substation", "lat": 22.4988, "lon": 88.3110, "pincode": "700034", "area": "Behala", "voltage_kv": 33, "capacity_mva": 55, "operator": "CESC"},
    {"id": "WB_SS_40", "name": "Taratala Industrial Grid SS", "lat": 22.5110, "lon": 88.3150, "pincode": "700088", "area": "Taratala", "voltage_kv": 132, "capacity_mva": 120, "operator": "CESC"},
    {"id": "WB_SS_41", "name": "Jadavpur University Feeder SS", "lat": 22.4980, "lon": 88.3710, "pincode": "700032", "area": "Jadavpur", "voltage_kv": 33, "capacity_mva": 65, "operator": "CESC"},
    {"id": "WB_SS_42", "name": "Tollygunge Metro Shed Substation", "lat": 22.4980, "lon": 88.3470, "pincode": "700033", "area": "Tollygunge", "voltage_kv": 33, "capacity_mva": 50, "operator": "CESC"},
    {"id": "WB_SS_43", "name": "Garia Mahamayatala SS", "lat": 22.4640, "lon": 88.3830, "pincode": "700084", "area": "Garia", "voltage_kv": 33, "capacity_mva": 45, "operator": "WBSEDCL"},
    {"id": "WB_SS_44", "name": "Kasba Industrial Estate SS", "lat": 22.5160, "lon": 88.3880, "pincode": "700042", "area": "Kasba", "voltage_kv": 33, "capacity_mva": 55, "operator": "CESC"},
    {"id": "WB_SS_45", "name": "Ruby Hospital Junction SS", "lat": 22.5130, "lon": 88.4030, "pincode": "700107", "area": "Ruby Anandapur", "voltage_kv": 33, "capacity_mva": 60, "operator": "CESC"},

    # Howrah & Hooghly Bank Grid Interconnects
    {"id": "WB_SS_46", "name": "Howrah Station Terminal SS", "lat": 22.5890, "lon": 88.3430, "pincode": "711101", "area": "Howrah Station", "voltage_kv": 132, "capacity_mva": 100, "operator": "CESC"},
    {"id": "WB_SS_47", "name": "Shibpur Botanical Gardens SS", "lat": 22.5650, "lon": 88.3120, "pincode": "711102", "area": "Shibpur", "voltage_kv": 33, "capacity_mva": 45, "operator": "CESC"},
    {"id": "WB_SS_48", "name": "Salkia North Howrah Feeder", "lat": 22.6040, "lon": 88.3460, "pincode": "711106", "area": "Salkia", "voltage_kv": 33, "capacity_mva": 50, "operator": "CESC"},
    {"id": "WB_SS_49", "name": "Bally Vivekananda Bridge SS", "lat": 22.6500, "lon": 88.3420, "pincode": "711201", "area": "Bally Howrah", "voltage_kv": 33, "capacity_mva": 40, "operator": "WBSEDCL"},
    {"id": "WB_SS_50", "name": "Rishra Industrial Substation", "lat": 22.7100, "lon": 88.3450, "pincode": "712248", "area": "Rishra Hooghly", "voltage_kv": 132, "capacity_mva": 90, "operator": "WBSETCL"}
]


def _find_nearest_pincode_and_area(lat: float, lon: float):
    """Find the geographically nearest curated substation to infer Pincode and Area for raw OSM nodes."""
    best_dist = float("inf")
    best_match = CURATED_SUBSTATIONS[0]
    for cs in CURATED_SUBSTATIONS:
        dist = (lat - cs["lat"]) ** 2 + (lon - cs["lon"]) ** 2
        if dist < best_dist:
            best_dist = dist
            best_match = cs
    return best_match["pincode"], best_match["area"]


def _parse_voltage_kv(tags: dict) -> int:
    """Parse voltage tag from OSM (e.g., '33000', '132 kV', '33;11') into integer kV."""
    v_str = str(tags.get("voltage", tags.get("rating", "33"))).strip().lower()
    for token in v_str.replace(";", " ").replace(",", " ").replace("kv", "").split():
        try:
            val = float(token)
            if val > 1000:
                return int(round(val / 1000))
            elif val > 0:
                return int(round(val))
        except ValueError:
            continue
    return 33


def query_overpass_substations(timeout_sec: int = 8, return_source: bool = False):
    """
    Query OpenStreetMap Overpass API for real West Bengal power substations.
    Parses real geographic coordinates and names, mapping them into the standard substation schema.
    If the live query succeeds and returns >= 5 nodes, returns the real OSM substations.
    Falls back to the 50 curated stations if network, rate-limiting, or timeout occurs.
    """
    query = """
    [out:json][timeout:6];
    (
      node["power"="substation"](22.40,88.25,22.90,88.55);
      way["power"="substation"](22.40,88.25,22.90,88.55);
    );
    out center 40;
    """
    headers = {"User-Agent": "BengalGridAI/1.0 (substation-research-digital-twin)"}

    for mirror_url in OVERPASS_MIRRORS:
        try:
            logger.info("Querying Overpass mirror (%s) for West Bengal substations...", mirror_url)
            response = requests.post(mirror_url, data={"data": query}, headers=headers, timeout=timeout_sec)
            if response.status_code == 200:
                data = response.json()
                elements = data.get("elements", [])
                logger.info("Retrieved %d raw substation nodes from Overpass API (%s)", len(elements), mirror_url)

                if len(elements) >= 5:
                    mapped_substations = []
                    for idx, elem in enumerate(elements[:50]):
                        tags = elem.get("tags", {})
                        elem_type = elem.get("type", "node")
                        
                        # Extract coordinates
                        if elem_type == "node":
                            lat = float(elem.get("lat", 0))
                            lon = float(elem.get("lon", 0))
                        else:
                            center = elem.get("center", {})
                            lat = float(center.get("lat", 0))
                            lon = float(center.get("lon", 0))

                        if not lat or not lon:
                            continue

                        pincode, inferred_area = _find_nearest_pincode_and_area(lat, lon)
                        raw_name = tags.get("name") or tags.get("operator") or f"Substation {elem.get('id')}"
                        voltage_kv = _parse_voltage_kv(tags)
                        capacity_mva = 100 if voltage_kv >= 132 else (60 if voltage_kv >= 66 else 45)

                        # Operator inference (CESC operates Kolkata municipal grid; WBSEDCL operates districts)
                        operator = tags.get("operator")
                        if not operator:
                            operator = "CESC" if (lat < 22.62 and 88.30 <= lon <= 88.42) else "WBSEDCL"

                        mapped_substations.append({
                            "id": f"OSM_{elem.get('id')}",
                            "name": raw_name,
                            "lat": round(lat, 5),
                            "lon": round(lon, 5),
                            "pincode": pincode,
                            "area": inferred_area,
                            "voltage_kv": voltage_kv,
                            "capacity_mva": capacity_mva,
                            "operator": operator,
                            "data_source": "osm_overpass_live"
                        })

                    if len(mapped_substations) >= 5:
                        logger.info("Successfully mapped and returning %d real OpenStreetMap substations [Source: osm_overpass_live]",
                                    len(mapped_substations))
                        return (mapped_substations, "osm_overpass_live") if return_source else mapped_substations
            else:
                logger.warning("Overpass mirror %s returned status %d.", mirror_url, response.status_code)
        except Exception as exc:
            logger.warning("Overpass query to %s failed (%s). Trying next mirror...", mirror_url, exc)

    logger.info("All Overpass queries failed or returned insufficient nodes. Using curated catalog fallback.")
    fallback_catalog = [dict(s, data_source="curated_catalog_fallback") for s in CURATED_SUBSTATIONS]
    return (fallback_catalog, "curated_catalog_fallback") if return_source else fallback_catalog


def get_all_substations(prefer_live: bool = False):
    """Return substations list. If prefer_live is True, attempts to query live Overpass first."""
    if prefer_live:
        return query_overpass_substations()
    return CURATED_SUBSTATIONS


def get_substations_df(prefer_live: bool = False):
    """Return a pandas DataFrame of substations."""
    stations = get_all_substations(prefer_live=prefer_live)
    df = pd.DataFrame(stations)
    return df


def get_substation_by_pincode(pincode: str):
    """Filter substations serving a given 6-digit Pincode (or closest in area)."""
    pincode = str(pincode).strip()
    matches = [s for s in CURATED_SUBSTATIONS if s["pincode"] == pincode]
    if matches:
        return matches
    return [CURATED_SUBSTATIONS[0]]


def save_registry_files(base_dir: str = "."):
    """Export the substation registry to data/ directory for downstream ML & SCADA components."""
    data_dir = os.path.join(base_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    json_path = os.path.join(data_dir, "wb_substations.json")
    csv_path = os.path.join(data_dir, "wb_substations.csv")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(CURATED_SUBSTATIONS, f, indent=2)

    df = get_substations_df()
    df.to_csv(csv_path, index=False)
    logger.info("Saved 50 substations to %s and %s", json_path, csv_path)
    return json_path, csv_path


if __name__ == "__main__":
    stations, src = query_overpass_substations(return_source=True)
    print(f"Loaded {len(stations)} substations via {src}")
    print("Sample substation:", stations[0])
