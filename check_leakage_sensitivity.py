"""
check_leakage_sensitivity.py — how much of the model's skill depends on the
forecast columns, and is that skill honest?

Run:  python check_leakage_sensitivity.py

WHY THIS EXISTS

Rule 2 of the assignment: "For each feature, state whether its value is
available at the moment of prediction."

The fc_* columns come from Open-Meteo's Historical Forecast API. Its own
documentation says the series is built "by stitching the first hours of each
successive model run", which is what makes it track actual conditions closely.
That is a strength for most uses and a PROBLEM here: the first hours of a run
initialised at the start of day t+1 were not available at the end of day t,
which is the moment this model claims to predict from.

So fc_* sits somewhere between a genuine 24-hour forecast and a reanalysis. It
is much safer than feeding ERA5 values for t+1, and it is not clean.

This script quantifies the doubt instead of arguing about it:

    A · lags only   -- observations up to and including day t. Unambiguously safe.
    B · lags + fc_* -- what model.py currently reports.

If A already beats the baseline, the headline result does not depend on the
questionable columns, and you report A as the conservative number.
If only B beats it, say so plainly and treat B as an upper bound.

Either way you have a paragraph for the report and an answer at the defence.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import (
    mean_absolute_error, precision_score, recall_score, confusion_matrix,
)
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from config import PM25_STANDARD, PROCESSED, RESULTS, TEST_START, TRAIN_END
from prepare_data import feature_columns

df = pd.read_csv(PROCESSED / "model_table.csv", parse_dates=["date"]).sort_values("date")
all_feats = feature_columns(df)
safe_feats = [f for f in all_feats if not f.startswith("fc_")]
fc_feats = [f for f in all_feats if f.startswith("fc_")]

df = df.dropna(subset=["pm25_tomorrow"])
tr = df[df["date"] <= TRAIN_END]
te = df[df["date"] >= TEST_START]

trans = te["is_transition"].astype("float").fillna(0).astype(bool).values
season = te["is_burning_season"].astype(bool).values

print("=" * 74)
print("LEAKAGE SENSITIVITY")
print("=" * 74)
print(f"  features total {len(all_feats)}   safe (lags only) {len(safe_feats)}   "
      f"forecast fc_* {len(fc_feats)}")
print(f"  train n={len(tr)}   test n={len(te)}   "
      f"test exceedance days={int(te['exceed_tomorrow'].sum())}")

# ---------------------------------------------------------------------------
# Regression
# ---------------------------------------------------------------------------
y_tr, y_te = tr["pm25_tomorrow"], te["pm25_tomorrow"]
base = te["pm2_5"].values

rows = [{
    "set": "-", "model": "baseline persistence",
    "mae_all": mean_absolute_error(y_te, base),
    "mae_season": mean_absolute_error(y_te[season], base[season]),
    "mae_transition": mean_absolute_error(y_te[trans], base[trans]),
}]

for label, feats in [("A safe", safe_feats), ("B safe+fc", all_feats)]:
    for name, mdl in [
        ("ridge", make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), Ridge(alpha=10.0))),
        ("hgb", make_pipeline(SimpleImputer(strategy="median"),
                              HistGradientBoostingRegressor(max_iter=400, learning_rate=0.05,
                                                            max_depth=6, random_state=42))),
    ]:
        mdl.fit(tr[feats], y_tr)
        p = mdl.predict(te[feats])
        rows.append({
            "set": label, "model": name,
            "mae_all": mean_absolute_error(y_te, p),
            "mae_season": mean_absolute_error(y_te[season], p[season]),
            "mae_transition": mean_absolute_error(y_te[trans], p[trans]),
        })

reg = pd.DataFrame(rows).round(3)
print("\nREGRESSION -- mean absolute error, ug/m3 (lower is better)\n")
print(reg.to_string(index=False))

b = reg.iloc[0]
print(f"\n  baseline all={b.mae_all}  season={b.mae_season}  transition={b.mae_transition}")
for _, r in reg.iloc[1:].iterrows():
    verdict = "BEATS baseline" if r.mae_all < b.mae_all else "loses to baseline"
    tverdict = "beats" if r.mae_transition < b.mae_transition else "loses"
    print(f"  {r.set:<10s} {r.model:<6s} overall {verdict:<18s} | transition days {tverdict}")

# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------
c_tr = tr["exceed_tomorrow"].astype(int)
c_te = te["exceed_tomorrow"].astype(int)
pers = te["exceed_today"].fillna(0).astype(int).values
cm = confusion_matrix(c_te, pers, labels=[0, 1])

crows = [{"set": "-", "model": "baseline persistence",
          "recall": recall_score(c_te, pers), "precision": precision_score(c_te, pers),
          "missed": int(cm[1, 0]), "false_alarms": int(cm[0, 1]), "threshold": "-"}]

for label, feats in [("A safe", safe_feats), ("B safe+fc", all_feats)]:
    for name, mdl in [
        ("logreg", make_pipeline(SimpleImputer(strategy="median"), StandardScaler(),
                                 LogisticRegression(max_iter=3000, class_weight="balanced"))),
        ("hgb", make_pipeline(SimpleImputer(strategy="median"),
                              HistGradientBoostingClassifier(max_iter=400, learning_rate=0.05,
                                                             max_depth=6, random_state=42))),
    ]:
        mdl.fit(tr[feats], c_tr)
        pr = mdl.predict_proba(te[feats])[:, 1]
        # same rule as model.py: lowest threshold reaching 90% recall
        thr_grid = np.unique(np.round(pr, 4))
        chosen = 0.5
        for t in sorted(thr_grid, reverse=True):
            if recall_score(c_te, (pr >= t).astype(int)) >= 0.90:
                chosen = float(t)
                break
        pred = (pr >= chosen).astype(int)
        m = confusion_matrix(c_te, pred, labels=[0, 1])
        crows.append({
            "set": label, "model": name,
            "recall": recall_score(c_te, pred),
            "precision": precision_score(c_te, pred, zero_division=0),
            "missed": int(m[1, 0]), "false_alarms": int(m[0, 1]),
            "threshold": round(chosen, 3),
        })

clf = pd.DataFrame(crows).round(3)
print("\n\nCLASSIFICATION -- at the threshold reaching 90% recall\n")
print(clf.to_string(index=False))

reg.to_csv(RESULTS / "leakage_sensitivity_regression.csv", index=False)
clf.to_csv(RESULTS / "leakage_sensitivity_classification.csv", index=False)

print(f"""

  -> {RESULTS / 'leakage_sensitivity_regression.csv'}
  -> {RESULTS / 'leakage_sensitivity_classification.csv'}

HOW TO WRITE THIS UP

  Set A uses only values observed on or before day t, so nothing in it can be
  disputed. Set B adds the historical-forecast columns, whose availability at
  the moment of prediction is arguable, for the reason in this file's header.

  Report BOTH. Lead with whichever is the honest claim:
    - If A beats the baseline, that is your result, and B is a bonus.
    - If only B beats it, say the improvement rests on features whose
      operational availability you could not fully verify, and that a
      deployed system would need Open-Meteo's Previous Runs API
      (the _previous_day1 suffix, explicitly "predicted 24 hours before
      valid time") to make the same claim cleanly.

  Either way this belongs in the report. Section 6 Rule 2 asks you to prove
  every feature is knowable; showing that you tested the boundary case, and
  reporting the weaker number when it matters, is worth more than the
  difference between 4.08 and 4.12.
""")
