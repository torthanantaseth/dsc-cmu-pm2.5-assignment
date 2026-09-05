# DRAFT — Sections 3 and 4 only

**Read this before using it.** This is a draft of the two factual sections, written
from the numbers your pipeline produced. Every figure in it is traceable to a file
in `outputs/`, and you can check any of them in a minute. Rewrite it in your own
voice before submitting — the sentences here are a scaffold, not a submission, and
the assignment says the report is written by you.

Sections 1, 2 and 5 are deliberately not drafted. Section 5 in particular carries
20 marks and has to be your judgement about which recommendation to make.

Numbers marked **[CHECK]** are ones you should re-read off the file before trusting.

---

# 3 · Method

## 3.1 Data sources

Four sources were used. Three are model output and one is a physical instrument;
the distinction runs through the whole of Section 4.

| # | Source | Endpoint | Product | Period retrieved | Rows |
|---|---|---|---|---|---|
| 1 | Open-Meteo Air Quality | `air-quality-api.open-meteo.com/v1/air-quality` | Copernicus CAMS Global, 0.4° (~45 km), hourly | 2023-01-01 – 2026-08-29 | 128,352 |
| 2 | Open-Meteo Archive | `archive-api.open-meteo.com/v1/archive` | ERA5 reanalysis, 0.25°, hourly | 2023-01-01 – 2026-08-29 | 128,352 |
| 3 | Open-Meteo Historical Forecast | `historical-forecast-api.open-meteo.com/v1/forecast` | Archived model forecasts, hourly | 2023-01-01 – 2026-08-29 | 128,352 |
| 4 | Air4Thai (Pollution Control Department) | `air4thai.pcd.go.th/services/getNewAQI_JSON.php` | Ground stations, current reading only | snapshot at time of running | 173 stations |
| 5 | NASA FIRMS | VIIRS/MODIS fire detections | Satellite thermal anomalies | 2023-01-01 – 2026-09-02 | 334,388 detections |

Variables requested from source 1: `pm2_5, pm10, carbon_monoxide, dust`.
From source 2: thirteen meteorological variables including `boundary_layer_height`,
`wind_speed_10m`, `relative_humidity_2m`, `precipitation` and
`soil_moisture_0_to_7cm`. From source 3: seven forecast variables, used only as
described in §3.4.

Four locations were fetched, the provincial capitals of Chiang Mai
(18.7883, 98.9853), Chiang Rai (19.9086, 99.8325), Lampang (18.2855, 99.5130) and
Mae Hong Son (19.3020, 97.9650). Mueang Chiang Mai is the primary location for all
modelling. The choice of provincial capitals rather than districts is a consequence
of checkpoint C4 and is explained in §4.2.

Every API call is logged in `data/processed/fetch_log.csv` with its endpoint,
parameters, requested and served coordinates, date range, row count, retrieval
timestamp and status: 49 successful calls. Raw responses are preserved unmodified
in `data/raw/` (49 files, 22 MB) and re-running the pipeline reads from them, so a
clean clone reproduces every number in this report.

**Reproducibility caveat.** One source cannot be reproduced. Air4Thai returns the
current reading only and has no working history endpoint, so running
`src/fetch_data.py` on a different day produces a different `air4thai_current.json`.
This is why the ground-truth comparison in §4.2 is a set of snapshots accumulated
across repeated runs rather than a validation across the record.

## 3.2 Cleaning and aggregation

**Hourly to daily.** A calendar day (Asia/Bangkok) is retained only if at least 18
of its 24 hours are present, and dropped otherwise rather than averaged. A daily
mean computed from six hours is not comparable to one computed from 24, and mixing
them would bias the count of days above the standard without producing any error.
In this dataset no day was dropped, because the source is complete — which is
itself the finding in §4.2 under C3.

**Wind direction** is averaged as a unit vector rather than arithmetically: the
arithmetic mean of 350° and 10° is 180°, the opposite direction.
**Precipitation** is summed over the day rather than averaged. **PM2.5** is
summarised by daily mean, maximum, minimum and standard deviation, because the
daily mean conceals the nocturnal peak.

**Air4Thai** encodes missing values as the string `-1`, not as null, and returns
every field as a string including coordinates. Values at or below −1 are masked
before any arithmetic; averaging without this step produces a number that is
quietly wrong. The endpoint also serves an incomplete TLS certificate chain and
requires `verify=False`.

**Fire detections** are converted to daily counts within 50 km and 100 km of each
location by haversine distance. A day with no detection is recorded as zero, not as
missing, because a satellite pass with no thermal anomaly is information.

## 3.3 Joining

Sources 1, 2 and 3 were joined on `(location, date)` after aggregation. The join is
exact: 128,352 hourly rows per source, 5,348 daily rows per source after
aggregation, and 5,348 rows after the inner join, with no key present in one source
and absent from another. Fire counts were then left-joined. Full row accounting is
in `outputs/results/join_audit.csv` and is discussed under C2 in §4.2.

## 3.4 Target definition and feature construction

> **Target.** The mean of the 24 hourly PM2.5 values for calendar day *t+1*,
> Asia/Bangkok local time, at Mueang Chiang Mai, in µg/m³ (regression); and whether
> that daily mean exceeds 37.5 µg/m³ (classification).
>
> **Moment of prediction: the end of day *t*.**

115 features were admitted (`outputs/results/feature_list.csv`). Each falls into one
of three groups, and the group determines whether it is knowable at the moment of
prediction:

1. **Observed up to and including day *t*** — lags 0 to 3 and rolling 3- and 7-day
   means of PM2.5, PM10, carbon monoxide, dust, the meteorological variables, and
   the fire counts; plus short-term change terms (`pm25_delta_1d`, `pm25_delta_3d`,
   `pm25_above_roll7`). Unambiguously available.
2. **Forecast for day *t+1*** (`fc_*`) — from source 3, the archived forecast.
   Discussed below.
3. **Calendar** — day-of-year as sine and cosine, month, day of week, weekend and
   burning-season indicators.

**Values from day *t+1* are never used as features.** The temptation is to take
tomorrow's wind speed from the ERA5 archive, which would raise the score
substantially. ERA5 is a reanalysis: it assimilates observations made after the
valid time, so that value does not exist at the moment the forecast is issued, and
a model trained on it cannot be deployed. Three mechanisms enforce this: features
are admitted by an allow-list matching only the patterns above
(`prepare_data.feature_columns`); a guard raises `AssertionError` if any column
named for tomorrow, or any un-lagged meteorological column, reaches the feature
list (`model.leakage_guard`); and the forecast columns are drawn from a separate
endpoint that archives what was predicted rather than what was later analysed.

**A limitation of that third mechanism, stated here rather than discovered at the
defence.** Open-Meteo documents the historical forecast series as being built by
stitching the first hours of each successive model run, which is what makes it
track actual conditions closely. The first hours of a run initialised at the start
of day *t+1* were not available at the end of day *t*. The `fc_*` columns therefore
sit between a genuine 24-hour forecast and a reanalysis. They are far safer than
ERA5 values for *t+1*, and they are not clean. A deployed system should use
Open-Meteo's Previous Runs API, whose `_previous_day1` suffix is explicitly
documented as the value predicted 24 hours before valid time.

## 3.5 Split strategy

Training: 2023-01-01 to 2025-05-31, 882 days. Test: 2025-06-01 to 2026-08-28,
454 days.

The data has time order, so the test set is the later portion. Two further reasons
for this particular boundary. First, daily PM2.5 has a lag-1 autocorrelation of
0.894 (§4.3), so a random split would place days either side of a test day into
training — close to handing the model the answer, and measuring nothing that a
forecast has to do. Second, the test window deliberately spans a complete burning
season (January–May 2026), which is the period in which a warning system would have
to work; evaluating on a window of clean-season days would produce a flattering
number about a period nobody needs a forecast for.

Cross-validation on the training portion uses `TimeSeriesSplit` with five folds.
The consequence of this choice on a strongly seasonal series is reported in §4.4
rather than hidden behind a mean.

## 3.6 Models and baselines

**Baselines are scored first and on the same test set.**

- Regression: **persistence** — tomorrow's daily mean equals today's.
- Classification: **persistence** — tomorrow exceeds the standard if today did —
  and **majority class**, which predicts "safe" every day.

**Models.** Regression: ridge regression (α = 10) and histogram gradient boosting
(400 iterations, learning rate 0.05, max depth 6). Classification: logistic
regression with balanced class weights, and histogram gradient boosting with the
same settings. All are preceded by median imputation, and the linear models by
standardisation.

**Metrics.** Approximately 10% of days exceed the standard, so accuracy is not
reported as a headline: predicting "safe" every day achieves about 0.90 and is
useless. Regression is reported as MAE, RMSE and R², each computed three ways — all
test days, burning-season days, and **transition days**, defined as days where the
exceedance status changes between *t* and *t+1*. Classification is reported as
recall and precision on the exceeding class, F1, PR-AUC, and the full confusion
matrix with the number of missed dangerous days stated explicitly.

---

# 4 · Results

## 4.1 The scale of the problem

*(Figure 2 — `fig02_exceedance_trend.png`)*

| Year | Days in record | Days above 37.5 µg/m³ | % of days | Mean PM2.5 | Max |
|---|---|---|---|---|---|
| 2023 | 365 | 40 | 11.0 | 21.9 | 70.3 |
| 2024 | 366 | 11 | 3.0 | 19.8 | 47.5 |
| 2025 | 365 | 29 | 7.9 | 23.1 | 91.2 |
| 2026 | 241 | 45 | 18.7 | 24.6 | 99.4 |

*Source: `outputs/results/exceedance_by_year.csv`.*

**What a reader should take from Figure 2.** The burden is concentrated and it
swings. Monthly means in June to September sit near 10–16 µg/m³ in every year,
while March and April reach 38–54. Between years the count of exceedance days
varies almost fourfold, from 11 to 45.

Two things this table does not show. **2026 is incomplete** — 241 days — so its
count is not comparable to a full year, which is why the percentage column is
given. And **four years is not a trend.** The correct reading is that the burden
varies substantially between years; any statement about direction would be
unsupported by a record this short.

*(Figure 1, in the appendix, defines season onset as the first day the 7-day rolling
mean exceeds 37.5 µg/m³. On that rule the season ran 2 Feb – 17 Apr in 2023,
21 Feb – 10 Apr in 2025 and 5 Mar – 1 May in 2026. The 2024 value of two days
should not be read as "almost no season": that year's rolling mean grazed the
threshold and fell back, which shows how fragile a fixed-threshold definition is
near the boundary.)*

## 4.2 Data quality: the six checkpoints

### C1 · Time

Verified rather than asserted. The same request was issued twice for
2024-03-15 at Mueang Chiang Mai, differing only in the `timezone` parameter. With
`timezone=UTC` the API reported `utc_offset_seconds = 0` and a value of
37.1 µg/m³ at 00:00. With `timezone=Asia/Bangkok` it reported
`utc_offset_seconds = 25200` and the same value, 37.1 µg/m³, at 07:00 — a shift of
exactly seven hours. The time axis is therefore Thailand local time, and daily
means correspond to Thai calendar days.

This matters because PM2.5 in Chiang Mai peaks overnight. A UTC day runs from 07:00
to 07:00 local and would split the overnight peak across two days, lowering both
daily means and reducing the count of exceedance days without producing any error.

The two endpoints were also checked against each other: for Mueang Chiang Mai,
0 timestamps appear in the air-quality series and not the weather series, and
0 the other way. The join in §3.3 therefore pairs matching hours.

### C2 · The join

Each source returned 128,352 hourly rows across four locations, 32,088 hours per
location, or 1,337 days. After the ≥18-hour rule each source yielded 5,348 daily
rows, and the inner join returned 5,348 — no rows lost. Zero keys were present in
one source and absent from the other in either direction. Each location contributes
exactly 1,337 rows and the panel is 100.00% complete against the 1,337-day span.
*(`outputs/results/join_audit.csv`)*

### C3 · Missing values

38 columns are exactly 0.0000% missing, among them `pm2_5`, `pm10`,
`carbon_monoxide` and `dust`, across more than three and a half years of hourly
data. **No instrument achieves that.** Real monitors lose data to calibration,
power interruption, communication faults and maintenance — Air4Thai encodes such
gaps as `-1`, and 0 of its 14 northern stations returned a full record in the
snapshot used for C6.

A complete series is the signature of model output. Open-Meteo's air quality
product is Copernicus CAMS, a global atmospheric model that produces a value for
every cell and every hour whether or not anything was measured there.

Three consequences carry through the rest of this report. The errors in this
dataset are not random measurement noise but systematic model bias, correlated in
space and time. A model trained on these values learns to predict CAMS, not the
air. And every count of days above 37.5 µg/m³ in this report is CAMS's count; C6
measures the size of that gap.

The missing values that do appear are created by this pipeline, not by the source:
lag and rolling columns are undefined at the start of each location's series
(0.22% for lag-3 and 7-day rolling terms), and the targets are undefined on the
final day. *(`outputs/results/c3_missing.csv`)*

### C4 · Comparing places

Six points across Chiang Mai province were requested for one week of hourly data
(11–17 March 2024, 168 hours each) and the returned series compared pairwise.

**Mueang (18.7883, 98.9853) and Hang Dong (18.6883, 98.9214), 12 km apart,
returned byte-identical data — maximum absolute difference 0.0 µg/m³ across all
168 hours — while the API reported different served coordinates,
18.800/99.000 against 18.700/98.900.**

The reported coordinate is therefore not evidence of independence. Open-Meteo
reports the served point on a 0.1° grid while CAMS Global resolves 0.4°, so two
requests can be interpolated from the same coarse cell and still report different
coordinates. Only comparing the values detects this. Of 15 within-province pairs,
1 was identical and 14 differed.

A second and stronger reason not to build a spatial analysis on this source: over
the same week CAMS ranks **Mae Chaem among the cleanest** of the six points
(24.7 µg/m³ against Mueang's 31.0), yet Mae Chaem recorded the largest burned area
of any Chiang Mai district in 2026 at 253,040 rai **[CHECK your citation]**. A
~45 km cell average with no terrain cannot represent smoke trapped in a mountain
valley, so the model's district-level ordering is not credible.

The spatial analysis in this report is therefore restricted to the four provincial
capitals, 100–250 km apart, which were verified distinct: pairwise maximum absolute
differences of 69.0 to 131.4 µg/m³ and no identical pairs
(`outputs/results/c4_place_comparison.csv`). The urban–rural question is left
unanswered and appears in §5 under what would be needed.

*(Figure 3 — `fig03_places.png`.* Across the record, exceedance days number 153 for
Chiang Rai, 125 for Chiang Mai, 93 for Lampang and 55 for Mae Hong Son. Chiang Rai
exceeds Chiang Mai in each of the four years individually. This should be read
alongside the spatially varying bias reported under C6.)

### C5 · Model versus baseline

Reported in §4.4.

### C6 · Ground truth

CAMS was compared against measured Air4Thai stations in northern Thailand at the
moment of running, repeated across several runs and accumulated to **70 paired
observations** (`outputs/results/c6_ground_truth.csv`).

**Mean bias, CAMS minus measured: −5.38 µg/m³. Mean absolute difference:
5.38 µg/m³. Correlation across stations: 0.76. Every one of the 14 stations read
lower in CAMS than at the instrument, without exception.**

Which is right? The Air4Thai reading. It is an instrument at a point; CAMS is a
~45 km cell average produced by a global model.

The consequence is directional and it works against this report's own numbers: if
CAMS reads low by roughly 5 µg/m³, then days on which CAMS reports 33–37 µg/m³ may
in fact have exceeded the standard, and **the exceedance counts in §4.1 are more
likely to be under-counts than over-counts.**

Two limitations of this comparison. It was made at concentrations of
6.9–18.4 µg/m³ during the rainy season; whether the same bias holds near 37.5 is
not established by this evidence. And the bias is not spatially uniform — it ranges
from −0.7 µg/m³ at Yupparaj Wittayalai School in Chiang Mai to −9.1 µg/m³ at
Mae Moh in Lampang — so the between-province ranking in Figure 3 may partly reflect
uneven model bias rather than real differences in exposure.

## 4.3 What accompanies the worst days

Days were split into quartiles of daily mean PM2.5 and the meteorological
distributions compared (`outputs/results/weather_by_pm25_quartile.csv`, and Figure 4
in the appendix).

| Variable | Cleanest quartile, median | Dirtiest quartile, median | Spearman ρ with PM2.5 |
|---|---|---|---|
| Relative humidity (%) | 85.6 | 61.5 | **−0.706** |
| Precipitation (mm/day) | 12.6 | **0.0** | **−0.711** |
| Fire detections within 100 km | — | — | **+0.695** |
| Temperature (°C) | 26.5 | 25.3 | −0.100 |
| Boundary layer height (m) | 335.7 | 364.4 | **+0.069** |
| Ventilation index (m·km/h) | 1431.9 | 1473.3 | **+0.019** |
| Wind speed 10 m (km/h) | 4.15 | 4.16 | **−0.013** |

**Two of these did not go as expected, and both are worth reporting.**

**Wind speed is uncorrelated with PM2.5** — ρ = −0.013, and the median on the
cleanest and dirtiest quartiles of days is the same number to two decimal places.
The common informal explanation, that a bad year is a year with poor ventilation,
receives no support at all from this variable.

**Boundary layer height does not rescue it.** `boundary_layer_height` was added to
the fetch specifically to test the basin-trapping mechanism, on the reasoning that
a shallow mixing layer, not a slow wind, is what concentrates smoke in the Chiang
Mai valley. At daily-mean resolution it also shows effectively no relationship
(ρ = +0.069), as does the ventilation index built from it (ρ = +0.019). The most
likely reason is that a daily mean averages the deep, well-mixed afternoon layer
together with the shallow nocturnal one and cancels the signal; the relevant
quantity is plausibly the nocturnal minimum mixing depth, which was not computed.
**The dispersion mechanism is therefore not demonstrated in this analysis**, and
§5 does not claim it.

What does correlate is rainfall and humidity (both ≈ −0.71) and fire detections
(+0.695). The first two are confounded with season, since the wet months are also
the months in which nobody burns; they describe when, not why. The fire count is
the only variable here that is both strongly associated and causally upstream.

*(Figure 5, appendix.* Mean PM2.5 by day of week shows no weekly pattern in either
season; standard-error bars overlap throughout. A weekday effect would point to
traffic or industry. Its absence is consistent with sources — burning and
meteorology — that do not observe a calendar.)

## 4.4 Model performance against baseline (C5)

### Why a model is needed at all

*(Figure 6 — `fig06_persistence_limits.png`)*

Daily PM2.5 has a lag-1 autocorrelation of **0.894**, so yesterday explains about
80% of the variance in today. Persistence is consequently a strong baseline, and
across the whole record its mean absolute error is 3.98 µg/m³.

That average conceals the only part that matters:

| | Days | Persistence MAE |
|---|---|---|
| Days keeping the same side of 37.5 | 1,261 | **3.59** |
| **Days crossing 37.5** | **74 (5.5%)** | **10.60** |

*Source: `outputs/results/persistence_diagnostics.csv`.*

On the 94.5% of days when nothing changes, "tomorrow is like today" is right to
within 3.6 µg/m³, and no warning system is needed because everyone can already see
the air. The entire information gap is concentrated in the 5.5% of days that cross
the standard, where the naive forecast is wrong by three times as much. That is
where the model was measured.

### Regression

*(Figure 7 — `fig07_regression_vs_baseline.png`; 454 test days)*

| Model | MAE, all days | MAE, burning season | MAE, transition days |
|---|---|---|---|
| **Persistence baseline** | 4.118 | 6.846 | **14.079** |
| Ridge | 4.303 | 6.529 | **11.791** |
| Histogram gradient boosting | **3.946** | **6.424** | 12.098 |

*Source: `outputs/results/metrics.json`.*

Gradient boosting beats the baseline overall, by 4%, and both models beat it
substantially on transition days — ridge by 16%, gradient boosting by 14%.

The honest reading is the second one. A 4% improvement in overall MAE is smaller
than the model-versus-instrument bias measured in C6, and it is driven by the easy
days that dominate the average. The transition-day improvement is the result worth
reporting: on the days a forecast would actually be consulted, the model reduces
error from 14.1 to 11.8 µg/m³.

### Classification

*(Figure 8 — `fig08_classification_threshold.png`)*

45 of the 454 test days exceeded the standard, a base rate of 9.9%. The majority
classifier achieves 0.901 accuracy and recall 0.000; accuracy is not reported
further.

| | Recall | Precision | Missed dangerous days | False alarms |
|---|---|---|---|---|
| Persistence baseline | 0.822 | 0.822 | **8** | 8 |
| Logistic regression, at chosen threshold | 0.911 | 0.612 | **4** | 26 |

Logistic regression achieved PR-AUC 0.877 against a no-skill rate of 0.099.
Confusion matrix at threshold 0.344: 383 true negatives, 26 false alarms, 4 missed
exceedance days, 41 correct warnings.

**The threshold is a policy choice and was made deliberately, not left at 0.5.**
It was set to the lowest value achieving approximately 90% recall, on the reasoning
that the two errors are not symmetric: a false alarm costs one day of opening a
clean-air room and distributing masks, which is reversible and already budgeted,
while a miss costs a day of unprotected exposure. Relative to persistence, the
model **halves the number of dangerous days that arrive unannounced, from 8 to 4,
and pays for it by raising false alarms from 8 to 26.**

Chasing zero misses is not the right answer. Catching all 45 exceedance days
requires a threshold of 0.02 and produces 99 false alarms — a warning roughly every
four and a half days, which is the behaviour that teaches people to ignore warnings.
The four missed days are the price of a system that remains credible, and that
price should be published rather than concealed.

### Cross-validation disagrees with the test score, and why

`TimeSeriesSplit` cross-validation on the training portion gave PR-AUC
0.318 ± 0.292 for logistic regression, against 0.877 on the test set. The
discrepancy is a property of the split meeting the signal, not model instability:
contiguous folds of a strongly seasonal series place some folds almost entirely in
the clean half of the year, where there are few or no exceedance days and PR-AUC
falls to near the base rate. Reporting only the mean CV score would hide this. The
single test period is a fairer estimate here because it contains a complete season,
and the fold-to-fold standard deviation is reported alongside it.

## 4.5 A result that did not work out, and what it implies

*(Figure 10 — `fig10_emission_vs_outcome.png`)*

Fire detections were expected to explain both the daily variation and the
year-to-year variation in exceedance days. They explain the first and not the
second.

**Day to day**, fire detections within 100 km and daily mean PM2.5 move together
strongly: Spearman ρ = **0.695**, the strongest association of any variable
examined in §4.3.

**Year to year**, the relationship disappears:

| Year | Fire detections within 100 km | Days above 37.5 µg/m³ |
|---|---|---|
| 2023 | 19,190 | 40 |
| **2024** | **21,312** *(most)* | **11** *(fewest)* |
| **2025** | **9,329** *(fewest)* | 29 |
| 2026 | 19,491 | 45 |

*Source: `outputs/results/emission_vs_outcome.csv`. 2026 covers 241 days.*

The year with the most detected fires had the fewest exceedance days. The year with
the fewest fires — under half of 2024's total — had nearly three times as many bad
days as 2024.

Both statements are true simultaneously, and together they carry a conclusion
that neither carries alone: **the year-to-year variation in the number of days
above the standard is not principally a measure of how much burning occurred.**

This report cannot say what it is a measure of. The obvious candidate, dispersion,
is not supported by the meteorological variables available here (§4.3): daily-mean
boundary layer height, ventilation index and wind speed are all effectively
uncorrelated with PM2.5. Identifying the mechanism would need sub-daily mixing
depth, which was not computed, or transport modelling, which is out of scope.

What the finding does support is a negative claim, and it is the basis of the
recommendation in §5: a province whose performance is judged by its annual count
of days above the standard is being judged substantially by conditions it does not
control.

---

## Notes for you before you use this

1. **Sections 1, 2 and 5 are not drafted.** Section 5 carries 20 marks and should
   be your own argument. `docs/PART_D_DRAFT.md` has four costed options with their
   evidence chains; pick two.
2. **Recommendation B in that document needs adjusting.** It was written assuming
   the ventilation index would work. It does not (§4.3). The recommendation now
   rests on §4.5, which is the stronger leg anyway.
3. **`check_leakage_sensitivity.py` did not re-run after the FIRMS features were
   added** — its CSVs are from the earlier 103-feature run and do not match
   `metrics.json`. Either re-run it, or delete the two CSVs and keep only the
   qualitative leakage argument in §3.4. Do not quote both.
4. **Check the [CHECK] mark** in C4 — the Mae Chaem burned-area figure comes from
   a news source in `docs/RESEARCH_prevention.md`, not from your own data, and
   needs a citation.
5. **Figure 9 does not exist.** The ground-truth scatter is only generated in the
   notebook. Either run that cell or drop the reference; C6 stands on its numbers.
6. **Word count.** This draft is roughly 2,400 words, about 5–6 pages set with the
   six main-body figures. That leaves room for Sections 1, 2 and 5 within the
   8–12 page limit.
