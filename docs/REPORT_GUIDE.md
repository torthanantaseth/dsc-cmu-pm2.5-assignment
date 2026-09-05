# Report guide — where every number lives

The lab sheet says *"Every number in the report must be traceable to a file in your
repository."* This document is that mapping.

---

## First: how your three "models" map onto the assignment

You described three things you wanted to build. Only one of them is a machine
learning model, and that is fine — it is where the marks are anyway.

| What you called it | What it actually is in the assignment | Marks |
|---|---|---|
| **Prediction model** | Part C · Machine learning | **20** |
| **Preventional model** | Part D · Recommendation (the prevention half) | part of **20** |
| **Recovery model** | Part D · Recommendation (the relief half) | part of **20** |

Prevention and recovery are **not** things you train. They are recommendations, and
the lab sheet is explicit about what earns nothing:

> *"A recommendation such as 'the government should reduce burning' earns no marks.
> Everyone knew that before you started. Say something your data earned."*

So the test for every sentence in Part D is: **which figure or table in
`outputs/` is this standing on?** If the answer is "none", it is an opinion, and
opinions are the cheapest thing in the report.

---

## The three prediction levels, assessed honestly

| Level you planned | Feasible? | What to write |
|---|---|---|
| **1 · Seasonal** (which part of next year) | **No, not as a forecast** | The record starts 2023-01-01 → **four burning seasons**. You cannot train or validate a seasonal forecast on n=4; adding ENSO/IOD indices does not fix it, because you still cannot validate. What you **can** do, and what fig01 does, is climatology plus a stated season-onset rule, then report how the window moved. Write in Limitations: *"my data supports a climatology, not a seasonal forecast, because it contains four seasons."* That sentence earns marks under "honest about what it does not support." |
| **2 · Short-term** (tomorrow) | **Yes — the core** | `model.py` regression. Baseline persistence. The interesting result is not the headline MAE. |
| **3 · Caution** (warning) | **Yes — and it maps onto real law** | `model.py` classification at 37.5. The statutory "surveillance zone" trigger is exactly 37.5 and the "disease control zone" is 75 (see `RESEARCH_prevention.md` §7). Your threshold choice is choosing when to invoke a legal category, not just when to print a warning. |

---

## Section-by-section

### §1 Problem background (max 2 pages — do not pad, it carries the fewest marks)

| Claim you might make | Source |
|---|---|
| Standard is 37.5 µg/m³, in force since 1 June 2023 | `RESEARCH_prevention.md` §8, PCD |
| Statutory triggers at 37.5 and 75 µg/m³ | `RESEARCH_prevention.md` §7 |
| 2026 was the worst season on record despite the longest ban | `RESEARCH_prevention.md` §0 |
| Myanmar contributes 31.5% of peak-season PM2.5 in western Northern Thailand | `RESEARCH_prevention.md` §4, *Atmosphere* 15(11):1358 |
| Chiang Mai's annual PM2.5 welfare cost ฿70,356 M | `RESEARCH_recovery.md` §4.1, PIER |
| +10 µg/m³ → +1.6% mortality over 6 days | `RESEARCH_recovery.md` §4.3, CMU Faculty of Medicine |

### §2 Approach

State the question you set out to answer and **what you expected to find before you
started**. The lab sheet asks for that explicitly. Two honest expectations worth
writing down, because both turned out to matter:

- *"I expected a gradient-boosted model with weather features to beat persistence."*
  It did not, overall — see §4 below.
- *"I expected two points 90 km apart inside Chiang Mai to be different places in
  the data."* Notebook §3 tests whether they are.

### §3 Method

| Item | File |
|---|---|
| Sources, endpoints, date ranges, row counts, retrieval times | `data/processed/fetch_log.csv` |
| Coordinates requested vs grid cells served | `fetch_log.csv` columns `req_lat/req_lon` vs `grid_lat/grid_lon` |
| Cleaning and joining decisions | `src/prepare_data.py` docstring; `outputs/results/join_audit.csv` |
| Target definition | `model.TARGET_STATEMENT`, printed at run time |
| Feature list and provenance | `outputs/results/feature_list.csv`; README "Leakage" |
| Split justification | README "Split strategy"; printed by `model.load_split()` |

### §4 Results

| Item | File |
|---|---|
| fig01–fig06 with captions | `outputs/figures/`, `outputs/results/figure_captions.csv` |
| Season onset/end per year | `outputs/results/season_onset.csv` |
| Exceedance days per year | `outputs/results/exceedance_by_year.csv` |
| Weather on worst vs best days | `outputs/results/weather_by_pm25_quartile.csv` |
| Persistence diagnostics | `outputs/results/persistence_diagnostics.csv` |
| All model metrics | `outputs/results/metrics.json`, `metrics.csv` |
| Per-day test predictions | `outputs/results/predictions_test.csv` |
| fig07 model vs baseline, fig08 threshold | `outputs/figures/` |

**"Include results that did not work out"** — the lab sheet asks for this, and you
have a good one. From the run on the current data:

| | All days | Burning season | **Transition days** |
|---|---|---|---|
| Persistence baseline MAE | 4.13 | 6.85 | **14.08** |
| Ridge MAE | 4.22 | 6.45 | **11.81** |
| HGB MAE | 4.24 | 6.51 | **11.41** |

**The model loses to persistence overall and wins where it counts.** Daily PM2.5
has lag-1 autocorrelation 0.89, so persistence is nearly unbeatable on the quiet
days that dominate the average. On the ~5% of days that cross the standard —
the only days a warning system exists for — the model cuts the error by about 19%.

Write it in that order: baseline first, honest overall loss, then the breakdown.
That is a stronger and more defensible claim than "my model is better", and it is
the kind of narrow, earned finding the lab sheet is asking for.

Classification, same run: persistence recall 0.822 / precision 0.822; logistic
regression at the 90%-recall operating point recall 0.911 / precision 0.621,
missing 4 dangerous days and raising 25 false alarms over 453 test days.

### §5 Conclusion and recommendation

This is 20 of 100 marks and it is the section the lab sheet says separates a
Master's submission from an undergraduate one. Answer all five of its questions
explicitly:

**a. What specifically do you recommend?**
Pick one or two, costed, not a list of ten. Three that your own analysis supports:

1. **Change the KPI.** Chiang Mai reports "days over 37.5" as its outcome measure.
   In 2026 hotspots rose 134% while exceedance days fell 12% — meteorology
   dominates the year-to-year signal. Your `boundary_layer_height` and
   ventilation-index results are the evidence. Recommend reporting **emission**
   (hotspots, burned area) and **ventilation-adjusted** exposure separately, so
   policy is not judged by the weather. *Audience: the provincial working group and
   the NRE Office.*
2. **Add an air-pollution category to the existing disaster relief schedule.**
   The เงินทดรองราชการ schedule has lines for floods and storms and none that fits
   "could not work for six weeks". The trigger (125 µg/m³ × 5 days) and the
   disbursement machinery already exist — this is an amendment to a schedule, not a
   new agency or law. Cost it with the household numbers in
   `RESEARCH_recovery.md` §2 and §6. *Audience: DDPM and the provincial governor.*
3. **Fund the filters, not just the boxes.** Thailand has 4,875 clean-air rooms
   with no published filter-replacement budget; California's AB 836 funds five
   years of filters up front. Recurring cost is what kills these programmes in
   year two. *Audience: MoPH Health Center 1 Chiang Mai.*

**b. Who is it for?** Name a real body. "The government" is not an audience.

**c. What does your analysis actually support, and what are you extrapolating?**
Supported: the ventilation-versus-emission decomposition, the persistence
diagnostics, the transition-day result, the exceedance counts *as CAMS sees them*.
Extrapolated: everything costed from external sources; anything about health
outcomes; anything causal about policy.

**d. If your recommendation depends on your model, what happens on the days it is
wrong?** Answer with the actual confusion matrix. At the chosen operating point,
4 dangerous days pass unwarned. Combine with the +1.6%-per-10 µg/m³ mortality
elasticity to say what that means, and say plainly that a system missing that many
days is a system people will learn not to trust.

**e. What would you need that you do not have?**
- Multi-year **measured** PM2.5 at district resolution → CMU CCDC DustBoy (key
  pending). This is also what would let you answer the urban-versus-rural question
  the coarse grid blocks.
- Daily respiratory admissions for Chiang Mai → HDC needs supervisor sponsorship;
  NHSO open data is the accessible substitute.
- Monthly tourist arrivals by province → MOTS .xlsx, to test whether the
  March–April dip survives controlling for other provinces' seasonality.
- A register of school closures → does not appear to exist. That absence is itself
  worth one sentence.

### Appendix
Full tables from `outputs/results/`, the fetch log, and the feature list.

---

## Marking criteria → evidence

| Criterion | Marks | What earns it | Where |
|---|---|---|---|
| Data acquisition and reproducibility | 15 | Runs from a clean clone; raw preserved; sources documented precisely | `src/fetch_data.py`, `data/raw/`, `fetch_log.csv`, README |
| Data quality handling | 15 | Problems found and dealt with; C1–C4 answered with evidence | `src/checks.py`, all `outputs/results/*_audit.csv`, README "Rule 7" |
| Visualisation and interpretation | 15 | Figures answer questions; every one interpreted; units and labels | `src/analyse.py`, `figure_captions.csv` |
| Machine learning method | 20 | Correct split and CV; baseline present; metrics suited to the problem; Section 6 rules followed | `src/model.py`, `metrics.json` |
| Recommendation (Part D) | 20 | Concrete, named audience, supported, honest about limits | §5 above + `docs/RESEARCH_*.md` |
| Report quality | 10 | Required structure, clear English, numbers traceable | this file |
| Oral defence | 5 | Can run the code and explain any line | — |

> *"Marks are awarded for method, not for model performance. A carefully executed
> project that reports a model losing to its baseline scores higher than a careless
> project reporting an impressive number."*

You have the first kind of result. Report it as such.

---

## Submission checklist

- [ ] Repository public, or instructor added as collaborator
- [ ] README explains how to run everything, in order
- [ ] `requirements.txt` lists the packages **actually used** — run `pip freeze` in
      your own environment and paste, do not ship the loose ranges
- [ ] Cloned into a fresh folder and re-ran everything; it worked
- [ ] `data/raw/` contains exactly what the APIs returned
- [ ] All figures exist as separate files in `outputs/figures/`
- [ ] Model metrics saved in `outputs/results/`
- [ ] Report follows the required structure and is a PDF
- [ ] **All six checkpoints answered in the report** (not just in the code)
- [ ] Baseline score reported alongside model score
- [ ] Recommendation names a specific audience
- [ ] AI disclosure table completed
- [ ] **`firms_key.txt` is NOT committed** (it is in `.gitignore` — verify)
- [ ] I can explain every line of code I submitted

---

## Before you submit: two things to double-check

**1 · Re-fetch.** The data currently in `data/processed/` predates two additions:
`boundary_layer_height` (the strongest available trapping proxy) and the historical
forecast archive (which is what makes the next-day model leakage-free). Set
`RUN_FETCH = True` in the notebook, or run `python src/fetch_data.py`, and re-run
the pipeline. The numbers in this guide will shift; use your own.

**2 · Run notebook §3.** The CAMS grid test could not be executed from the
environment this repository was assembled in. It determines whether any
within-province spatial claim is admissible. Run it first, and let the answer
decide what fig03 and the C4 paragraph say.
