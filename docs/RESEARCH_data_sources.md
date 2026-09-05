# Additional data sources — verified 4 September 2026

What was already in hand: Open-Meteo Air Quality (CAMS, hourly from 2023-01-01),
Open-Meteo Archive (ERA5), Air4Thai current JSON, NASA FIRMS 3-year hotspots,
World Bank indicators.

**Verification method and its limits.** Endpoints were hit through a fetcher that
respects `robots.txt`, and the sandboxed shells used for this session are behind an
egress proxy. Two consequences: `air-quality-api.open-meteo.com` disallows robots
so the two-coordinate grid test could **not** be executed here — it is built into
notebook §3 for you to run — and a few Thai government sites returned 403 to
automated access that will likely work fine from your own machine.

---

## 0. The critical warning: CAMS resolution

Verified from the Open-Meteo air-quality spec page:

| Model | Resolution |
|---|---|
| **CAMS Global Atmospheric Composition** ← your source | **0.4° (~45 km)** |
| CAMS European | 0.1° (~11 km) — **Europe only** |

Also verified: air-quality archive starts **August 2022**; no key needed for
non-commercial use; `past_days` capped at 0–92 (use `start_date`/`end_date`).

A 0.4° cell is ~44 km N–S and ~42 km E–W at this latitude. Snapping candidate
points to a 0.4° grid:

| District | Requested | Approx. cell |
|---|---|---|
| เมือง Mueang | 18.788, 98.985 | 18.8, 98.8 |
| แม่แจ่ม Mae Chaem | 18.500, 98.367 | 18.4, 98.4 |
| เชียงดาว Chiang Dao | 19.367, 98.967 | 19.2, 98.8 |
| อมก๋อย Omkoi | 17.795, 98.364 | 17.6, 98.4 |

Three consequences, worst first:

1. **Any two points inside one cell return a byte-identical series.** Mueang,
   สันทราย, หางดง, แม่ริม, สารภี, ดอยสะเก็ด are all within ~20 km of the city centre
   and collapse into the same cell. An urban–peri-urban contrast built on those
   points measures nothing.
2. **Points 50–130 km apart do land in different cells**, but they differ as
   neighbouring samples of one smooth ~45 km field, driven mostly by the model's
   own coarse emission inventory. They are not independent observations of two
   places.
3. **CAMS has no terrain.** Chiang Mai's defining mechanism — smoke trapped under a
   nocturnal inversion in a basin — is invisible at 45 km. Mueang sits at ~310 m,
   Mae Chaem valley ~500 m, Omkoi ~800 m, Doi Inthanon 2,565 m. CAMS sees one flat box.

**Verdict: do not do a within-province city-vs-rural analysis on CAMS.** Use CAMS
as a regional background, and put ground sensors at the centre of any spatial
comparison. Notebook §3 settles it empirically in one cell.

*Verified against the data already fetched:* the four provincial capitals
(Chiang Mai, Chiang Rai, Lampang, Mae Hong Son) **do** return genuinely different
series — maximum hourly difference 75–124 µg/m³, pairwise correlation 0.77–0.82.
The province-level comparison is defensible; the within-province one is what needs
testing.

---

## 1. Measured historical PM2.5

### 1a. OpenAQ S3 Open Data Archive — **WORKS, NO KEY**

The API needs a key; **the archive behind it does not.**

- **Endpoint:** `https://openaq-data-archive.s3.amazonaws.com/records/csv.gz/locationid={id}/year={yyyy}/month={mm}/location-{id}-{yyyymmdd}.csv.gz`
- **Credentials:** none. `aws s3 --no-sign-request`, or a plain HTTPS GET.
- **Verified live:** listing `locationid=418` (a Thai Air4Thai station, reference
  grade, PM2.5 + PM10 + O₃ + NO₂ + SO₂ + CO) returned real daily keys, first file
  `location-418-20160130.csv.gz`.
- ⚠️ **The catch:** year folders for station 418 returned **exactly 2016 → 2022**;
  `year=2025` returned zero. **Thai PCD ingestion into OpenAQ appears to have
  stopped in 2022.** Only one station could be tested, so treat this as strongly
  indicated, not proven.
- **Verdict:** excellent for **2016–2022 measured ground truth** — seven burning
  seasons your CAMS series does not cover. **Does not overlap your 2023+ window.**

```python
import pandas as pd
url = ("https://openaq-data-archive.s3.amazonaws.com/records/csv.gz/"
       "locationid=418/year=2019/month=03/location-418-20190315.csv.gz")
print(pd.read_csv(url, compression="gzip").head())   # no key, no boto3
```

### 1b. OpenAQ API v3 — **NEEDS KEY** (only to look up station IDs)

- `https://api.openaq.org/v3` — verified: **HTTP 401** without a key. Header
  `X-API-Key`. Free, self-service at `explore.openaq.org` → settings.
- **v2 is dead** — `api.openaq.org/v2/locations` returns **HTTP 410 Gone**. Ignore
  any tutorial using v2.
- ⚠️ Chiang Mai location IDs could not be obtained (API 401s, explorer is
  client-rendered, IDs non-contiguous). One call once you have a key:

```python
requests.get("https://api.openaq.org/v3/locations",
    params={"coordinates": "18.7883,98.9853", "radius": 25000, "limit": 100},
    headers={"X-API-Key": KEY}).json()
```

Then feed those numeric IDs into the keyless S3 pattern above.

### 1c. CMU CCDC DustBoy — **NEEDS KEY; the best source for the city-vs-rural question**

- **Docs:** [open-api.cmuccdc.org](https://open-api.cmuccdc.org/?lang=english)
- **Auth:** `Authorization: Bearer {api_key}`. Register, pick organisation type,
  **wait for admin approval**. Timing not published. As a CMU Master's student you
  are the ideal applicant — **apply today with your CMU address.**

| Endpoint | Returns |
|---|---|
| `GET /api/dustboy/data30day/{id}` | 30 days hourly |
| `GET /api/dustboy/data1year/{id}` | 1 year hourly |
| **`GET /api/dustboy/data5year/{id}`** | **5 years hourly** ← the one you want |
| `GET /api/dustboy/database/{yyyy}{mm}` | bulk monthly dump, all stations |
| `GET /api/dustboy/nearme/{lat}/{lon}/{km}` | stations within radius (max 20 km) |
| `GET /api/dustboy/stations` | full station inventory |

- ⚠️ **The old no-login download is gone.** `cmuccdc.org/download_json/{id}`
  302-redirects to the key-gated API. Don't build on it.
- ⚠️ DustBoy is a **low-cost optical sensor** network, not reference grade. Expect
  to need a humidity correction, and expect dropouts.

### 1d. Air4Thai historical — **COULD NOT VERIFY, and there is a real obstacle**

A history tool exists at `air4thai.pcd.go.th/webV2/history/`, but the host **fails
TLS**: `[SSL: CERTIFICATE_VERIFY_FAILED] unable to get local issuer certificate`.
This is a genuine finding, not a tooling artefact — PCD serves an incomplete
certificate chain. In Python you will hit the same wall and need `verify=False`
(with `urllib3.disable_warnings()`), which is what `fetch_data.py` does.

No `getHistoryData.php`-style backend is documented. The GitHub wrappers
(`olustrrax/air-thai-api`, `codeforthailand/datasource-air4thai`) cover only
current readings.

> **Best next step, one minute of your time:** open the history page in a browser
> with DevTools open, pick a Chiang Mai station and a date range, and read the XHR
> the form fires. That hands you the real endpoint. If it works, it changes the
> whole project — you would have measured history.

Related leads that returned 403 to automated fetch but may work from your browser:
[envilink.go.th/dataset/air-quality-pm2point5](https://envilink.go.th/dataset/air-quality-pm2point5)
and its CKAN API path. Envilink is CKAN-based, so
`https://envilink.go.th/api/3/action/package_show?id=air-quality-pm2point5` is the
right call to try — the 403 looks like bot filtering, not a real block.

### 1e. Sensor.Community — works, no key, **but useless here**

`https://data.sensor.community/airrohr/v1/filter/area={lat},{lon},{radius_km}` —
verified working. Archive at `archive.sensor.community/YYYY-MM-DD/` back to 2015.
**But a 40 km query around Chiang Mai returned 2 sensors, both at the same urban
address.** Not worth the integration effort.

### 1f. WAQI / aqicn — needs key, current-only, historical not scriptable

Free token by form. WAQI **mirrors Air4Thai** for Chiang Mai, so it is derivative,
not independent. Historical data is **daily averages already converted to US EPA
AQI, not µg/m³**, and raw hourly requires a manual query form. Licence forbids
redistributing archived data. Skip unless Air4Thai and DustBoy both fail.

### 1g. Not pursued
**PurpleAir** (negligible Northern Thailand coverage), **Google Air Quality API**
(billed, and itself substantially model-derived so it does not fix the
"measured not modelled" gap), **IQAir** (commercial, re-serves PCD).

---

## 2. City vs rural stations in Chiang Mai

**DustBoy is the only network that reaches the districts named.** Confirmed
stations, each with a live page on cmuccdc.org:

| Page | Location | District | Numeric ID |
|---|---|---|---|
| `cmuccdc.org/N-191` | บ้านห้วยริน ต.ช่างเคิ่ง | **แม่แจ่ม** | **5731** ✓ |
| `cmuccdc.org/NH-030` | รพ.สต.บ้านไตรสภาวคาม ต.เมืองงาย | **เชียงดาว** | not read |
| `cmuccdc.org/Wplus099` | บ้านสบอ้อ ต.แม่นะ | **เชียงดาว** | not read |
| `cmuccdc.org/N-114` | คณะมนุษยศาสตร์ มช. ต.สุเทพ | **เมือง** (urban reference) | not read |

Two ID systems: the URL slug (`N-191`) and the **numeric station ID (`5731`)**.
**`data5year/{id}` takes the numeric one.**

- ⚠️ **อมก๋อย and ฮอด: no stations confirmed.** The station list is only browsable
  through a JS map. `GET /api/dustboy/stations` settles it in one call once you
  have the key.
- ⚠️ **Reliability warning, verified:** N-191 Mae Chaem currently displays
  **"ไม่มีข้อมูล"** — no data. Low-cost sensors in remote districts go offline.
  **Before committing to a study design, pull `data5year` for each candidate
  station and plot data completeness by month.** A rural station with 40% coverage
  during burning season will quietly wreck an urban–rural comparison. This is the
  single most likely way the spatial analysis fails.

**Recommended design if you pursue this:** urban DustBoy (N-114) vs rural DustBoy
(N-191 Mae Chaem, NH-030 Chiang Dao) — same network, same instrument type, so the
comparison is not confounded by instrument bias. CAMS as a regional covariate only.

---

## 3. Meteorology from Open-Meteo Archive — **WORKS, NO KEY, and it has PBL height**

`https://archive-api.open-meteo.com/v1/archive` · no key · **earliest 1940** ·
ERA5 0.25° (~25 km), ERA5-Land 0.1°.

**`boundary_layer_height` EXISTS** — confirmed on the spec page under Additional
Variables And Options. This is the best available ventilation/trapping proxy and it
is now in `config.WEATHER_VARS`.

Confirmed available hourly variables:

- **Trapping / ventilation:** `boundary_layer_height`, `wind_speed_10m`,
  `wind_speed_100m`, `wind_direction_10m`, `wind_direction_100m`, `wind_gusts_10m`,
  `surface_pressure`, `pressure_msl`, `vapour_pressure_deficit`
- **Thermodynamic:** `temperature_2m`, `relative_humidity_2m`, `dew_point_2m`,
  `apparent_temperature`
- **Fuel dryness:** `soil_temperature_*`, `soil_moisture_*` (4 depth bands each),
  `et0_fao_evapotranspiration`
- **Removal / radiation:** `precipitation`, `rain`, `cloud_cover`,
  `shortwave_radiation`, `sunshine_duration`

**Not available (confirmed absent):** temperature on pressure levels or at multiple
heights, and any direct inversion-strength variable. **You cannot compute a true
lapse-rate inversion index from this endpoint.**

Derive a ventilation index instead — `prepare_data.py` builds it:

```
ventilation_index = boundary_layer_height * wind_speed_10m
```

Low PBL × low wind is the classic Chiang Mai basin trapping night. Also worth
engineering: nocturnal minimum PBL, and PBL growth from 06:00 to 15:00.

---

## 4. Burn scar and land use beyond FIRMS — mostly blocked

- **GISTDA burn scar** via `envilink.go.th/dataset/burn-scar`: both the HTML page
  and the CKAN API path returned **HTTP 403** to automated fetch. Envilink is
  CKAN-based, so `https://envilink.go.th/api/3/action/package_show?id=burn-scar` is
  the right call — the 403 smells like bot filtering. **Try it yourself; it costs
  one request.** ⚠️ Unverified but promising.
- **GISTDA Disaster Platform** (`disaster.gistda.or.th/fire`): a JS application.
  A download pattern exists (`/services/download?type=flood`) but `type=fire`
  returned the app shell, not data. **No usable fire API endpoint found.**
- **ตามรอยเผา (TamRoyPao)** [tamroypao.hii.or.th](https://tamroypao.hii.or.th) —
  Sentinel-2, **20 m pixels**, burn scar by crop type, 7-day cycles,
  **GeoTIFF downloads by grid and CSV by administrative division**. Kasetsart
  University, NRCT-funded. **This is the best burn-scar option and it is
  downloadable.**
- **Fallback that works:** ESA WorldCover (10 m global land cover, free, no key,
  direct GeoTIFF) plus FIRMS hotspot counts clipped to district polygons
  reconstructs most of what a burn-scar layer gives you. ⚠️ Endpoint not verified
  in this session.

**Extending FIRMS beyond 3 years** — confirmed:

```
https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{W,S,E,N}/{DAY_RANGE}/{DATE}
```

`DAY_RANGE` max **10**; rate limit 5,000 transactions / 10 min; MAP_KEY free. The
optional trailing `{DATE}` is what lets you walk backwards — loop in 10-day windows.
Use `MODIS_SP` / `VIIRS_*_SP` (Standard Processing) for historical, not `_NRT`.
There is a **`data_availability`** endpoint that reports the exact valid date range
per source — call it first rather than guessing (it needs a MAP_KEY, so the
earliest dates could not be verified here). `fetch_data.fetch_firms()` implements
this loop.

---

## 5. Forecast data — avoiding leakage. **WORKS, NO KEY.**

The cleanest win in the search. Both verified from official docs.

**Option A — Previous Runs API** (fixed lead time)
`https://previous-runs-api.open-meteo.com/v1/forecast`
Variables use `{variable}_previous_day{N}`, N = 0–7. Verbatim from the docs:
*"`_previous_day1` is the value that was predicted 24 hours before valid time."*
So **`temperature_2m_previous_day1` is exactly "what was forecast yesterday for
today"**. Archive from **January 2024** for most models.
⚠️ Docs mention `past_days`/`forecast_days` but **do not document
`start_date`/`end_date`** — untested.

**Option B — Historical Forecast API (recommended, and what this repo uses)**
`https://historical-forecast-api.open-meteo.com/v1/forecast`
Verbatim: *"a continuous hourly timeseries built by stitching the first hours of
each successive model run"* — an archive of what the models actually predicted.
**Earliest ~2021** (ECMWF IFS HRES to 2017-01-01). **`start_date`/`end_date` ARE
supported** — confirmed.

The docs draw the distinction you need explicitly: this API *"closely tracks actual
conditions because each run is initialised from real measurements,"* whereas the
ERA5 Historical Weather API is *"optimised for long-term consistency rather than
day-to-day accuracy."*

> **Why this matters for the report.** ERA5 is a reanalysis — it assimilates
> observations from **after** the valid time. Training a next-day PM2.5 model on
> ERA5 predictors and claiming operational skill is a textbook leakage error, and
> it is exactly what an examiner will look for. Train on the Historical Forecast
> API and your model is honest and deployable. Keep ERA5 for the climatology and
> trend sections, where hindsight is legitimate.

---

## Summary

| Source | Endpoint | Key | Earliest | Resolution | Verdict |
|---|---|---|---|---|---|
| **OpenAQ S3 archive** | `openaq-data-archive.s3.amazonaws.com/...` | **No** | 2016 (**ends 2022** for TH) | station | ✅ measured, keyless |
| OpenAQ API v3 | `api.openaq.org/v3` | Yes (free) | — | — | 🔑 for station lookup only |
| OpenAQ API v2 | — | — | — | — | ❌ 410 Gone |
| **CCDC DustBoy** | `open-api.cmuccdc.org/api/dustboy/data5year/{id}` | **Yes** (approval) | ~5 yrs | station | 🔑 **best for urban–rural** |
| CCDC direct download | `cmuccdc.org/download_json/{id}` | — | — | — | ❌ 302 → key-gated |
| Air4Thai history | `air4thai.pcd.go.th/webV2/history/` | ? | ? | station | ❓ TLS chain broken |
| Envilink (PCD + GISTDA) | `envilink.go.th/api/3/action/package_show?id=...` | ? | ? | — | ❓ 403 to me; retry yourself |
| Sensor.Community | `data.sensor.community/airrohr/v1/filter/area=...` | No | 2015 | station | ⚠️ 2 sensors, both urban |
| WAQI / aqicn | token form | Yes | ~2012 (daily AQI) | station | ⚠️ AQI not µg/m³ |
| **ERA5 archive** | `archive-api.open-meteo.com/v1/archive` | **No** | **1940** | 0.25° | ✅ **has `boundary_layer_height`** |
| **Historical Forecast** | `historical-forecast-api.open-meteo.com/v1/forecast` | **No** | ~2021 | varies | ✅ **use this to avoid leakage** |
| Previous Runs | `previous-runs-api.open-meteo.com/v1/forecast` | No | Jan 2024 | varies | ✅ `_previous_day{N}` |
| CAMS air quality | `air-quality-api.open-meteo.com/v1/air-quality` | No | Aug 2022 | **0.4° / 45 km** | ⚠️ too coarse within-province |
| FIRMS area API | `firms.modaps.eosdis.nasa.gov/api/area/csv/...` | Yes (free) | unverified | per-overpass | ✅ 10-day windows |
| TamRoyPao burn scar | [tamroypao.hii.or.th](https://tamroypao.hii.or.th) | ? | ? | **20 m** | ✅ GeoTIFF + CSV downloads |
| GISTDA burn scar API | — | — | — | — | ❌ no scriptable endpoint found |

---

## Could not verify — stated plainly

1. **The two-coordinate CAMS test.** `robots.txt` blocked the API host from the
   research fetcher, and both available shells are behind an egress proxy that
   denied it. The 0.4°/45 km resolution is confirmed from the official spec and
   the grid arithmetic is sound, but the returned series were not observed.
   **Notebook §3 runs it. Do that before writing another line of analysis code.**
2. **Chiang Mai OpenAQ location IDs** — blocked by the v3 key requirement.
3. **Whether Thai OpenAQ ingestion stopped in 2022 network-wide** — confirmed for
   station 418 only.
4. **Air4Thai's historical endpoint** — broken TLS certificate chain on the host.
5. **Envilink / GISTDA burn scar** — 403 to automated fetch; likely bot filtering.
6. **How fast a DustBoy API key arrives** — not published.
7. **FIRMS archive earliest dates** — `data_availability` needs a MAP_KEY.

## Suggested order of action

1. **Apply for the DustBoy key now** — everything spatial depends on it and it has
   a human in the approval loop.
2. **Run notebook §3** (the CAMS grid test).
3. `boundary_layer_height` is already added to the ERA5 pull — re-fetch to get it.
4. Switch next-day model predictors to the Historical Forecast API (already wired
   in `fetch_data.py`; set `RUN_FETCH = True`).
