# PM2.5 in Northern Thailand: from raw data to a recommendation

DS-270702 Data Science Programming · Homework 4 · Chiang Mai University

Name: _________________________  Student ID: _________________

---

## How to run everything, in order

```bash
git clone <this repo> && cd <this repo>
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# optional but recommended: a free NASA FIRMS key
#   https://firms.modaps.eosdis.nasa.gov/api/area/
echo "YOUR_MAP_KEY" > firms_key.txt

python src/fetch_data.py      # 1. download; writes data/raw/ and data/processed/
python src/prepare_data.py    # 2. clean, join, aggregate, build features
python src/checks.py          # 3. checkpoints C1, C2, C3, C4, C6
python src/analyse.py         # 4. figures 01-06 into outputs/figures/
python src/model.py           # 5. baselines, models, checkpoint C5
```

Or open `notebooks/01_fetch_and_explore.ipynb`, which imports the same modules
and walks through steps 1–4 with the output visible. The notebook is for
exploring and for the presentation clip; the scripts are the deliverable.

First run takes several minutes (many API calls). Subsequent runs reuse the raw
responses in `data/raw/` and are fast.

---

## Repository layout

```
README.md              this file
requirements.txt       exact packages used
firms_key.txt          your NASA FIRMS key (NOT committed - see .gitignore)

src/
  config.py            every path, endpoint, coordinate and constant
  fetch_data.py        downloads raw data, writes data/raw/
  prepare_data.py      cleaning, joining, feature construction
  checks.py            checkpoints C1-C4 and C6 as runnable evidence
  analyse.py           figures and descriptive statistics
  model.py             baselines, training, evaluation, checkpoint C5

notebooks/
  01_fetch_and_explore.ipynb

data/
  raw/                 exactly what each API returned, untouched
  processed/           parsed and joined tables

outputs/
  figures/             fig01_*.png ... fig09_*.png
  results/             metrics.json, metrics.csv, and every audit table

docs/
  REPORT_GUIDE.md          where the number for each report section lives
  RESEARCH_prevention.md   verified prevention measures, Chiang Mai
  RESEARCH_recovery.md     verified relief/compensation options and costings
  RESEARCH_data_sources.md additional data sources, verified endpoints

report/
  report.pdf           the written report
```

---

## Data sources

| # | Source | Endpoint | Key | Period | What it is |
|---|---|---|---|---|---|
| 1 | Open-Meteo Air Quality | `air-quality-api.open-meteo.com/v1/air-quality` | none | 2023-01-01 → present | **Copernicus CAMS model output**, 0.4° (~45 km) grid, hourly |
| 2 | Open-Meteo Archive | `archive-api.open-meteo.com/v1/archive` | none | 1940 → present | **ERA5 reanalysis**, 0.25° (~25 km), hourly |
| 3 | Open-Meteo Historical Forecast | `historical-forecast-api.open-meteo.com/v1/forecast` | none | ~2021 → present | **What the weather model actually predicted ahead of time** |
| 4 | Air4Thai (PCD) | `air4thai.pcd.go.th/services/getNewAQI_JSON.php` | none | current reading only | **Measured** ground stations, 174 nationwide |
| 5 | NASA FIRMS | `firms.modaps.eosdis.nasa.gov/api/area/csv` | free | 2023-01-01 → present | Satellite fire hotspot detections |

Sources 1–3 are **model output**. Source 4 is an **instrument**. They are not the
same kind of thing, and the difference is measured in checkpoint C6.

Source 3 is not in the lab sheet's suggested list and was added deliberately —
see *Leakage* below.

---

## Reproducibility

`OVERWRITE = False` in `config.py` makes every fetch reuse the raw file already in
`data/raw/`, so a clean clone plus the committed raw files reproduces every number
exactly.

**Two things change if you re-fetch:**

1. **Air4Thai returns the current reading only.** It has no working history
   endpoint. Running `fetch_data.py` on a different day produces a genuinely
   different `air4thai_current.json`. This is why the C6 comparison is a snapshot
   and why the code appends to `outputs/results/c6_ground_truth.csv` rather than
   overwriting it — run it on several days and report the accumulated bias.

2. **`END_DATE` is computed as today minus 7 days.** The ERA5 archive lags real
   time by roughly five days, so a fixed offset keeps the fetch from returning a
   partially-populated final day. Re-fetching later extends the series.

### What is committed, and what is not

| Path | Committed | Why |
|---|---|---|
| `data/raw/` (49 files, ~22 MB) | yes | The assignment requires that `data/raw/` holds exactly what the API returned. Nothing here has been touched after download |
| `data/processed/daily_panel.csv` | yes | The joined daily panel. With this file you can run `src/analyse.py` and `src/model.py` and reproduce every figure and metric with no API key at all |
| `data/processed/model_table.csv` | yes | The modelling table, features and targets already built |
| `data/processed/openmeteo_*_hourly.csv` | no | Large intermediates, ~35 MB, rebuilt by `python run_all.py` |
| `data/processed/firms_hotspots.csv` | no | ~27 MB of raw fire detections. The daily counts derived from it are already inside `daily_panel.csv` |
| `firms_key.txt`, `.env` | never | API credentials. The key is read from this file or from the `FIRMS_MAP_KEY` environment variable and never appears in any source file |
| `outputs/` | yes | Figures, metrics and checkpoint results, so the report can be checked against them without re-running anything |

**Known gap in `data/raw/`:** the FIRMS responses are not there. The FIRMS fetch on
the first run wrote outside the project root, and only the aggregated
`firms_hotspots.csv` survived. Everything downstream of it is intact, and the daily
fire counts used in the analysis are in `daily_panel.csv`.

### Licence

Code is MIT. The files under `data/` are not: they belong to Copernicus CAMS,
Open-Meteo, Air4Thai and NASA FIRMS, and each keeps its own terms. See `LICENSE`
for the attribution each one requires.

---

## Target definition (Rule 1)

> **Regression** — the mean of the 24 hourly PM2.5 values for calendar day *t+1*,
> Asia/Bangkok local time, at Mueang Chiang Mai, in µg/m³.
>
> **Classification** — whether that same daily mean exceeds 37.5 µg/m³.
>
> **Moment of prediction: the end of day *t*.**

"PM2.5" is not a target. The sentence above is.

---

## Leakage: why there is a third Open-Meteo endpoint

Rule 2 requires that every feature be knowable at the moment of prediction.
Tomorrow's wind speed is not.

ERA5 (source 2) is a **reanalysis**: it assimilates observations made *after* the
valid time. Using ERA5's day *t+1* wind as a feature to predict day *t+1* PM2.5
produces a model that scores well and cannot be deployed, because on a real day
*t* that value does not exist yet. It is the single most common way this
assignment goes wrong.

This project handles it in three layers:

1. **A separate source.** The historical forecast archive (source 3) returns what
   the weather model predicted for day *t+1* before day *t+1* began. Those columns
   are prefixed `fc_` and are legitimately knowable.
2. **An allow-list.** `prepare_data.feature_columns()` admits only columns matching
   `*_lag0..3`, `*_roll3`, `*_roll7`, `fc_*`, and a short list of calendar terms.
   A raw same-day observation cannot enter by accident.
3. **A guard that raises.** `model.leakage_guard()` throws `AssertionError` if
   anything named for tomorrow, or any un-lagged weather column, reaches the
   feature list. It fails the run rather than producing an impressive wrong number.

---

## Split strategy (Rule 4)

Time-ordered, not random. Train ends `2025-05-31`; test begins `2025-06-01`.

The data has time order, so the test set must be the later portion. Beyond that,
the test window is chosen to contain **a complete burning season**, because that
is the period a warning system has to work in. A random split would let the model
see days on either side of a test day — with a lag-1 autocorrelation near 0.89
that is close to handing it the answer — and would measure nothing a forecast has
to do.

Cross-validation on the training portion uses `TimeSeriesSplit` (Rule 5). Expect
a large fold-to-fold spread: contiguous blocks of a strongly seasonal series give
some folds almost no exceedance days. That is a property of the split meeting the
signal, not model instability, and `model.py` prints it rather than hiding it
behind a mean.

---

## Metrics (Rule 6)

Roughly 9–10% of days exceed the standard, so accuracy is not reported as a
headline: a model that predicts "safe" every day scores about 0.90 and is useless.

- **Regression** — MAE, RMSE, R², each reported three ways: all days, burning
  season only, and **transition days only** (days where the exceedance status
  changes). The third is the one that matters.
- **Classification** — recall and precision on the *exceeds* class, F1, PR-AUC,
  and the full confusion matrix, with the count of **missed dangerous days**
  stated explicitly.
- **Operating point** — the decision threshold is chosen for ~90% recall rather
  than left at 0.5, and the resulting false-alarm count is reported. A warning
  system that misses half the dangerous days is worse than no system, because
  people stop trusting it; one that cries wolf is ignored just as fast.

---

## Rule 7 · One data quality problem found and fixed, one limitation that remains

**Found and fixed — incomplete days, and Air4Thai's `-1`.**
Aggregating hourly to daily without a coverage rule lets a day represented by a
few hours count the same as a full day, which biases the exceedance count.
`prepare_data.py` requires ≥18 of 24 hours and drops the rest. Separately,
Air4Thai encodes missing values as the string `-1`, not null; averaging without
converting produces a number that is quietly wrong. `fetch_data._to_number()`
masks values ≤ −1 before any arithmetic. Two smaller ones: wind direction is
averaged as a unit vector (the arithmetic mean of 350° and 10° is 180°, the
opposite direction), and `shift(-1)` is validated so it cannot pair
non-consecutive days across a gap.

**Could not fix — the primary source is a model, not a measurement.**
Every PM2.5 value here is CAMS output on a ~45 km grid with no terrain. Chiang
Mai's defining mechanism is smoke trapped in a mountain basin under a nocturnal
inversion, and a 45 km flat cell cannot represent it. Air4Thai would be the fix,
but it publishes no history, so the record cannot be rebuilt from measurements.
C6 quantifies the gap at the times it can be measured; the multi-year measured
series that would remove the limitation is exactly the thing this project does
not have.

---

## Checkpoints

| | Question | Where the answer is produced |
|---|---|---|
| C1 | Time | `checks.c1_time()` — same day fetched twice, UTC vs Asia/Bangkok, 7-hour shift shown |
| C2 | The join | `checks.c2_join()` + `outputs/results/join_audit.csv` |
| C3 | Missing values | `checks.c3_missing()` + `outputs/results/c3_missing.csv` |
| C4 | Comparing places | `checks.c4_places()` + `outputs/results/c4_place_comparison.csv` |
| C5 | Model vs baseline | `model.py` + `outputs/results/metrics.json` |
| C6 | Ground truth | `checks.c6_ground_truth()` + `outputs/results/c6_ground_truth.csv` |

`docs/REPORT_GUIDE.md` maps every report section and marking criterion to the
file that holds the number.

---

## Known limitations

1. **CAMS is model output**, complete by construction; all exceedance counts are
   the model's. Magnitude of disagreement with instruments: see C6.
2. **Spatial resolution 0.4° (~45 km)** is coarser than a within-province
   question. Points closer than that return identical data; C4 tests which.
3. **The record covers four burning seasons.** That supports climatology and
   description, not seasonal forecasting and not a trend claim.
4. **Air4Thai has no history endpoint**, so ground-truth comparison is a snapshot
   at the moment of running, not a validation across the record.
5. **FIRMS hotspots have detection latency.** Near-real-time products lag by
   about three hours; standard-processing products by longer. A hotspot feature is
   operationally knowable only with the NRT product.
6. **Correlation is not attribution.** Hotspot counts near a location do not
   establish that those fires caused that location's PM2.5; that needs an
   atmospheric transport model.

---

## AI disclosure

See the final page of the report. Every line of code in this repository must be
explicable at the oral defence.
