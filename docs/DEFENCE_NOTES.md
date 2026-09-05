# Defence notes — the whole project in one page

The repository is large. The **ideas** are seven. If you can say these seven
things in your own words, you can defend the project.

> **The rule you can always fall back on, and it is not a weakness:**
> "I used an AI assistant for this part. Here is what it does, here is why I
> kept it, and here is the part I changed." That is a complete answer. The
> disclosure table exists precisely so that this is allowed.
>
> **The rule that is a weakness:** being unable to say what a piece of code does.
> If that is true of anything in here, **delete it.** A smaller project you
> understand completely scores higher than a large one you cannot explain —
> Section 10 says marks are for method, not performance.

---

## The seven ideas

**1 · The data is not measured. It is a model.**
Open-Meteo's air quality product is Copernicus CAMS, a global atmospheric model.
How I know: PM2.5 is 0.00% missing across 3.7 years of hourly data. No
instrument does that — real monitors lose data to calibration and power cuts.
So every "day over the standard" in my report is the model's count, not the air's.

**2 · So I measured how wrong the model is.**
Air4Thai stations are real instruments. I compared them against CAMS at the same
place and time. CAMS reads **low by about 5.4 µg/m³, at all 14 stations, without
exception.** That means my exceedance counts are probably under-counts.
*(Limitation I state myself: the comparison was made at 7–18 µg/m³, in the rainy
season. I do not know whether the same bias holds near 37.5.)*

**3 · The grid is coarser than it looks, and I caught it.**
Two points 12 km apart inside Chiang Mai returned **byte-identical** data for
168 hours — while the API reported *different* coordinates. The reported
coordinate is not evidence of independence; only comparing the values is. This
is why my spatial analysis uses the four provinces (100–250 km apart) and not
districts.
*This is my best data-quality finding. It is also the one AI got wrong first —
its check compared coordinates and passed. I found the identical values and
rewrote the check to compare the data.*

**4 · Predicting tomorrow is easy; predicting the day it changes is not.**
Daily PM2.5 has lag-1 autocorrelation 0.89, so "tomorrow equals today"
(persistence) is a strong baseline. It has MAE 3.6 on ordinary days and **10.6
on the 5.5% of days that cross the standard.** Those crossing days are the only
days a warning system exists for. That is where I measured my model, and that is
where it wins.

**5 · I refused to use tomorrow's weather as a feature.**
ERA5 is a *reanalysis* — it absorbs observations made after the fact. Using
tomorrow's ERA5 wind to predict tomorrow's PM2.5 gives a great score and cannot
be deployed, because on a real day that number does not exist yet. I used a
separate forecast archive instead, and I ran a sensitivity test with those
columns removed to show how much of the result depends on them.

**6 · Recall matters, accuracy does not.**
About 10% of days exceed the standard. Predicting "safe" every day scores 90%
accuracy and is useless. I report recall on exceedance days, and I chose the
decision threshold deliberately: at ~90% recall the system misses 4 dangerous
days and raises 26–30 false alarms in 454 days. Catching all of them would take
99 false alarms — a warning every 4.5 days, which teaches people to ignore it.

**7 · "Days over the standard" is the wrong way to judge policy.**
Fires and smoke track each other strongly day to day (Spearman ≈ 0.70). But year
to year the relationship disappears: the year with the most fire detections had
the fewest exceedance days. So the year-to-year swing in exceedance days is
mostly weather, not burning — and a province judged on that number is being
judged on the weather.

---

## What each file does, one line each

| File | What it does |
|---|---|
| `src/config.py` | Every path, URL, coordinate and constant. Nothing else hard-codes them. |
| `src/fetch_data.py` | Downloads the data, saves the raw JSON untouched, logs every call. |
| `src/prepare_data.py` | Hourly → daily, joins the sources, builds the features and the targets. |
| `src/checks.py` | The six checkpoints, each producing evidence rather than an assertion. |
| `src/analyse.py` | Draws the figures and writes the descriptive tables. |
| `src/model.py` | Baseline, models, evaluation, chooses the warning threshold. |
| `run_all.py` | Runs the above in order. |
| `check_leakage_sensitivity.py` | Reruns the model with the forecast columns removed. |

---

## Six questions you will probably be asked

**"Why did you drop days with fewer than 18 hours?"**
A daily mean from 6 hours is not comparable to one from 24, and averaging them
together would bias the exceedance count. `MIN_HOURS_PER_DAY` in `config.py`.
Dropping is safer than imputing because I cannot know what the missing hours held.

**"Why is your test set the last portion instead of random?"**
The data has time order. With lag-1 autocorrelation 0.89, a random split lets the
model see the days either side of a test day, which is close to handing it the
answer. My test window also contains a whole burning season, which is the period
the system would have to work in.

**"Your cross-validation score and test score disagree. Why?"**
`TimeSeriesSplit` cuts the record into contiguous blocks, and this signal is
strongly seasonal, so some folds contain almost no exceedance days and score near
the base rate. It is a property of the split meeting the signal, not model
instability. I report the spread rather than only the mean.

**"Your model loses to the baseline overall. Isn't that a failure?"**
No, it is the finding. Persistence is unbeatable on the quiet days that dominate
the average. The model earns its place on the transition days — 11.8–12.1 against
the baseline's 14.1 — and those are the only days a warning matters.
*(With the forecast and hotspot features it also wins overall, 3.95 vs 4.12, but
that margin is smaller than my measurement uncertainty and I do not lead with it.)*

**"Why average wind direction as a vector?"**
The arithmetic mean of 350° and 10° is 180° — the opposite direction. I convert to
unit vectors, average those, and convert back.

**"What would you do with more time?"**
Retrain on measured data instead of CAMS — the CMU DustBoy network has five years
of hourly station data, including stations in Mae Chaem and Chiang Dao, which
would fix both the model-versus-instrument problem and the resolution problem.

---

## If you are short on time, cut in this order

Everything below is optional. Removing it does not break the pipeline, and
anything you cannot explain is worth more deleted than submitted.

1. `check_leakage_sensitivity.py` — nice-to-have. Delete the script and the two
   CSVs, and state the leakage argument in words instead.
2. `fig05` (weekly pattern) — a negative result; you have more figures than the
   required three.
3. The `hgb` models — keep `ridge` and `logreg` only. They are simpler to explain
   and the conclusion does not change.
4. The FIRMS hotspot features — if you keep them, be ready to say that satellite
   detections have latency and that a hotspot count for day *t* is only knowable
   on day *t* with the near-real-time product.

**Do not cut:** the six checkpoints, the baseline comparison, or the honest
statement of what the analysis does not support. Those are where the marks are.
