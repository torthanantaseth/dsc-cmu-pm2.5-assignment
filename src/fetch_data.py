"""
fetch_data.py — downloads every raw input and writes data/raw/ + data/processed/.

Run:  python src/fetch_data.py

Design notes that the report needs:

1. Raw responses are written to data/raw/ EXACTLY as the API returned them,
   before any parsing. Re-running with OVERWRITE=False reuses them, so the
   pipeline is reproducible from a clean clone.

2. Every call is recorded in data/processed/fetch_log.csv with the endpoint,
   parameters, date range, row count, retrieval timestamp and status. This is
   the evidence for Part A "record what you fetched".

3. The GRID COORDINATES that Open-Meteo returns are logged alongside the
   coordinates requested. Open-Meteo snaps a request to the nearest model grid
   cell, so this is the direct evidence for checkpoint C4: if two locations log
   the same grid_lat/grid_lon, they are the same cell and cannot be compared.

4. Air4Thai serves an incomplete certificate chain, so verify=False is required.
   It returns current readings only (no history endpoint), which is why re-running
   this script on a different day produces a different air4thai file. That is the
   answer to Part A "if running it twice produces different files, say why".
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import requests
import urllib3

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import (  # noqa: E402
    AIR4THAI_ENDPOINT, AIR_ENDPOINT, AIR_VARS, ARCHIVE_ENDPOINT,
    END_DATE, FIRMS_BBOX, FIRMS_ENDPOINT, FIRMS_KEY_FILE,
    FETCH_LOCATIONS, FORECAST_ARCHIVE_ENDPOINT, FORECAST_VARS, OVERWRITE,
    PROCESSED, RAW, START_DATE, TZ, WEATHER_VARS,
)

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

FETCH_RECORDS: list[dict] = []


def log_fetch(**kwargs) -> None:
    FETCH_RECORDS.append(kwargs)


def save_fetch_log() -> pd.DataFrame:
    df = pd.DataFrame(FETCH_RECORDS)
    out = PROCESSED / "fetch_log.csv"
    df.to_csv(out, index=False)
    print(f"  -> fetch log: {out}  ({len(df)} calls)")
    return df


# ---------------------------------------------------------------------------
# Open-Meteo family (air quality, ERA5 archive, historical forecast)
# ---------------------------------------------------------------------------

def _get_json(endpoint: str, params: dict, raw_path, retries: int = 3) -> tuple[dict, str, bool]:
    """Return (payload, retrieved_at_iso, from_cache)."""
    if raw_path.exists() and not OVERWRITE:
        text = raw_path.read_text(encoding="utf-8")
        stamp = datetime.fromtimestamp(raw_path.stat().st_mtime).isoformat(timespec="seconds")
        return json.loads(text), stamp, True

    last_err = None
    for attempt in range(retries):
        try:
            resp = requests.get(endpoint, params=params, timeout=120)
            resp.raise_for_status()
            raw_path.write_text(resp.text, encoding="utf-8")
            stamp = datetime.now().isoformat(timespec="seconds")
            return resp.json(), stamp, False
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"failed after {retries} attempts: {last_err}")


def fetch_openmeteo(source_name: str, endpoint: str, hourly_vars: str,
                    file_prefix: str, locations: dict) -> pd.DataFrame:
    """
    Fetch one Open-Meteo product for every location, one calendar year per call.

    Splitting by year keeps each raw file small enough to inspect by hand and
    makes a partial failure recoverable without re-downloading everything.
    """
    frames = []
    var_list = hourly_vars.split(",")
    y0, y1 = pd.to_datetime(START_DATE).year, pd.to_datetime(END_DATE).year

    for loc_name, loc in locations.items():
        for year in range(y0, y1 + 1):
            y_start = START_DATE if year == y0 else f"{year}-01-01"
            y_end = END_DATE if year == y1 else f"{year}-12-31"
            if y_start > y_end:
                continue

            fetch_id = f"{file_prefix}_{loc_name}_{y_start}_{y_end}"
            raw_path = RAW / f"{fetch_id}.json"
            params = {
                "latitude": loc["lat"],
                "longitude": loc["lon"],
                "hourly": hourly_vars,
                "start_date": y_start,
                "end_date": y_end,
                "timezone": TZ,
            }

            status, rows, cached = "success", 0, False
            grid_lat = grid_lon = elevation = np.nan
            frame = pd.DataFrame()
            try:
                payload, stamp, cached = _get_json(endpoint, params, raw_path)

                # Grid coordinates the API actually served -- the C4 evidence.
                grid_lat = payload.get("latitude", np.nan)
                grid_lon = payload.get("longitude", np.nan)
                elevation = payload.get("elevation", np.nan)

                hourly = payload.get("hourly", {})
                frame = pd.DataFrame({"time": pd.to_datetime(hourly.get("time", []))})
                for v in var_list:
                    frame[v] = hourly.get(v, [np.nan] * len(frame))
                frame.insert(0, "location", loc_name)
                frame["grid_lat"] = grid_lat
                frame["grid_lon"] = grid_lon
                rows = len(frame)
                frames.append(frame)
            except Exception as exc:  # noqa: BLE001
                status = f"error: {exc}"
                stamp = datetime.now().isoformat(timespec="seconds")

            log_fetch(
                fetch_id=fetch_id, source_name=source_name, endpoint_url=endpoint,
                location=loc_name, req_lat=loc["lat"], req_lon=loc["lon"],
                grid_lat=grid_lat, grid_lon=grid_lon, elevation_m=elevation,
                variables=hourly_vars, start_date=y_start, end_date=y_end,
                timezone=TZ, rows_returned=rows, retrieved_at=stamp,
                from_cache=cached, status=status, raw_file=raw_path.name,
            )
            print(f"    {fetch_id}: {rows} rows  grid=({grid_lat},{grid_lon})  {'[cached]' if cached else ''}{'' if status=='success' else status}")

    if not frames:
        return pd.DataFrame()

    out = pd.concat(frames, ignore_index=True).sort_values(["location", "time"])
    out = out.drop_duplicates(subset=["location", "time"], keep="last").reset_index(drop=True)
    path = PROCESSED / f"{file_prefix}_hourly.csv"
    out.to_csv(path, index=False)
    print(f"  -> {path}  shape={out.shape}")
    return out


# ---------------------------------------------------------------------------
# Air4Thai
# ---------------------------------------------------------------------------

def _find_records(obj):
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        lists = [v for v in obj.values() if isinstance(v, list)]
        if lists:
            return max(lists, key=len)
        if obj and all(isinstance(v, dict) for v in obj.values()):
            return [{"record_key": k, **v} for k, v in obj.items()]
    return []


def _to_number(series: pd.Series) -> pd.Series:
    """
    Air4Thai returns every value as a string and encodes MISSING AS -1, not null.
    Averaging without this conversion produces a number that is quietly wrong.
    """
    s = pd.to_numeric(series, errors="coerce")
    return s.mask(s <= -1)


def fetch_air4thai() -> tuple[pd.DataFrame, pd.DataFrame]:
    raw_path = RAW / "air4thai_current.json"
    status, rows, cached = "success", 0, False
    flat = clean = pd.DataFrame()

    try:
        if raw_path.exists() and not OVERWRITE:
            text = raw_path.read_text(encoding="utf-8")
            stamp = datetime.fromtimestamp(raw_path.stat().st_mtime).isoformat(timespec="seconds")
            cached = True
        else:
            # verify=False: air4thai.pcd.go.th serves an incomplete certificate chain.
            resp = requests.get(AIR4THAI_ENDPOINT, timeout=60, verify=False)
            resp.raise_for_status()
            text = resp.text
            raw_path.write_text(text, encoding="utf-8")
            stamp = datetime.now().isoformat(timespec="seconds")

        payload = json.loads(text)
        flat = pd.json_normalize(_find_records(payload))
        flat.to_csv(PROCESSED / "air4thai_current_flat.csv", index=False)

        clean = pd.DataFrame({
            "station_id": flat.get("stationID", pd.Series(dtype=str)),
            "station_name_th": flat.get("nameTH", pd.Series(dtype=str)),
            "station_name_en": flat.get("nameEN", pd.Series(dtype=str)),
            "area_th": flat.get("areaTH", pd.Series(dtype=str)),
            "latitude": _to_number(flat.get("lat", pd.Series(dtype=str))),
            "longitude": _to_number(flat.get("long", pd.Series(dtype=str))),
            "reading_date": flat.get("AQILast.date", pd.Series(dtype=str)),
            "reading_time": flat.get("AQILast.time", pd.Series(dtype=str)),
            "pm25_ugm3": _to_number(flat.get("AQILast.PM25.value", pd.Series(dtype=str))),
            "pm25_aqi": _to_number(flat.get("AQILast.PM25.aqi", pd.Series(dtype=str))),
            "pm10_ugm3": _to_number(flat.get("AQILast.PM10.value", pd.Series(dtype=str))),
            "aqi": _to_number(flat.get("AQILast.AQI.aqi", pd.Series(dtype=str))),
        })
        area = clean["area_th"].fillna("")
        clean["is_chiang_mai"] = area.str.contains("เชียงใหม่")
        clean["is_northern"] = area.str.contains(
            "เชียงใหม่|เชียงราย|ลำปาง|ลำพูน|แม่ฮ่องสอน|น่าน|แพร่|พะเยา|ตาก|อุตรดิตถ์"
        )
        clean["retrieved_at"] = stamp
        clean.to_csv(PROCESSED / "air4thai_current_clean.csv", index=False)
        rows = len(flat)

    except Exception as exc:  # noqa: BLE001
        status = f"error: {exc}"
        stamp = datetime.now().isoformat(timespec="seconds")

    log_fetch(
        fetch_id="air4thai_current", source_name="Air4Thai (PCD ground stations)",
        endpoint_url=AIR4THAI_ENDPOINT, location="all_thailand_stations",
        req_lat=None, req_lon=None, grid_lat=None, grid_lon=None, elevation_m=None,
        variables="all stations, current reading only", start_date=None, end_date=None,
        timezone=TZ, rows_returned=rows, retrieved_at=stamp, from_cache=cached,
        status=status, raw_file=raw_path.name,
    )
    print(f"    air4thai_current: {rows} stations  {'[cached]' if cached else ''}{'' if status=='success' else status}")
    return flat, clean


# ---------------------------------------------------------------------------
# NASA FIRMS hotspots
# ---------------------------------------------------------------------------

def _firms_key() -> str | None:
    key = os.environ.get("FIRMS_MAP_KEY")
    if key:
        return key.strip()
    if FIRMS_KEY_FILE.exists():
        return FIRMS_KEY_FILE.read_text(encoding="utf-8").strip()
    return None


def fetch_firms(source: str = "VIIRS_SNPP_SP", day_chunk: int = 10) -> pd.DataFrame:
    """
    Walk backwards through the FIRMS archive in <=10-day windows.

    DAY_RANGE is capped at 10 by the API. Use the _SP (Standard Processing)
    sources for historical dates; the _NRT sources only cover recent months.

    NOTE for the report: FIRMS near-real-time products have a detection latency
    of roughly 3 hours, and standard-processing products are published with a
    delay of weeks. A hotspot feature for day t is knowable on day t only if the
    NRT product is used operationally. State which one you used.
    """
    key = _firms_key()
    if not key:
        print("    FIRMS: no MAP_KEY found -- skipping. "
              "Put it in firms_key.txt or set FIRMS_MAP_KEY.")
        log_fetch(fetch_id="firms", source_name="NASA FIRMS", endpoint_url=FIRMS_ENDPOINT,
                  location="northern_thailand_bbox", req_lat=None, req_lon=None,
                  grid_lat=None, grid_lon=None, elevation_m=None, variables=source,
                  start_date=START_DATE, end_date=END_DATE, timezone="UTC",
                  rows_returned=0, retrieved_at=datetime.now().isoformat(timespec="seconds"),
                  from_cache=False, status="skipped: no MAP_KEY", raw_file=None)
        return pd.DataFrame()

    start = pd.to_datetime(START_DATE)
    end = pd.to_datetime(END_DATE)
    frames, calls, errors = [], 0, 0
    cursor = start

    while cursor <= end:
        span = min(day_chunk, (end - cursor).days + 1)
        tag = cursor.strftime("%Y-%m-%d")
        raw_path = RAW / f"firms_{source}_{tag}_{span}d.csv"
        try:
            if raw_path.exists() and not OVERWRITE:
                text = raw_path.read_text(encoding="utf-8")
            else:
                url = f"{FIRMS_ENDPOINT}/{key}/{source}/{FIRMS_BBOX}/{span}/{tag}"
                resp = requests.get(url, timeout=120)
                resp.raise_for_status()
                text = resp.text
                raw_path.write_text(text, encoding="utf-8")
                time.sleep(0.4)  # stay well inside 5000 requests / 10 min
            if text.strip() and "," in text.splitlines()[0]:
                from io import StringIO
                frames.append(pd.read_csv(StringIO(text)))
            calls += 1
        except Exception as exc:  # noqa: BLE001
            errors += 1
            print(f"    FIRMS {tag}: {exc}")
        cursor += pd.Timedelta(days=span)

    out = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
    if not out.empty:
        out.to_csv(PROCESSED / "firms_hotspots.csv", index=False)

    log_fetch(
        fetch_id="firms", source_name=f"NASA FIRMS {source}", endpoint_url=FIRMS_ENDPOINT,
        location="northern_thailand_bbox", req_lat=None, req_lon=None,
        grid_lat=None, grid_lon=None, elevation_m=None,
        variables=f"{source}; bbox={FIRMS_BBOX}", start_date=START_DATE, end_date=END_DATE,
        timezone="UTC", rows_returned=len(out),
        retrieved_at=datetime.now().isoformat(timespec="seconds"),
        from_cache=False, status=f"success ({calls} calls, {errors} errors)",
        raw_file=f"firms_{source}_*.csv",
    )
    print(f"  -> firms_hotspots.csv  rows={len(out)}  calls={calls}  errors={errors}")
    return out


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 72)
    print(f"FETCH  {START_DATE} .. {END_DATE}   tz={TZ}   overwrite={OVERWRITE}")
    print(f"locations: {', '.join(FETCH_LOCATIONS)}")
    print("(set FETCH_LOCATIONS in config.py to change this)")
    print("=" * 72)

    print("\n[1/5] Open-Meteo Air Quality (CAMS -- MODEL OUTPUT, not measured)")
    fetch_openmeteo("Open-Meteo Air Quality (CAMS)", AIR_ENDPOINT, AIR_VARS,
                    "openmeteo_air", FETCH_LOCATIONS)

    print("\n[2/5] Open-Meteo Archive weather (ERA5 reanalysis)")
    fetch_openmeteo("Open-Meteo Archive (ERA5)", ARCHIVE_ENDPOINT, WEATHER_VARS,
                    "openmeteo_weather", FETCH_LOCATIONS)

    print("\n[3/5] Open-Meteo Historical FORECAST (what was predicted ahead of time)")
    print("      Used for leakage-free next-day features. Archive starts ~2021.")
    fetch_openmeteo("Open-Meteo Historical Forecast", FORECAST_ARCHIVE_ENDPOINT,
                    FORECAST_VARS, "openmeteo_forecast", FETCH_LOCATIONS)

    print("\n[4/5] Air4Thai (measured ground stations, current reading only)")
    fetch_air4thai()

    print("\n[5/5] NASA FIRMS hotspots")
    fetch_firms()

    print("\n" + "=" * 72)
    save_fetch_log()
    print("Done. Raw responses in data/raw/, parsed tables in data/processed/.")


if __name__ == "__main__":
    main()
