"""
config.py — central configuration for the PM2.5 Northern Thailand project.

Every path, endpoint, coordinate and constant lives here so that the report can
state exactly what was fetched, from where, and for what period. Nothing else in
the repository hard-codes a URL or a date.

DS-270702 Homework 4.
"""

from pathlib import Path
import pandas as pd

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
FIGURES = ROOT / "outputs" / "figures"
RESULTS = ROOT / "outputs" / "results"

for _p in (RAW, PROCESSED, FIGURES, RESULTS):
    _p.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Time
# ---------------------------------------------------------------------------

TZ = "Asia/Bangkok"

# Open-Meteo Air Quality (CAMS) has no data before 2022-08; requests for earlier
# dates return an empty series rather than an error. 2023-01-01 is the safe start
# used throughout, so that every source in the join covers the same period.
START_DATE = "2023-01-01"

# The ERA5 archive lags real time by roughly 5 days. Ending 7 days back keeps the
# fetch reproducible and avoids a partially-populated final day.
END_DATE = (pd.Timestamp.today().normalize() - pd.Timedelta(days=7)).strftime("%Y-%m-%d")

# Set True to re-download and overwrite files in data/raw/.
# Default False: raw responses are preserved exactly as the API returned them,
# which is what the assignment requires. See README "Reproducibility".
OVERWRITE = False

# ---------------------------------------------------------------------------
# Locations
#
# Two groups, and the distinction matters for checkpoint C4.
#
# PROVINCE_LOCATIONS are 4 provincial capitals, 100-250 km apart. These are far
# enough apart to fall in different CAMS grid cells, so they return genuinely
# different series (verified in notebook 01, checkpoint C4).
#
# CHIANGMAI_LOCATIONS are points inside Chiang Mai province, intended for the
# urban-versus-rural comparison. CAMS global runs at 0.4 degrees (~45 km), so
# some of these points may snap to the SAME grid cell and return byte-identical
# data. The notebook tests this empirically before any spatial claim is made.
# Do not assume they are distinct.
# ---------------------------------------------------------------------------

PROVINCE_LOCATIONS = {
    "mueang_chiang_mai": {"lat": 18.7883, "lon": 98.9853, "province": "Chiang Mai",
                          "label": "Chiang Mai (urban core)", "group": "province"},
    "mae_hong_son":      {"lat": 19.3020, "lon": 97.9650, "province": "Mae Hong Son",
                          "label": "Mae Hong Son", "group": "province"},
    "mueang_chiang_rai": {"lat": 19.9086, "lon": 99.8325, "province": "Chiang Rai",
                          "label": "Chiang Rai", "group": "province"},
    "mueang_lampang":    {"lat": 18.2855, "lon": 99.5130, "province": "Lampang",
                          "label": "Lampang", "group": "province"},
}

CHIANGMAI_LOCATIONS = {
    "cm_mueang":     {"lat": 18.7883, "lon": 98.9853, "province": "Chiang Mai",
                      "label": "Mueang (urban, ~310 m)", "group": "chiangmai", "setting": "urban"},
    "cm_san_sai":    {"lat": 18.9100, "lon": 99.0500, "province": "Chiang Mai",
                      "label": "San Sai (peri-urban, ~15 km from centre)", "group": "chiangmai", "setting": "peri_urban"},
    "cm_mae_chaem":  {"lat": 18.5000, "lon": 98.3667, "province": "Chiang Mai",
                      "label": "Mae Chaem (rural valley, ~500 m)", "group": "chiangmai", "setting": "rural"},
    "cm_chiang_dao": {"lat": 19.3667, "lon": 98.9667, "province": "Chiang Mai",
                      "label": "Chiang Dao (rural north)", "group": "chiangmai", "setting": "rural"},
    "cm_omkoi":      {"lat": 17.7947, "lon": 98.3644, "province": "Chiang Mai",
                      "label": "Omkoi (rural south, ~800 m)", "group": "chiangmai", "setting": "rural"},
}

LOCATIONS = {**PROVINCE_LOCATIONS, **CHIANGMAI_LOCATIONS}

# ---------------------------------------------------------------------------
# What the bulk fetch actually downloads.
#
# Default: the 4 provincial capitals only. They are 100-250 km apart, verified to
# return genuinely different series (max hourly difference 75-124 ug/m3), and they
# keep data/raw/ at roughly 30 MB instead of 70 MB, which matters for GitHub.
#
# The 5 Chiang Mai district points do NOT need a full multi-year download to
# answer checkpoint C4 -- notebook section 3 settles that with six single-day
# calls. Only add them here if C4 shows they fall in DIFFERENT grid cells and you
# intend to build the urban-rural analysis on them:
#
#     FETCH_LOCATIONS = {**PROVINCE_LOCATIONS, **CHIANGMAI_LOCATIONS}
# ---------------------------------------------------------------------------

FETCH_LOCATIONS = PROVINCE_LOCATIONS

# The single location used for the headline prediction model.
PRIMARY_LOCATION = "mueang_chiang_mai"

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

AIR_ENDPOINT = "https://air-quality-api.open-meteo.com/v1/air-quality"
ARCHIVE_ENDPOINT = "https://archive-api.open-meteo.com/v1/archive"
FORECAST_ARCHIVE_ENDPOINT = "https://historical-forecast-api.open-meteo.com/v1/forecast"
AIR4THAI_ENDPOINT = "http://air4thai.pcd.go.th/services/getNewAQI_JSON.php"
FIRMS_ENDPOINT = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

# ---------------------------------------------------------------------------
# Variables
# ---------------------------------------------------------------------------

AIR_VARS = "pm2_5,pm10,carbon_monoxide,dust"

# boundary_layer_height is the single most important addition to the original
# variable list. Chiang Mai's pollution mechanism is a shallow nocturnal mixing
# layer trapping smoke in the basin; wind speed alone does not capture it.
# ventilation_index = boundary_layer_height * wind_speed_10m is built in
# prepare_data.py from these two.
WEATHER_VARS = ",".join([
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "precipitation",
    "surface_pressure",
    "boundary_layer_height",
    "cloud_cover",
    "shortwave_radiation",
    "soil_moisture_0_to_7cm",
    "et0_fao_evapotranspiration",
])

# Variables pulled from the HISTORICAL FORECAST archive, i.e. what the weather
# model actually predicted ahead of time. These are the only meteorological
# values that are legitimately knowable at the moment of prediction.
# See README "Leakage" and Rule 2 of the assignment.
FORECAST_VARS = ",".join([
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "wind_direction_10m",
    "precipitation",
    "surface_pressure",
    "boundary_layer_height",
])

# ---------------------------------------------------------------------------
# Target definition
# ---------------------------------------------------------------------------

# Thailand's 24-hour ambient PM2.5 standard, in micrograms per cubic metre.
# Tightened from 50 to 37.5 with effect from 1 June 2023 (Royal Gazette, 3 July 2023).
PM25_STANDARD = 37.5

# Thailand AQI breakpoints for PM2.5, 24-hour average (PCD, 2023).
AQI_BREAKPOINTS = [
    (0.0, 15.0, "Very good", "#0099FF"),
    (15.1, 25.0, "Good", "#00B050"),
    (25.1, 37.5, "Moderate", "#FFFF00"),
    (37.6, 75.0, "Affects health", "#FFA500"),
    (75.1, 1e9, "Seriously affects health", "#FF0000"),
]

# A day counts only if this fraction of its hours is present. Guards against a
# day being represented by three hours of data.
MIN_HOURS_PER_DAY = 18

# ---------------------------------------------------------------------------
# Split
#
# Time-ordered. The test set is the later portion, and it deliberately contains
# a complete burning season (Jan-May 2026) so that model performance is measured
# on the days the warning system would actually have to work.
# ---------------------------------------------------------------------------

TRAIN_END = "2025-05-31"
TEST_START = "2025-06-01"

# Burning season used for seasonal subsetting in analyse.py and model.py.
BURNING_SEASON_MONTHS = [1, 2, 3, 4]

# ---------------------------------------------------------------------------
# FIRMS
# ---------------------------------------------------------------------------

# Bounding box for Northern Thailand: west, south, east, north
FIRMS_BBOX = "97.3,17.0,101.0,20.5"

# Get a free MAP_KEY at https://firms.modaps.eosdis.nasa.gov/api/area/
# Put it in a file named firms_key.txt in the project root, or set the
# environment variable FIRMS_MAP_KEY. Never commit the key itself.
FIRMS_KEY_FILE = ROOT / "firms_key.txt"

# Radius in km around a location within which hotspots are counted.
HOTSPOT_RADII_KM = [50, 100]
