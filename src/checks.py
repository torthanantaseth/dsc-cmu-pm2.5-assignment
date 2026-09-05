"""
checks.py — the six checkpoints from Section 7 of the lab sheet, as runnable code.

Run:  python src/checks.py

Each function returns a dict of evidence and prints a paragraph you can paste
into the report. The point of every one of these is a place where code runs
perfectly and produces a wrong answer, so each check produces EVIDENCE, not an
assertion.

    C1  Time        daily averages really are Thailand local days
    C2  The join    row counts before and after, every row accounted for
    C3  Missing     percentage missing per column, and what 0.00% implies
    C4  Places      two locations genuinely return different data
    C5  Model       baseline and model on the same test set (see model.py)
    C6  Ground truth CAMS versus a measured Air4Thai station
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np
import pandas as pd
import requests
import urllib3

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import (  # noqa: E402
    AIR_ENDPOINT, AIR4THAI_ENDPOINT, LOCATIONS, MIN_HOURS_PER_DAY,
    PROCESSED, RESULTS, TZ,
)

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def _rule(title: str) -> None:
    print("\n" + "=" * 72)
    print(title)
    print("=" * 72)


# ---------------------------------------------------------------------------
# C1 - Time
# ---------------------------------------------------------------------------

def c1_time(lat: float = 18.7883, lon: float = 98.9853,
            date: str = "2024-03-15") -> dict:
    """
    Verify, do not assert, that the time axis is Asia/Bangkok local time.

    Method: request the SAME variable for the SAME day twice, once with
    timezone=UTC and once with timezone=Asia/Bangkok. If the axis is local, the
    identical concentration values appear shifted by exactly 7 hours. If the two
    responses were identical, the timezone parameter would be doing nothing and
    every "daily mean" in the project would be a UTC day mislabelled as a Thai one.
    """
    _rule("C1 - TIME")

    out = {}
    for tz in ("UTC", TZ):
        r = requests.get(AIR_ENDPOINT, params={
            "latitude": lat, "longitude": lon, "hourly": "pm2_5",
            "start_date": date, "end_date": date, "timezone": tz,
        }, timeout=60).json()
        out[tz] = pd.DataFrame({
            "time": pd.to_datetime(r["hourly"]["time"]),
            "pm2_5": r["hourly"]["pm2_5"],
        })
        print(f"  timezone={tz:<14s} utc_offset_seconds={r.get('utc_offset_seconds')}  "
              f"first={out[tz]['time'].iloc[0]}  value={out[tz]['pm2_5'].iloc[0]}")

    utc, local = out["UTC"], out[TZ]
    # The value at 00:00 UTC should reappear at 07:00 local on the same date.
    match = local.loc[local["time"].dt.hour == 7, "pm2_5"]
    shift_ok = bool(len(match)) and np.isclose(match.iloc[0], utc["pm2_5"].iloc[0])

    print(f"\n  value at 00:00 UTC        = {utc['pm2_5'].iloc[0]}")
    print(f"  value at 07:00 Asia/Bangkok = {match.iloc[0] if len(match) else 'n/a'}")
    print(f"  7-hour shift confirmed: {shift_ok}")

    # Both endpoints must agree, or the join pairs the wrong hours.
    air = PROCESSED / "openmeteo_air_hourly.csv"
    wx = PROCESSED / "openmeteo_weather_hourly.csv"
    axes_agree = None
    if air.exists() and wx.exists():
        a = pd.read_csv(air, parse_dates=["time"], usecols=["location", "time"])
        w = pd.read_csv(wx, parse_dates=["time"], usecols=["location", "time"])
        loc = a["location"].iloc[0]
        a1 = set(a.loc[a["location"] == loc, "time"])
        w1 = set(w.loc[w["location"] == loc, "time"])
        axes_agree = a1 == w1
        print(f"\n  air-quality and weather time axes identical for {loc}: {axes_agree}")
        print(f"    air only: {len(a1 - w1)} timestamps, weather only: {len(w1 - a1)}")

    res = {"shift_confirmed": shift_ok, "axes_agree": axes_agree}
    print(f"\n  VERDICT: {'PASS' if shift_ok else 'FAIL'} -- "
          f"the time axis is {'Thailand local time' if shift_ok else 'NOT what was assumed'}.")
    return res


# ---------------------------------------------------------------------------
# C2 - The join
# ---------------------------------------------------------------------------

def c2_join() -> dict:
    """Account for every row lost between the hourly sources and the daily panel."""
    _rule("C2 - THE JOIN")

    air = pd.read_csv(PROCESSED / "openmeteo_air_hourly.csv", parse_dates=["time"])
    wx = pd.read_csv(PROCESSED / "openmeteo_weather_hourly.csv", parse_dates=["time"])
    panel = pd.read_csv(PROCESSED / "daily_panel.csv", parse_dates=["date"])

    print(f"  air quality, hourly : {len(air):>8,} rows  "
          f"({air['location'].nunique()} locations)")
    print(f"  weather,     hourly : {len(wx):>8,} rows  "
          f"({wx['location'].nunique()} locations)")

    exp_air = len(air) / max(air["location"].nunique(), 1) / 24
    print(f"\n  hours per location  : {len(air) / max(air['location'].nunique(), 1):,.0f}"
          f"  -> {exp_air:,.1f} days")

    a_keys = set(zip(air["location"], air["time"]))
    w_keys = set(zip(wx["location"], wx["time"]))
    print(f"  keys in air not in weather : {len(a_keys - w_keys):,}")
    print(f"  keys in weather not in air : {len(w_keys - a_keys):,}")

    print(f"\n  daily panel after join and >={MIN_HOURS_PER_DAY}h rule : {len(panel):,} rows")
    per_loc = panel.groupby("location").size()
    print("\n  rows per location:")
    for k, v in per_loc.items():
        print(f"    {k:<22s} {v:>6,}")

    # A perfectly complete panel would have this many rows.
    span_days = (panel["date"].max() - panel["date"].min()).days + 1
    ideal = span_days * panel["location"].nunique()
    print(f"\n  date span {panel['date'].min().date()} .. {panel['date'].max().date()} "
          f"= {span_days} days")
    print(f"  complete panel would be {ideal:,} rows; actual {len(panel):,} "
          f"({len(panel) / ideal:.2%})")

    return {"air_hourly": len(air), "weather_hourly": len(wx),
            "panel_daily": len(panel), "ideal": ideal, "span_days": span_days}


# ---------------------------------------------------------------------------
# C3 - Missing values
# ---------------------------------------------------------------------------

def c3_missing() -> pd.DataFrame:
    _rule("C3 - MISSING VALUES")

    panel = pd.read_csv(PROCESSED / "daily_panel.csv", parse_dates=["date"])
    miss = (panel.isna().mean() * 100).round(4).sort_values(ascending=False)

    zero = miss[miss == 0.0]
    nonzero = miss[miss > 0.0]

    print(f"  columns with >0% missing ({len(nonzero)}):")
    for k, v in nonzero.head(25).items():
        print(f"    {k:<40s} {v:>8.4f}%")
    if len(nonzero) > 25:
        print(f"    ... and {len(nonzero) - 25} more")

    print(f"\n  columns with EXACTLY 0.0000% missing: {len(zero)}")
    for k in list(zero.index)[:15]:
        print(f"    {k}")

    print("""
  INTERPRETATION for the report:

  pm2_5, pm10, carbon_monoxide and dust are 0.00% missing across more than
  three years of hourly data. No instrument achieves that. Real monitors lose
  data to calibration, power cuts, communication faults and maintenance;
  Air4Thai encodes those gaps as -1.

  A complete series is the signature of MODEL OUTPUT. Open-Meteo's air quality
  product is Copernicus CAMS, a global atmospheric model that produces a value
  for every cell and every hour whether or not anything was measured there.

  Consequences that must be carried through the whole report:
    - These are not observations. Errors are not random measurement noise;
      they are systematic model bias, correlated in space and time.
    - A model trained on CAMS learns to predict CAMS, not the air.
    - Any claim about the number of days over 37.5 is a claim about the model's
      days over 37.5. Checkpoint C6 measures the size of that gap.

  Missing values that DO appear are created by this pipeline, not by the source:
  lag and rolling columns are undefined at the start of each location's series,
  and pm25_tomorrow is undefined on the last day and across any date gap.
""")

    miss.to_frame("pct_missing").to_csv(RESULTS / "c3_missing.csv")
    return miss


# ---------------------------------------------------------------------------
# C4 - Comparing places
# ---------------------------------------------------------------------------

def c4_grid_test() -> pd.DataFrame:
    """
    The live version of C4, and the single most important check in the project.

    Six API calls, one week of hourly data each, for points across Chiang Mai.

    IMPORTANT, and the reason this function compares VALUES and not coordinates:
    Open-Meteo reports the served coordinate on a 0.1 degree grid, but the
    underlying CAMS Global field is 0.4 degrees (~45 km). Two requests can
    therefore come back with DIFFERENT grid_lat/grid_lon and still carry
    byte-identical data, because they were interpolated from the same coarse
    cell. Testing the reported coordinates alone gives a false pass.

    The only sound test is whether the returned series actually differ. That is
    what this function does; the coordinates are printed for context only.

    Run this BEFORE writing any spatial analysis.
    """
    _rule("C4 (live) - DO TWO POINTS INSIDE CHIANG MAI DIFFER AT ALL?")

    points = {
        "cm_mueang     (urban)":     (18.7883, 98.9853),
        "cm_san_sai    (~15 km NE)": (18.9100, 99.0500),
        "cm_hang_dong  (~12 km SW)": (18.6883, 98.9214),
        "cm_mae_chaem  (~90 km W)":  (18.5000, 98.3667),
        "cm_chiang_dao (~70 km N)":  (19.3667, 98.9667),
        "cm_omkoi      (~130 km S)": (17.7947, 98.3644),
    }

    # A week in the middle of the burning season: if two points ever differ,
    # they differ here. A single day risks a coincidental match.
    START, END = "2024-03-11", "2024-03-17"

    rows, series = [], {}
    for name, (la, lo) in points.items():
        r = requests.get(AIR_ENDPOINT, params={
            "latitude": la, "longitude": lo, "hourly": "pm2_5",
            "start_date": START, "end_date": END,
            "timezone": TZ}, timeout=60).json()
        vals = np.asarray(r["hourly"]["pm2_5"], dtype=float)
        series[name] = vals
        rows.append({
            "point": name, "asked_lat": la, "asked_lon": lo,
            "grid_lat": r["latitude"], "grid_lon": r["longitude"],
            "elevation_m": r.get("elevation"),
            "n_hours": len(vals), "mean_pm25": round(float(np.nanmean(vals)), 2),
        })

    grid = pd.DataFrame(rows)
    print(f"  {START} .. {END}, hourly\n")
    print(grid.to_string(index=False))

    # --- the test that matters: do the SERIES differ? ----------------------
    names = list(series)
    pairs = []
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            d = np.abs(series[a] - series[b])
            pairs.append({"point_a": a.split("(")[0].strip(),
                          "point_b": b.split("(")[0].strip(),
                          "max_abs_diff": round(float(np.nanmax(d)), 4),
                          "mean_abs_diff": round(float(np.nanmean(d)), 4),
                          "identical": bool(np.nanmax(d) == 0)})
    cmp = pd.DataFrame(pairs).sort_values("max_abs_diff")
    print("\n  Pairwise comparison of the actual hourly values:\n")
    print(cmp.to_string(index=False))

    ident = cmp[cmp["identical"]]
    n_cells = grid[["grid_lat", "grid_lon"]].drop_duplicates().shape[0]
    print(f"\n  distinct grid coordinates reported : {n_cells} of {len(grid)}")
    print(f"  pairs whose DATA is byte-identical : {len(ident)} of {len(cmp)}")

    if len(ident):
        print("\n  *** THESE PAIRS RETURN THE SAME DATA AND MUST NOT BE COMPARED ***")
        for _, r in ident.iterrows():
            print(f"      {r['point_a']}  ==  {r['point_b']}")
        print(f"""
  Note that the reported coordinates differ for at least some of these pairs.
  That is the trap: Open-Meteo reports on a 0.1 degree grid while CAMS Global
  resolves 0.4 degrees, so distinct coordinates can carry identical data.

  VERDICT: the source's spatial resolution is coarser than a within-province
  question. Report this as a data-quality finding, then fall back to the
  province-level comparison (100-250 km apart, verified distinct in fig03).
  The urban-rural question becomes an item under "what would you need that you
  do not have" -- see docs/PART_D_DRAFT.md.""")
    else:
        print("""
  VERDICT: every pair differs, so a within-province comparison is defensible.
  State the caveats anyway: these are neighbouring samples of one smooth
  ~45 km field, not independent station measurements, and CAMS carries no
  terrain, so the Chiang Mai basin is invisible to it. To use these points,
  set FETCH_LOCATIONS in config.py to include CHIANGMAI_LOCATIONS and re-run
  fetch_data.py.""")

    grid.to_csv(RESULTS / "c4_grid_test.csv", index=False)
    cmp.to_csv(RESULTS / "c4_grid_pairs.csv", index=False)
    print(f"\n  -> {RESULTS / 'c4_grid_test.csv'}")
    print(f"  -> {RESULTS / 'c4_grid_pairs.csv'}")
    return cmp


def c4_places() -> pd.DataFrame:
    """
    THE MOST IMPORTANT CHECK IN THIS PROJECT.

    CAMS global runs on a 0.4 degree grid, roughly 45 km. Open-Meteo snaps a
    requested coordinate to the nearest grid cell and returns that cell's
    centre in the response. Two points inside one cell therefore return a
    BYTE-IDENTICAL series, and any urban-versus-rural conclusion drawn from
    them would be an artefact of the grid, not a fact about Chiang Mai.

    This function reports, for every pair of locations:
      - whether they were served from the same grid cell
      - the maximum absolute difference in hourly PM2.5
      - the correlation

    A pair with max difference 0.0 is the same cell. Say so in the report and
    drop the comparison; that is a finding, not a failure.
    """
    _rule("C4 - COMPARING PLACES")

    air = pd.read_csv(PROCESSED / "openmeteo_air_hourly.csv", parse_dates=["time"])

    if {"grid_lat", "grid_lon"}.issubset(air.columns):
        grid = air.groupby("location")[["grid_lat", "grid_lon"]].first()
        grid["requested_lat"] = [LOCATIONS.get(i, {}).get("lat") for i in grid.index]
        grid["requested_lon"] = [LOCATIONS.get(i, {}).get("lon") for i in grid.index]
        grid["cell"] = list(zip(grid["grid_lat"], grid["grid_lon"]))
        print("  Grid cell each location was served from:\n")
        print(grid[["requested_lat", "requested_lon", "grid_lat", "grid_lon"]].to_string())

        dupes = grid.groupby("cell").filter(lambda g: len(g) > 1)
        if len(dupes):
            print("\n  *** LOCATIONS SHARING A GRID CELL (identical data) ***")
            for cell, g in dupes.groupby("cell"):
                print(f"    {cell}: {list(g.index)}")
        else:
            print("\n  All locations were served from distinct grid cells.")
    else:
        print("  grid_lat/grid_lon not in the CSV -- re-run fetch_data.py to record them.")

    piv = air.pivot_table(index="time", columns="location", values="pm2_5")
    locs = list(piv.columns)
    rows = []
    for i, a in enumerate(locs):
        for b in locs[i + 1:]:
            d = (piv[a] - piv[b]).abs()
            rows.append({
                "loc_a": a, "loc_b": b,
                "max_abs_diff": round(float(d.max()), 4),
                "mean_abs_diff": round(float(d.mean()), 4),
                "pearson_r": round(float(piv[a].corr(piv[b])), 4),
                "identical": bool(d.max() == 0),
            })
    cmp = pd.DataFrame(rows).sort_values("max_abs_diff")

    print("\n  Pairwise comparison of hourly PM2.5:\n")
    print(cmp.to_string(index=False))
    cmp.to_csv(RESULTS / "c4_place_comparison.csv", index=False)

    ident = cmp[cmp["identical"]]
    print(f"\n  VERDICT: {len(ident)} of {len(cmp)} pairs are byte-identical.")
    if len(ident):
        print("  Those pairs must NOT be used for any spatial comparison:")
        for _, r in ident.iterrows():
            print(f"    {r['loc_a']} == {r['loc_b']}")
        print("\n  Report this as a data-quality finding: the source's spatial")
        print("  resolution is coarser than the question being asked of it.")
    else:
        print("  Every pair differs, so a spatial comparison is defensible.")
        print("  Note the caveat anyway: neighbouring samples of one smooth 45 km")
        print("  field are not independent observations of two places, and CAMS")
        print("  carries no terrain, so the basin inversion is invisible to it.")

    return cmp


# ---------------------------------------------------------------------------
# C6 - Ground truth
# ---------------------------------------------------------------------------

def c6_ground_truth(save: bool = True) -> pd.DataFrame:
    """
    Compare CAMS against measured Air4Thai stations at one point in time.

    Air4Thai has no history endpoint, so this can only ever be a snapshot. That
    is a limitation to state, not to hide. Run it a few times on different days
    and keep every result; a handful of paired points is far more convincing
    than one.
    """
    _rule("C6 - GROUND TRUTH")

    resp = requests.get(AIR4THAI_ENDPOINT, timeout=60, verify=False)
    payload = resp.json()
    stations = payload.get("stations", payload if isinstance(payload, list) else [])
    flat = pd.json_normalize(stations)

    area = flat.get("areaTH", pd.Series(dtype=str)).fillna("")
    north = flat[area.str.contains(
        "เชียงใหม่|เชียงราย|ลำปาง|ลำพูน|แม่ฮ่องสอน|น่าน|แพร่|พะเยา")].copy()

    for c, new in [("AQILast.PM25.value", "pm25_measured"),
                   ("lat", "latitude"), ("long", "longitude")]:
        north[new] = pd.to_numeric(north.get(c), errors="coerce")

    # -1 is Air4Thai's missing code. Averaging without this is quietly wrong.
    n_before = len(north)
    north["pm25_measured"] = north["pm25_measured"].mask(north["pm25_measured"] <= -1)
    north = north.dropna(subset=["pm25_measured", "latitude", "longitude"])
    print(f"  northern stations returned: {n_before}, usable after dropping -1: {len(north)}")

    stamp = pd.Timestamp.now(tz=TZ)
    date = stamp.strftime("%Y-%m-%d")
    print(f"  snapshot taken at {stamp:%Y-%m-%d %H:%M} {TZ}")

    rows = []
    for _, st in north.iterrows():
        r = requests.get(AIR_ENDPOINT, params={
            "latitude": float(st["latitude"]), "longitude": float(st["longitude"]),
            "hourly": "pm2_5", "start_date": date, "end_date": date, "timezone": TZ,
        }, timeout=60).json()
        h = pd.DataFrame({"time": pd.to_datetime(r["hourly"]["time"]),
                          "pm2_5": r["hourly"]["pm2_5"]})
        target_hour = stamp.floor("h").tz_localize(None)
        modelled = h.loc[h["time"] == target_hour, "pm2_5"]
        rows.append({
            "station_id": st.get("stationID"),
            "station": st.get("nameEN"),
            "area": st.get("areaTH"),
            "lat": st["latitude"], "lon": st["longitude"],
            "grid_lat": r.get("latitude"), "grid_lon": r.get("longitude"),
            "hour": target_hour,
            "pm25_measured": st["pm25_measured"],
            "pm25_cams": float(modelled.iloc[0]) if len(modelled) else np.nan,
        })

    cmp = pd.DataFrame(rows).dropna(subset=["pm25_cams"])
    cmp["diff_cams_minus_measured"] = cmp["pm25_cams"] - cmp["pm25_measured"]
    cmp["ratio"] = cmp["pm25_cams"] / cmp["pm25_measured"].replace(0, np.nan)

    print("\n" + cmp[["station", "area", "pm25_measured", "pm25_cams",
                      "diff_cams_minus_measured", "ratio"]].to_string(index=False))

    if len(cmp) >= 2:
        bias = cmp["diff_cams_minus_measured"].mean()
        mae = cmp["diff_cams_minus_measured"].abs().mean()
        r = cmp["pm25_cams"].corr(cmp["pm25_measured"])
        print(f"\n  n = {len(cmp)} paired stations")
        print(f"  mean bias (CAMS - measured) : {bias:+.2f} ug/m3")
        print(f"  mean absolute difference    : {mae:.2f} ug/m3")
        print(f"  correlation across stations : {r:.3f}")
        print(f"\n  Which is right? The Air4Thai reading. It is an instrument at a")
        print(f"  point; CAMS is a ~45 km cell average from a global model.")
        print(f"  Consequence: every exceedance count in this report is CAMS's")
        print(f"  count. If CAMS is biased {'high' if bias > 0 else 'low'} by ~{abs(bias):.0f} ug/m3 near the")
        print(f"  standard, the number of days over 37.5 is correspondingly wrong.")

    if save:
        out = RESULTS / "c6_ground_truth.csv"
        if out.exists():
            cmp = pd.concat([pd.read_csv(out), cmp], ignore_index=True)
        cmp.to_csv(out, index=False)
        print(f"\n  -> {out}  (appended; run on several days to build up n)")
    return cmp


# ---------------------------------------------------------------------------

def main() -> None:
    results = {}
    for name, fn in [("C1", c1_time), ("C2", c2_join), ("C3", c3_missing),
                     ("C4-grid", c4_grid_test), ("C4", c4_places),
                     ("C6", c6_ground_truth)]:
        try:
            results[name] = "ok"
            fn()
        except Exception as exc:  # noqa: BLE001
            results[name] = f"error: {exc}"
            print(f"\n  [{name} failed] {exc}")
    print("\n" + "=" * 72)
    print("C5 (model vs baseline) is produced by model.py.")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
