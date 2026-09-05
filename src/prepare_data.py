"""
prepare_data.py — cleaning, joining, aggregation and feature construction.

Run:  python src/prepare_data.py

Produces:
    data/processed/daily_panel.csv    one row per (location, date), all sources joined
    data/processed/model_table.csv    primary location only, with targets and features
    outputs/results/join_audit.csv    row counts before and after every join (C2)
    outputs/results/missing_audit.csv percentage missing per column (C3)

The two decisions in this file that the report must defend:

A. HOURLY -> DAILY. A calendar day is kept only if at least MIN_HOURS_PER_DAY
   of its 24 hours are present. Days below that are dropped rather than averaged,
   because a "daily mean" from six hours is not comparable to one from 24 and
   would silently bias the exceedance count.

B. WHICH FEATURES ARE ALLOWED. Every feature is tagged as either
   OBSERVED_TO_TODAY (known when the forecast is issued on the evening of day t)
   or FORECAST_FOR_TOMORROW (a genuine forecast, from the historical forecast
   archive). ERA5 values for day t+1 are NEVER used as features. They are
   reanalysis: they incorporate observations made after the prediction moment,
   and using them is data leakage that inflates the score and cannot be
   reproduced operationally.
"""

from __future__ import annotations

import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import (  # noqa: E402
    BURNING_SEASON_MONTHS, MIN_HOURS_PER_DAY, PM25_STANDARD, PRIMARY_LOCATION,
    PROCESSED, RESULTS,
)

AUDIT: list[dict] = []


def audit(step: str, rows: int, note: str = "") -> None:
    AUDIT.append({"step": step, "rows": rows, "note": note})
    print(f"    {step:<46s} rows={rows:>8,}  {note}")


# ---------------------------------------------------------------------------
# Load
# ---------------------------------------------------------------------------

def load_hourly(name: str) -> pd.DataFrame:
    path = PROCESSED / f"{name}_hourly.csv"
    if not path.exists():
        print(f"    [missing] {path} -- run fetch_data.py first")
        return pd.DataFrame()
    df = pd.read_csv(path, parse_dates=["time"])
    audit(f"load {name}_hourly.csv", len(df),
          f"{df['location'].nunique()} locations, {df['time'].min()} .. {df['time'].max()}")
    return df


# ---------------------------------------------------------------------------
# Hourly -> daily
# ---------------------------------------------------------------------------

def to_daily(df: pd.DataFrame, value_cols: list[str], prefix: str = "") -> pd.DataFrame:
    """
    Aggregate to local calendar days, enforcing the coverage rule.

    Wind direction is averaged as a unit vector, not arithmetically: the mean of
    350 degrees and 10 degrees is 0, not 180.
    """
    if df.empty:
        return pd.DataFrame()

    d = df.copy()
    d["date"] = d["time"].dt.normalize()

    have = [c for c in value_cols if c in d.columns]
    agg = {c: "mean" for c in have}
    grouped = d.groupby(["location", "date"], as_index=False).agg(
        {**agg, "time": "count"}
    ).rename(columns={"time": "hours_present"})

    # Circular mean for wind direction
    if "wind_direction_10m" in d.columns:
        rad = np.deg2rad(d["wind_direction_10m"])
        d["_u"], d["_v"] = np.sin(rad), np.cos(rad)
        circ = d.groupby(["location", "date"], as_index=False)[["_u", "_v"]].mean()
        circ["wind_direction_10m"] = (np.rad2deg(np.arctan2(circ["_u"], circ["_v"])) + 360) % 360
        grouped = grouped.drop(columns=["wind_direction_10m"]).merge(
            circ[["location", "date", "wind_direction_10m"]], on=["location", "date"], how="left"
        )

    # Extra shape statistics for PM2.5: the daily mean hides the night-time peak.
    if "pm2_5" in d.columns:
        extra = d.groupby(["location", "date"], as_index=False)["pm2_5"].agg(
            pm25_max="max", pm25_min="min", pm25_std="std"
        )
        grouped = grouped.merge(extra, on=["location", "date"], how="left")

    # Precipitation is a total over the day, not a mean.
    if "precipitation" in d.columns:
        tot = d.groupby(["location", "date"], as_index=False)["precipitation"].sum() \
               .rename(columns={"precipitation": "precip_total_mm"})
        grouped = grouped.merge(tot, on=["location", "date"], how="left")

    before = len(grouped)
    grouped = grouped[grouped["hours_present"] >= MIN_HOURS_PER_DAY].copy()
    audit(f"{prefix}daily after >={MIN_HOURS_PER_DAY}h coverage rule", len(grouped),
          f"dropped {before - len(grouped)} incomplete days")

    if prefix:
        rename = {c: f"{prefix}{c}" for c in grouped.columns
                  if c not in ("location", "date")}
        grouped = grouped.rename(columns=rename)
    return grouped


# ---------------------------------------------------------------------------
# FIRMS hotspots -> daily counts near each location
# ---------------------------------------------------------------------------

def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0088
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dp, dl = np.radians(lat2 - lat1), np.radians(lon2 - lon1)
    a = np.sin(dp / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return 2 * r * np.arcsin(np.sqrt(a))


def hotspot_daily(locations: dict, radii_km: list[int]) -> pd.DataFrame:
    path = PROCESSED / "firms_hotspots.csv"
    if not path.exists():
        print("    [skip] firms_hotspots.csv not found -- hotspot features omitted")
        return pd.DataFrame()

    f = pd.read_csv(path)
    audit("load firms_hotspots.csv", len(f))

    latc = "latitude" if "latitude" in f.columns else "lat"
    lonc = "longitude" if "longitude" in f.columns else "lon"
    datec = "acq_date" if "acq_date" in f.columns else f.columns[2]

    f["date"] = pd.to_datetime(f[datec], errors="coerce").dt.normalize()
    f = f.dropna(subset=["date", latc, lonc])

    rows = []
    for name, loc in locations.items():
        dist = haversine_km(loc["lat"], loc["lon"], f[latc].values, f[lonc].values)
        for r in radii_km:
            sub = f.loc[dist <= r]
            counts = sub.groupby("date").size().rename(f"hotspots_{r}km")
            rows.append(counts.to_frame().assign(location=name))

    if not rows:
        return pd.DataFrame()

    out = pd.concat(rows).reset_index()
    out = out.groupby(["location", "date"], as_index=False).first()
    audit("firms daily hotspot counts", len(out))
    return out


# ---------------------------------------------------------------------------
# Feature construction
# ---------------------------------------------------------------------------

OBSERVED_LAG_BASE = [
    "pm2_5", "pm10", "carbon_monoxide", "dust", "pm25_max", "pm25_std",
    "wx_temperature_2m", "wx_relative_humidity_2m", "wx_wind_speed_10m",
    "wx_boundary_layer_height", "wx_surface_pressure", "wx_precip_total_mm",
    "wx_ventilation_index", "wx_soil_moisture_0_to_7cm",
    "hotspots_50km", "hotspots_100km",
]


def build_features(panel: pd.DataFrame) -> pd.DataFrame:
    """
    Add targets and features. Column naming carries the provenance:

        <name>_lag0 .. _lag3   observed value on day t, t-1, ...   KNOWABLE
        <name>_roll3, _roll7   rolling means ending on day t       KNOWABLE
        fc_<name>              forecast issued for day t+1         KNOWABLE
        pm25_tomorrow          the regression target               NOT a feature
        exceed_tomorrow        the classification target           NOT a feature
    """
    df = panel.sort_values(["location", "date"]).copy()
    g = df.groupby("location", group_keys=False)

    # --- Targets -----------------------------------------------------------
    df["pm25_today"] = df["pm2_5"]
    df["pm25_tomorrow"] = g["pm2_5"].shift(-1)
    df["exceed_today"] = (df["pm25_today"] > PM25_STANDARD).astype("Int64")
    df["exceed_tomorrow"] = (df["pm25_tomorrow"] > PM25_STANDARD).astype("Int64")

    # Guard: a shift(-1) across a gap in the date index would silently pair
    # non-consecutive days. Only keep rows whose next row really is t+1.
    next_date = g["date"].shift(-1)
    df["_next_is_tomorrow"] = (next_date - df["date"]).dt.days.eq(1)
    df.loc[~df["_next_is_tomorrow"].fillna(False), ["pm25_tomorrow", "exceed_tomorrow"]] = np.nan

    # --- Ventilation index -------------------------------------------------
    if {"wx_boundary_layer_height", "wx_wind_speed_10m"}.issubset(df.columns):
        df["wx_ventilation_index"] = (
            df["wx_boundary_layer_height"] * df["wx_wind_speed_10m"]
        )

    # --- Lags and rolling means (observed up to and including day t) -------
    for col in OBSERVED_LAG_BASE:
        if col not in df.columns:
            continue
        s = df.groupby("location", group_keys=False)[col]
        df[f"{col}_lag0"] = s.shift(0)
        df[f"{col}_lag1"] = s.shift(1)
        df[f"{col}_lag2"] = s.shift(2)
        df[f"{col}_lag3"] = s.shift(3)
        df[f"{col}_roll3"] = s.transform(lambda x: x.rolling(3, min_periods=2).mean())
        df[f"{col}_roll7"] = s.transform(lambda x: x.rolling(7, min_periods=4).mean())

    # Short-term trend: is it building or clearing?
    df["pm25_delta_1d"] = df["pm2_5_lag0"] - df["pm2_5_lag1"]
    df["pm25_delta_3d"] = df["pm2_5_lag0"] - df["pm2_5_lag3"]
    df["pm25_above_roll7"] = df["pm2_5_lag0"] - df["pm2_5_roll7"]

    # --- Calendar ----------------------------------------------------------
    doy = df["date"].dt.dayofyear
    df["doy_sin"] = np.sin(2 * np.pi * doy / 365.25)
    df["doy_cos"] = np.cos(2 * np.pi * doy / 365.25)
    df["month"] = df["date"].dt.month
    df["dayofweek"] = df["date"].dt.dayofweek
    df["is_weekend"] = df["dayofweek"].isin([5, 6]).astype(int)
    df["is_burning_season"] = df["month"].isin(BURNING_SEASON_MONTHS).astype(int)
    df["year"] = df["date"].dt.year

    # --- Transition flag: the days a warning system actually has to get right
    df["is_transition"] = (
        df["exceed_tomorrow"].astype("float") != df["exceed_today"].astype("float")
    ).astype("Int64")
    df.loc[df["exceed_tomorrow"].isna(), "is_transition"] = pd.NA

    return df.drop(columns=["_next_is_tomorrow"])


def feature_columns(df: pd.DataFrame) -> list[str]:
    """
    The allow-list of columns that may be given to a model.

    Anything not matching these patterns is excluded by construction, so a
    same-day or next-day observation cannot leak in by accident.
    """
    allowed = []
    for c in df.columns:
        if c in ("pm25_tomorrow", "exceed_tomorrow", "is_transition"):
            continue
        if c.endswith(("_lag0", "_lag1", "_lag2", "_lag3", "_roll3", "_roll7")):
            allowed.append(c)
        elif c.startswith("fc_"):
            allowed.append(c)
        elif c in ("doy_sin", "doy_cos", "month", "dayofweek", "is_weekend",
                   "is_burning_season", "pm25_delta_1d", "pm25_delta_3d",
                   "pm25_above_roll7", "exceed_today"):
            allowed.append(c)
    return [c for c in allowed if pd.api.types.is_numeric_dtype(df[c])]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    from config import HOTSPOT_RADII_KM, LOCATIONS

    print("=" * 72)
    print("PREPARE")
    print("=" * 72)

    print("\n[1] Load hourly tables")
    air = load_hourly("openmeteo_air")
    wx = load_hourly("openmeteo_weather")
    fc = load_hourly("openmeteo_forecast")

    if air.empty:
        print("No air quality data. Run fetch_data.py first.")
        return

    print("\n[2] Hourly -> daily")
    air_d = to_daily(air, ["pm2_5", "pm10", "carbon_monoxide", "dust"], prefix="")
    wx_d = to_daily(wx, [c for c in wx.columns if c not in
                         ("location", "time", "grid_lat", "grid_lon")], prefix="wx_")
    fc_d = to_daily(fc, [c for c in fc.columns if c not in
                         ("location", "time", "grid_lat", "grid_lon")], prefix="fc_") \
        if not fc.empty else pd.DataFrame()

    print("\n[3] Join")
    n_air, n_wx = len(air_d), len(wx_d)
    panel = air_d.merge(wx_d, on=["location", "date"], how="inner")
    audit("inner join air x weather", len(panel),
          f"air={n_air}, weather={n_wx}, lost={max(n_air, n_wx) - len(panel)}")

    if not fc_d.empty:
        before = len(panel)
        # Forecast for day t+1 must be attached to the row for day t.
        fc_shift = fc_d.copy()
        fc_shift["date"] = fc_shift["date"] - pd.Timedelta(days=1)
        panel = panel.merge(fc_shift, on=["location", "date"], how="left")
        audit("left join forecast-for-tomorrow", len(panel),
              f"unchanged from {before}; "
              f"{panel[[c for c in panel.columns if c.startswith('fc_')]].isna().all(axis=1).sum()} rows without forecast")

    hs = hotspot_daily(LOCATIONS, HOTSPOT_RADII_KM)
    if not hs.empty:
        before = len(panel)
        panel = panel.merge(hs, on=["location", "date"], how="left")
        for r in HOTSPOT_RADII_KM:
            col = f"hotspots_{r}km"
            if col in panel.columns:
                # No detection on a day means zero fires detected, not unknown.
                panel[col] = panel[col].fillna(0)
        audit("left join FIRMS hotspots", len(panel), f"unchanged from {before}")

    print("\n[4] Features and targets")
    panel = build_features(panel)
    panel.to_csv(PROCESSED / "daily_panel.csv", index=False)
    print(f"  -> {PROCESSED / 'daily_panel.csv'}  shape={panel.shape}")

    model_table = panel[panel["location"] == PRIMARY_LOCATION].copy()
    model_table.to_csv(PROCESSED / "model_table.csv", index=False)
    print(f"  -> {PROCESSED / 'model_table.csv'}  shape={model_table.shape}  "
          f"({PRIMARY_LOCATION})")

    print("\n[5] Audits")
    pd.DataFrame(AUDIT).to_csv(RESULTS / "join_audit.csv", index=False)

    miss = (panel.isna().mean() * 100).round(4).rename("pct_missing").to_frame()
    miss["n_missing"] = panel.isna().sum()
    miss["dtype"] = panel.dtypes.astype(str)
    miss = miss.sort_values("pct_missing", ascending=False)
    miss.to_csv(RESULTS / "missing_audit.csv")
    print(f"  -> {RESULTS / 'join_audit.csv'}")
    print(f"  -> {RESULTS / 'missing_audit.csv'}")

    exactly_zero = miss[miss["pct_missing"] == 0.0].index.tolist()
    print(f"\n  Columns with EXACTLY 0.00% missing: {len(exactly_zero)}")
    print("  Over three years of hourly data this is not what a measuring")
    print("  instrument produces. It is the signature of model output. See C3.")

    feats = feature_columns(model_table)
    print(f"\n  Allowed feature columns: {len(feats)}")
    pd.Series(feats, name="feature").to_csv(RESULTS / "feature_list.csv", index=False)


if __name__ == "__main__":
    main()
