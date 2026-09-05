# Part D — From a result to a recommendation

Draft material for §5 Conclusion of the report. **20 of 100 marks.**

The lab sheet's test:
> *"A recommendation such as 'the government should reduce burning' earns no marks.
> Everyone knew that before you started. Say something your data earned."*

So every sentence below is tied to a figure or a number in `outputs/`. Where a
claim comes from external research rather than your own analysis, it is labelled.
Where the data does not support a claim, that is said instead of hidden.

---

## The evidence you actually have

| # | Finding | Where |
|---|---|---|
| E1 | Daily PM2.5 lag-1 autocorrelation **0.894** — yesterday explains 80% of today | fig06 |
| E2 | Persistence MAE **3.59** on stable days but **10.60** on the 5.5% of days that cross 37.5 | `persistence_diagnostics.csv` |
| E3 | Model loses to persistence overall (4.22 vs 4.13) and beats it on transition days (11.81 vs 14.08) | `metrics.json`, fig07 |
| E4 | Classifier at threshold 0.58: catches **41 of 45** exceedance days, **25 false alarms** over 453 days. Persistence catches **37 of 45** with **8** false alarms | fig08, threshold sweep |
| E5 | Catching all 45 requires threshold 0.02 and **99 false alarms** — a warning every 4.5 days | threshold sweep |
| E6 | **Wind speed correlates with PM2.5 at −0.014.** Effectively zero | fig04, `weather_by_pm25_quartile.csv` |
| E7 | No weekday effect in either season; error bars overlap throughout | fig05 |
| E8 | **Chiang Rai exceeds Chiang Mai in every one of the four years** (44/22/36/51 vs 40/11/29/45) | fig03 |
| E9 | Exceedance days swing 11 → 40 → 29 → 45 with no trend; 2024 had 3% of days over, 2026 had 18.8% | fig02, `exceedance_by_year.csv` |
| E10 | Season onset moved 2 Feb → 20 Mar → 21 Feb → 5 Mar across four years | fig01, `season_onset.csv` |
| E11 | **Every PM2.5 column is 0.00% missing** across 3.7 years — the source is a model, not an instrument | `c3_missing.csv` |

External research used below is sourced in `RESEARCH_prevention.md` and
`RESEARCH_recovery.md`; each is marked **[R]**.

---

# Recommendation A — a one-day-ahead exceedance warning for the clean-air-room network

**Audience: Health Center 1 Chiang Mai (ศูนย์อนามัยที่ 1 เชียงใหม่), which operates the
northern clean-air-room programme, and the Chiang Mai Provincial Public Health Office.**

### The gap this fills

Thailand's Occupational Disease and Environmental Disease Control Act already
defines a **surveillance and prevention zone at PM2.5 > 37.5 µg/m³**, which
obliges agencies to distribute masks to vulnerable groups and to prepare
dust-free areas in hospitals, schools and community centres **[R]**. The northern
network reported **2,275 clean air rooms and 218,415 users** in 2026 **[R]**.

Every one of those obligations is triggered by a **measurement that has already
happened**. Masks are distributed on the day the air is already bad; a room opens
after people have breathed the morning.

### What the analysis supports

E2 is the argument for a model at all. On the 94.5% of days when conditions do not
change, "tomorrow will be like today" is right to within 3.6 µg/m³, and no
warning system is needed — everyone can already see it. The information gap is
concentrated in the **5.5% of days that cross the standard**, where the naive
forecast is wrong by 10.6 µg/m³, three times worse.

E4 is what a model buys on those days, expressed in the only units that matter:

| Approach | Dangerous days caught | **Missed** | False alarms |
|---|---|---|---|
| Persistence ("assume tomorrow is like today") | 37 of 45 | **8** | 8 |
| Logistic regression, threshold 0.58 | 41 of 45 | **4** | 25 |

**The model halves the number of dangerous days that arrive unannounced, and pays
for it by roughly tripling false alarms.** That is the whole trade, stated plainly.

### The specific recommendation

1. Publish, each evening, a **next-day probability that the daily mean will exceed
   37.5 µg/m³** for each provincial centre, alongside the current-conditions
   number already published.
2. Set the decision threshold by the **asymmetry of the two errors, not at 0.5**.
   A false alarm costs one day of opening a room that was not needed and one day
   of masks — reversible, cheap, already budgeted. A miss costs a day of
   unprotected exposure for 1.62 million people in vulnerable groups **[R]**.
   Threshold 0.58 is the value that delivers ~90% recall on this data.
3. **Do not chase zero misses.** E5 says catching the last four days requires a
   threshold of 0.02 and 99 false alarms — a warning once every 4.5 days, which
   is the behaviour that teaches people to ignore warnings. The four missed days
   are the price of a system that stays credible, and that price should be stated
   publicly rather than buried.

### What happens on the days the model is wrong

There are **two** ways this system is wrong, and only one of them is the model's fault.

**Model error.** Four exceedance days in 453 pass unwarned. Using the CMU Faculty
of Medicine estimate that each +10 µg/m³ of daily PM2.5 raises Chiang Mai's
mortality rate by 1.6% over the following six days **[R]**, those four days are
not a rounding error. A warning system must publish its own miss rate, or it is
asking for a trust it has not earned.

**Source error, which is larger and is not the model's fault.** E11: this model
was trained on CAMS output, so it predicts *the model's* exceedance days, not the
air's. Checkpoint C6 measures the disagreement against Air4Thai instruments. If
CAMS is biased near the 37.5 boundary, the true number of missed days differs
from four, and it could differ in either direction. **Before this system is
deployed on anything, it must be retrained on measured data.** Everything above is
a demonstration that the method works, not a system that is ready.

---

# Recommendation B — report exposure and ventilation separately; stop judging policy by "days over the standard"

**Audience: the Chiang Mai provincial PM2.5 working group and the Provincial
Office of Natural Resources and Environment (สนง.ทสจ.เชียงใหม่).**

### The problem

"Days over 37.5" is the number the province reports and the number the public
judges it by. E9 shows why that is a bad instrument for judging policy: exceedance
days ran 40 → 11 → 29 → 45 over four years, an almost fourfold swing. Was 2024, at
3% of days, a policy triumph?

External evidence says no, and says it sharply: in 2026 Chiang Mai's hotspots rose
**134%** and burned area **108%**, while days over the standard **fell 12%** **[R]**.
Emissions roughly doubled and the headline outcome measure improved. A province
judged on that number is being judged on the weather.

### What the analysis adds — including a negative result

E6 is the interesting part, and it is a result that did not go the way I expected.
**Wind speed correlates with daily PM2.5 at −0.014 — indistinguishable from zero.**
The median wind speed on the cleanest quartile of days (4.15 km/h) and on the
dirtiest quartile (4.16 km/h) are the same number.

This matters because "it was a bad year for wind" is the usual informal
explanation, and this data gives it no support at all. The dispersion mechanism is
real but surface wind speed does not measure it. In a basin like Chiang Mai the
relevant quantity is the **depth of the layer the smoke is mixed into**, not the
speed of the air at 10 metres.

Humidity (−0.71) and rainfall (−0.71) correlate strongly, but they are confounded
with season: the rainy months are also the months nobody burns. They describe
*when*, not *why*.

### The specific recommendation

Report two numbers each season instead of one:

1. **An emission measure** — hotspot count and burned area, which the province
   already collects through GISTDA and the FireD permit system **[R]**.
2. **A ventilation-adjusted exposure measure** — exceedance days, normalised by
   the season's atmospheric mixing conditions, so that a bad-weather year and a
   bad-burning year are distinguishable.

The concrete implementation is a ventilation index, boundary-layer height ×
wind speed, available free and hourly back to 1940 from the ERA5 archive
(`config.WEATHER_VARS` now requests it).

### What this analysis does not yet support

**Honestly: I cannot yet demonstrate that the ventilation index works, because
`boundary_layer_height` was added to the fetch after the current dataset was
built.** What E6 establishes is the *negative* half — that the obvious variable
fails — which is what motivates the recommendation. Running the decomposition is
the immediate next step and it requires no new data source, only a re-fetch.
Say this in the report rather than implying the decomposition was done.

---

# Recommendation C — test whether protection spending tracks exposure, because on this data it does not

**Audience: the Chiang Mai and Chiang Rai provincial working groups, and whoever
allocates the MoNRE northern haze budget.**

### The finding

E8 is the most unexpected result in this project. Chiang Rai has **more exceedance
days than Chiang Mai in all four years**:

| Year | Chiang Rai | Chiang Mai | Lampang | Mae Hong Son |
|---|---|---|---|---|
| 2023 | **44** | 40 | 32 | 11 |
| 2024 | **22** | 11 | 15 | 7 |
| 2025 | **36** | 29 | 23 | 14 |
| 2026 | **51** | 45 | 23 | 23 |
| **Total** | **153** | 125 | 93 | 55 |

Consistency across four independent years is what makes this worth raising; a
one-year gap would be noise.

Set against that, Chiang Mai received **฿73,418,000 in FY2569, the largest
provincial allocation of any province**, and Mae Hong Son — which burned 1,110,340
rai — received less **[R]**.

### The specific recommendation

The province should test, using its own Air4Thai station records, whether the
northern haze budget is allocated in proportion to population-weighted exposure or
in proportion to political attention. The test is cheap: station-days over 37.5,
weighted by district population, regressed on allocation per province.

### What this does not support

**This is a hypothesis, not a finding, and the report must say so.** Four grid
points of a 45 km global model is not a basis for moving a budget. Chiang Mai has
far more people than Mae Hong Son, so exposure-days and population-weighted
exposure are different quantities and the ranking may reverse. And the whole
comparison inherits E11 — it is the model's exceedance days.

What the analysis legitimately does is **raise a question the province can answer
in an afternoon with data it already owns.** That is a reasonable thing for an
analyst to hand over.

---

# Recommendation D — the relief schedule has no line for air pollution

**Audience: the Department of Disaster Prevention and Mitigation (ปภ.) and the
Chiang Mai provincial governor.**

### The gap

On 5 April 2026 Chiang Mai, Lamphun and Phayao were declared disaster zones,
unlocking the governor's emergency advance funds. **The trigger is PM2.5 above 125
µg/m³ for five consecutive days** **[R]** — that is, relief becomes available only
after five days have already been endured.

The payment schedule those funds draw on lists emergency living expenses for total
loss of a home (฿4,900), livelihood tools (฿13,500), house repair (up to ฿88,600),
funeral costs (฿35,700) **[R]**. Every category is written for floods and storms:
physical damage, injury, death. **None of them fits "I could not work, could not
open my shop, and had to buy an air purifier, for six weeks."**

### Why this is a real cost, not a hardship story

Median monthly household income in Chiang Mai is **฿18,620**, and northern
households already spend **77.5% of income** **[R]**. An entry-level air purifier
at ฿2,240–3,590 is **12–19% of one month's median income**, plus ~฿191 of
electricity and ฿930–1,890 of filters per season. This is a liquidity constraint,
not a preference — which is why information campaigns do not shift it and a
subsidy would.

### What your data contributes

The exposure-day counts are the basis a per-household payment would be calculated
from. E9: Chiang Mai had **45 exceedance days in the first 240 days of 2026**,
against 11 in all of 2024 — so a payment indexed to exceedance days automatically
scales with severity, and it uses a number the state already publishes.

### The specific recommendation

Add an **air-pollution category (หมวดภัยจากมลพิษทางอากาศ)** to the existing
เงินทดรองราชการ schedule, indexed to exceedance days, using the existing 125 µg/m³
trigger and the existing disbursement machinery. **This is an amendment to a
schedule — no new agency, no new law, no new payment system.**

Two design points the evidence supports:

- **A voucher, not a tax deduction.** Air purifiers qualified under Easy E-Receipt
  2.0 and the category grew 400% **[R]** — but a deduction is worth ฿0–1,500 to a
  household in the 0–5% marginal band and ฿10,500 to a top-bracket Bangkok
  household. It subsidises the people least constrained.
- **Fund the filters, not just the boxes.** Thailand's 4,875 dust-free rooms have
  no published filter-replacement budget; California's AB 836 programme funds
  **five years of replacement filters up front** **[R]**. Recurring cost is what
  kills these programmes in year two. Note also the inversion in the cost table:
  the cheap DIY fan-and-filter unit (฿948) draws 49 W against a modern purifier's
  19 W, so a hardware-only subsidy pushes poor households onto the option with the
  highest running cost.

### What this does not support

Everything in this recommendation except the exposure-day counts comes from
external sources, not from my analysis. I have not estimated take-up, deadweight
loss, or the health benefit of a purifier in a Thai house — and the indoor
concentration achieved by the ฿3,600 CMU clean-air-room kit **has never been
published** **[R]**, so its cost-effectiveness cannot be computed by anyone,
including me.

---

# What this analysis does not support (collect these in one place)

1. **The true number of exceedance days.** Every count is CAMS's. C6 measures the
   disagreement with instruments at the times it can be measured.
2. **Any trend.** Four years, one of them incomplete. E9 shows swings, not a
   direction. 2026 is 240 days and is not comparable to a full year.
3. **Seasonal forecasting.** Four burning seasons cannot train or validate a
   model that predicts next year's onset. E10 describes what happened; it does not
   forecast. The 2024 season measures 2 days by the stated rule (E10) purely
   because that year's 7-day mean grazed the threshold — evidence that a
   fixed-threshold definition is fragile, and a reason to report the sensitivity.
4. **Urban versus rural inside Chiang Mai.** The source grid is ~45 km; points
   closer than that return identical data. Checkpoint C4 tests it.
5. **Causation.** Nothing here shows which fires caused which city's PM2.5. That
   needs an atmospheric transport model.
6. **Policy effect.** This data cannot say whether the burning ban worked. That
   needs enforcement records and a comparison group.

---

# What I would need that I do not have

| Need | Source | Status |
|---|---|---|
| Multi-year **measured** PM2.5 at district resolution — would fix limitations 1 and 4, and is what Recommendation A must be retrained on before deployment | CMU CCDC DustBoy, `data5year` endpoint | Key requires registration and admin approval — **apply now** |
| Daily respiratory admissions for Chiang Mai — would let Recommendation A's missed days be costed in health outcomes rather than mortality-elasticity arithmetic | HDC (MoPH) | Needs a supervisor's signed authorisation. **NHSO open data is the accessible substitute** |
| Monthly tourist arrivals by province — would test whether the March–April dip survives controlling for other provinces' seasonality, turning "tourism suffers" into a difference-in-differences result | MOTS annual .xlsx | Freely downloadable, not yet used |
| Burn-permit records and burn-scar timing — would let the ban-displacement question be tested, which nobody has published for Thailand | Envilink FireD dataset; TamRoyPao (Sentinel-2, 20 m) | Envilink returned 403 to automated access; try from a browser |
| A register of school closures | — | **Does not appear to exist.** That absence is itself worth one sentence |

---

## How to use this document

Do not paste it in. Pick **two** recommendations — A and one other — and write them
in your own words at the length the page budget allows. A short, specific,
honestly-bounded recommendation scores better than four hedged ones.

Re-run the pipeline before you quote any number here; the figures above come from
the dataset as it stood before `boundary_layer_height` and the forecast archive
were added, and they will shift.
