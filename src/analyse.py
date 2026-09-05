"""
analyse.py — figures and descriptive statistics.

Run:  python src/analyse.py

Every figure is written to outputs/figures/ as a separate PNG at 200 dpi, with
axis labels carrying units and a caption printed to stdout that states what a
reader should conclude. A figure nobody discusses is decoration; each one here
answers a specific question from Part B of the lab sheet.

    fig01  When does the season start and end, and does it move between years?
    fig02  How many days per year exceed 37.5, and which way is the trend going?
    fig03  Does the problem look the same in different places?
    fig04  Which weather conditions accompany the worst days?
    fig05  Is there a weekly pattern?
    fig06  How much of a warning does persistence give you? (motivates the model)

Colour: series identity uses a CVD-validated categorical palette (adjacent-pair
CVD deltaE >= 8). AQI band shading deliberately uses Thailand's official PCD
colours instead, because that is the domain's standard encoding and northern Thai
readers already know it; it is a status scale, not a series scale, and it is
always accompanied by a labelled axis so it never carries meaning by colour alone.
"""

from __future__ import annotations

import os
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import (  # noqa: E402
    AQI_BREAKPOINTS, FIGURES, PM25_STANDARD, PRIMARY_LOCATION, PROCESSED, RESULTS,
)

# CVD-validated categorical palette, fixed order, never cycled.
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4",
          "#008300", "#4a3aa7", "#e34948"]
INK = "#0b0b0b"
INK2 = "#52514e"
GRID = "#e3e2de"

plt.rcParams.update({
    "figure.dpi": 110, "savefig.dpi": 200, "savefig.bbox": "tight",
    "font.size": 10, "axes.titlesize": 12, "axes.titleweight": "bold",
    "axes.labelsize": 10, "axes.edgecolor": GRID, "axes.labelcolor": INK,
    "axes.spines.top": False, "axes.spines.right": False,
    "text.color": INK, "xtick.color": INK2, "ytick.color": INK2,
    "grid.color": GRID, "grid.linewidth": 0.8, "legend.frameon": False,
    "figure.facecolor": "white", "axes.facecolor": "white",
})

CAPTIONS: list[dict] = []


def save(fig, name: str, caption: str, conclusion: str) -> None:
    path = FIGURES / f"{name}.png"
    fig.savefig(path)
    plt.close(fig)
    CAPTIONS.append({"figure": name, "file": path.name,
                     "caption": caption, "conclusion": conclusion})
    print(f"\n  -> {path}")
    print(f"     Caption: {caption}")
    print(f"     Conclusion: {conclusion}")


def load() -> tuple[pd.DataFrame, pd.DataFrame]:
    panel = pd.read_csv(PROCESSED / "daily_panel.csv", parse_dates=["date"])
    primary = panel[panel["location"] == PRIMARY_LOCATION].copy()
    return panel, primary


def aqi_bands(ax, xmax=None) -> None:
    """Shade Thailand's official PCD AQI bands behind the data."""
    lo_prev = 0
    for lo, hi, label, colour in AQI_BREAKPOINTS:
        top = min(hi, ax.get_ylim()[1])
        if top <= lo_prev:
            continue
        ax.axhspan(lo, top, color=colour, alpha=0.10, zorder=0, lw=0)
        lo_prev = top
    ax.axhline(PM25_STANDARD, color=INK, lw=1.2, ls="--", zorder=3)
    ax.annotate(f"Thai 24-h standard {PM25_STANDARD} " + r"$\mu$g/m$^3$",
                xy=(0.995, PM25_STANDARD), xycoords=("axes fraction", "data"),
                ha="right", va="bottom", fontsize=8.5, color=INK)


# ---------------------------------------------------------------------------
# fig01 - season onset and end
# ---------------------------------------------------------------------------

def fig01_season(primary: pd.DataFrame) -> pd.DataFrame:
    """
    Season onset = first day of the year on which the 7-day rolling mean of
    daily PM2.5 crosses 37.5 upward; end = last day it is above it. The rule is
    stated explicitly because "when the season starts" has no official definition,
    and a different rule gives different dates.
    """
    d = primary.sort_values("date").copy()
    d["roll7"] = d["pm2_5"].rolling(7, min_periods=5).mean()
    d["year"] = d["date"].dt.year
    d["doy"] = d["date"].dt.dayofyear

    rows = []
    for y, g in d.groupby("year"):
        over = g[g["roll7"] > PM25_STANDARD]
        if over.empty:
            rows.append({"year": y, "onset_doy": np.nan, "end_doy": np.nan,
                         "length_days": 0, "peak": g["pm2_5"].max(),
                         "peak_doy": g.loc[g["pm2_5"].idxmax(), "doy"]})
            continue
        rows.append({
            "year": y,
            "onset_doy": int(over["doy"].min()),
            "end_doy": int(over["doy"].max()),
            "onset_date": over["date"].min().strftime("%d %b"),
            "end_date": over["date"].max().strftime("%d %b"),
            "length_days": int(over["doy"].max() - over["doy"].min() + 1),
            "days_over_roll7": int(len(over)),
            "peak": round(float(g["pm2_5"].max()), 1),
            "peak_doy": int(g.loc[g["pm2_5"].idxmax(), "doy"]),
        })
    season = pd.DataFrame(rows)
    season.to_csv(RESULTS / "season_onset.csv", index=False)

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(11, 8),
                                   gridspec_kw={"height_ratios": [2, 1]})

    years = sorted(d["year"].unique())
    for i, y in enumerate(years):
        g = d[d["year"] == y]
        ax1.plot(g["doy"], g["roll7"], lw=2, color=SERIES[i % len(SERIES)],
                 label=str(y), zorder=2)
    ax1.set_ylim(0, max(80, float(d["roll7"].max()) * 1.05))
    aqi_bands(ax1)
    ax1.set_xlim(1, 366)
    ax1.set_xticks([1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335])
    ax1.set_xticklabels(["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])
    ax1.set_ylabel("PM2.5, average of the last 7 days\n" + r"($\mu$g/m$^3$)")
    ax1.set_title("The burning season, with all four years laid over the same calendar")
    ax1.grid(axis="y", zorder=0)
    ax1.legend(title="Year", ncol=len(years), loc="upper right")

    s = season.dropna(subset=["onset_doy"])
    for i, (_, r) in enumerate(s.iterrows()):
        colour = SERIES[years.index(r["year"]) % len(SERIES)]
        ax2.barh(str(int(r["year"])), r["end_doy"] - r["onset_doy"],
                 left=r["onset_doy"], color=colour, height=0.55, zorder=2)
        ax2.text(r["end_doy"] + 4, str(int(r["year"])),
                 f"{int(r['onset_doy'])}-{int(r['end_doy'])} "
                 f"({int(r['length_days'])} d)", va="center", fontsize=9, color=INK2)
    ax2.set_xlim(1, 366)
    ax2.set_xticks([1, 32, 60, 91, 121, 152])
    ax2.set_xticklabels(["Jan", "Feb", "Mar", "Apr", "May", "Jun"])
    ax2.set_xlabel("Day of year")
    ax2.set_title("How long each season lasted: first to last day above the standard")
    ax2.grid(axis="x", zorder=0)

    fig.tight_layout()
    save(fig, "fig01_season_onset",
         "PM2.5 7-day rolling mean by day of year, one line per year (top), and the "
         "resulting season window per year (bottom). Season onset is defined as the "
         "first day the 7-day mean exceeds 37.5 ug/m3.",
         "State here whether the window moved between years and by how many days. "
         "With only " + str(len(s)) + " seasons in the record this is a description "
         "of what happened, not a basis for forecasting next year's onset.")
    return season


# ---------------------------------------------------------------------------
# fig02 - exceedance days and trend
# ---------------------------------------------------------------------------

def fig02_exceedance(primary: pd.DataFrame) -> pd.DataFrame:
    d = primary.copy()
    d["year"] = d["date"].dt.year
    d["exceed"] = d["pm2_5"] > PM25_STANDARD

    tbl = d.groupby("year").agg(
        days_with_data=("pm2_5", "size"),
        days_over=("exceed", "sum"),
        mean_pm25=("pm2_5", "mean"),
        p95_pm25=("pm2_5", lambda s: s.quantile(0.95)),
        max_pm25=("pm2_5", "max"),
    ).reset_index()
    tbl["pct_over"] = (tbl["days_over"] / tbl["days_with_data"] * 100).round(1)
    tbl = tbl.round(1)
    tbl.to_csv(RESULTS / "exceedance_by_year.csv", index=False)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.6))

    bars = ax1.bar(tbl["year"].astype(str), tbl["days_over"],
                   color=SERIES[0], width=0.6, zorder=2)
    for b, n, tot in zip(bars, tbl["days_over"], tbl["days_with_data"]):
        ax1.text(b.get_x() + b.get_width() / 2, b.get_height() + 2,
                 f"{int(n)}\nof {int(tot)} d", ha="center", va="bottom",
                 fontsize=9, color=INK2)
    ax1.set_ylabel("Days with daily mean above 37.5 " + r"$\mu$g/m$^3$")
    ax1.set_xlabel("Year")
    ax1.set_title("Exceedance days per year")
    ax1.grid(axis="y", zorder=0)
    ax1.set_ylim(0, tbl["days_over"].max() * 1.28)

    part = tbl["days_with_data"] < 360
    if part.any():
        ax1.text(0.02, 0.96, "Bars marked 'of N d' show the days actually in the\n"
                             "record; partial years are not comparable to full ones.",
                 transform=ax1.transAxes, va="top", fontsize=8.5, color=INK2)

    m = d.copy()
    m["month"] = m["date"].dt.month
    heat = m.pivot_table(index="year", columns="month", values="pm2_5", aggfunc="mean")
    im = ax2.imshow(heat.values, aspect="auto", cmap="Blues", vmin=0,
                    vmax=float(np.nanmax(heat.values)))
    ax2.set_xticks(range(12))
    ax2.set_xticklabels(["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"])
    ax2.set_yticks(range(len(heat)))
    ax2.set_yticklabels(heat.index)
    ax2.set_title("Average PM2.5 by month " + r"($\mu$g/m$^3$)" + " — darker is worse")
    ax2.set_xlabel("Month")
    for i in range(heat.shape[0]):
        for j in range(heat.shape[1]):
            v = heat.values[i, j]
            if not np.isnan(v):
                ax2.text(j, i, f"{v:.0f}", ha="center", va="center", fontsize=8,
                         color="white" if v > np.nanmax(heat.values) * 0.55 else INK)
    fig.colorbar(im, ax=ax2, label=r"$\mu$g/m$^3$", fraction=0.04)

    fig.tight_layout()
    save(fig, "fig02_exceedance_trend",
         "Days per year exceeding the 37.5 ug/m3 daily standard (left) and monthly "
         "mean PM2.5 by year (right).",
         "Say explicitly whether the trend is up, down or flat, and whether the "
         "record is long enough to call it a trend at all. Four years is not.")
    return tbl


# ---------------------------------------------------------------------------
# fig03 - places
# ---------------------------------------------------------------------------

def fig03_places(panel: pd.DataFrame) -> None:
    """
    Only plot locations that checkpoint C4 has shown to be genuinely different.
    Locations sharing a CAMS grid cell are dropped, with a note on the figure.
    """
    piv = panel.pivot_table(index="date", columns="location", values="pm2_5")

    keep, dropped = [], []
    for c in piv.columns:
        if any(np.allclose(piv[c].dropna(), piv[k].reindex(piv[c].dropna().index))
               for k in keep):
            dropped.append(c)
        else:
            keep.append(c)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 4.8),
                                   gridspec_kw={"width_ratios": [2, 1]})

    for i, c in enumerate(keep):
        s = piv[c].rolling(7, min_periods=5).mean()
        ax1.plot(s.index, s.values, lw=1.8, color=SERIES[i % len(SERIES)], label=c)
    ax1.set_ylim(0, max(90, float(piv.max().max()) * 0.7))
    aqi_bands(ax1)
    ax1.set_ylabel("PM2.5, average of the last 7 days" + "\n" + r"($\mu$g/m$^3$)")
    ax1.set_xlabel("Date")
    ax1.set_title("Is the problem the same everywhere?")
    ax1.grid(axis="y", zorder=0)
    ax1.legend(ncol=2, loc="upper right", fontsize=9)

    counts = (piv[keep] > PM25_STANDARD).sum().sort_values()
    ax2.barh(counts.index, counts.values,
             color=[SERIES[keep.index(c) % len(SERIES)] for c in counts.index],
             height=0.6, zorder=2)
    for i, (c, v) in enumerate(counts.items()):
        ax2.text(v + 3, i, f"{int(v)}", va="center", fontsize=9, color=INK2)
    ax2.set_xlabel("Days above the standard, whole record")
    ax2.set_title("Days above 37.5 " + r"$\mu$g/m$^3$")
    ax2.grid(axis="x", zorder=0)

    if dropped:
        fig.text(0.01, -0.02,
                 "Excluded as duplicates of another point in the same CAMS grid cell: "
                 + ", ".join(dropped) + ". See checkpoint C4.",
                 fontsize=8.5, color=INK2)

    fig.tight_layout()
    save(fig, "fig03_places",
         "Seven-day rolling mean PM2.5 by location (left) and total exceedance days "
         "per location (right). Locations returning identical data were removed.",
         "Say which places are worse and by how much, and state the caveat: these "
         "are neighbouring cells of a ~45 km global model, not independent station "
         "measurements, and the model carries no terrain.")


# ---------------------------------------------------------------------------
# fig04 - weather on the worst days
# ---------------------------------------------------------------------------

def fig04_weather(primary: pd.DataFrame) -> pd.DataFrame:
    d = primary.dropna(subset=["pm2_5"]).copy()
    q = d["pm2_5"].quantile([0.25, 0.75])
    d["band"] = np.where(d["pm2_5"] >= q[0.75], "Worst quartile",
                         np.where(d["pm2_5"] <= q[0.25], "Best quartile", "Middle"))

    cand = [("wx_boundary_layer_height", "Boundary layer height (m)\nhow deep the air mixes"),
            ("wx_wind_speed_10m", "Wind speed (km/h)"),
            ("wx_ventilation_index", "Ventilation index\nmixing depth x wind speed"),
            ("wx_relative_humidity_2m", "Humidity (%)"),
            ("wx_temperature_2m", r"Temperature ($\degree$C)"),
            ("wx_precip_total_mm", "Rainfall (mm/day)")]
    cand = [(c, lab) for c, lab in cand if c in d.columns]
    if not cand:
        print("  [skip] fig04: no weather columns present")
        return pd.DataFrame()

    n = len(cand)
    fig, axes = plt.subplots(1, n, figsize=(2.5 * n + 1.5, 4.4))
    axes = np.atleast_1d(axes)

    order = ["Best quartile", "Middle", "Worst quartile"]
    nice = {"Best quartile": "Cleanest\n25%", "Middle": "Middle\n50%", "Worst quartile": "Dirtiest\n25%"}
    cols = {"Best quartile": SERIES[2], "Middle": "#b9b8b2", "Worst quartile": SERIES[1]}

    stats = []
    for ax, (c, lab) in zip(axes, cand):
        data = [d.loc[d["band"] == b, c].dropna().values for b in order]
        bp = ax.boxplot(data, patch_artist=True, widths=0.55, showfliers=False,
                        medianprops=dict(color=INK, lw=1.6))
        for patch, b in zip(bp["boxes"], order):
            patch.set_facecolor(cols[b])
            patch.set_edgecolor("white")
            patch.set_linewidth(2)
        ax.set_xticklabels([nice[b] for b in order], fontsize=8.5)
        ax.set_title(lab, fontsize=9.5, fontweight="normal")
        ax.grid(axis="y", zorder=0)
        stats.append({
            "variable": c,
            "best_quartile_median": round(float(np.nanmedian(data[0])), 2),
            "worst_quartile_median": round(float(np.nanmedian(data[2])), 2),
            "spearman_with_pm25": round(float(d[["pm2_5", c]].corr(method="spearman").iloc[0, 1]), 3),
        })

    fig.suptitle("Weather on the cleanest and the dirtiest days\n"
                 "days sorted by PM2.5, then split into the best 25%, middle 50% and worst 25%",
                 y=1.06, fontweight="bold", fontsize=11.5)
    fig.tight_layout()

    tbl = pd.DataFrame(stats)
    tbl.to_csv(RESULTS / "weather_by_pm25_quartile.csv", index=False)
    print("\n" + tbl.to_string(index=False))

    save(fig, "fig04_weather_conditions",
         "Distribution of each meteorological variable on days in the best and worst "
         "quartiles of daily mean PM2.5.",
         "Name the mechanism, do not just report the correlation: a shallow boundary "
         "layer with light wind traps smoke in the basin. The ventilation index "
         "(boundary layer height x wind speed) is the compact expression of it.")
    return tbl


# ---------------------------------------------------------------------------
# fig05 - weekly pattern
# ---------------------------------------------------------------------------

def fig05_weekly(primary: pd.DataFrame) -> None:
    d = primary.copy()
    d["dow"] = d["date"].dt.dayofweek
    d["season"] = np.where(d["date"].dt.month.isin([1, 2, 3, 4]),
                           "Burning season (Jan-Apr)", "Rest of year")
    names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    fig, ax = plt.subplots(figsize=(8.5, 4.4))
    for i, (s, g) in enumerate(d.groupby("season")):
        m = g.groupby("dow")["pm2_5"].mean()
        se = g.groupby("dow")["pm2_5"].sem()
        ax.errorbar(range(7), m.reindex(range(7)).values,
                    yerr=se.reindex(range(7)).values, marker="o", ms=8, lw=2,
                    capsize=4, color=SERIES[i], label=s)
    ax.set_xticks(range(7))
    ax.set_xticklabels(names)
    ax.set_ylabel(r"Average daily PM2.5 ($\mu$g/m$^3$)")
    ax.set_xlabel("Day of week")
    ax.set_title("Is there a weekly pattern?")
    ax.grid(axis="y", zorder=0)
    ax.legend()
    fig.tight_layout()

    save(fig, "fig05_weekly_pattern",
         "Mean daily PM2.5 by day of week, split by season. Error bars are one "
         "standard error of the mean.",
         "If the error bars overlap, say there is no weekly pattern and stop. A "
         "weekday effect would point to traffic or industry; its absence points to "
         "burning and weather, which do not observe a calendar.")


# ---------------------------------------------------------------------------
# fig06 - how predictable is tomorrow, really
# ---------------------------------------------------------------------------

def fig06_persistence(primary: pd.DataFrame) -> dict:
    """
    Motivates the whole modelling section. Daily PM2.5 is strongly
    autocorrelated, so persistence is a hard baseline; the interesting question
    is where persistence FAILS.
    """
    d = primary.dropna(subset=["pm25_tomorrow"]).copy()

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.8))

    lags = range(1, 22)
    ac = [d["pm2_5"].autocorr(lag=k) for k in lags]
    ax1.bar(list(lags), ac, color=SERIES[0], width=0.6, zorder=2)
    ax1.axhline(0, color=INK2, lw=1)
    ax1.set_xlabel("How many days earlier")
    ax1.set_ylabel("Correlation with PM2.5 N days earlier\n(1.0 = the past predicts today perfectly)")
    ax1.set_title("Today already tells you most of tomorrow")
    ax1.grid(axis="y", zorder=0)
    ax1.set_ylim(0, 1.0)
    ax1.annotate(f"lag 1 = {ac[0]:.2f}\nyesterday explains "
                 f"{ac[0] ** 2:.0%} of the variance",
                 xy=(1, ac[0]), xytext=(6.5, 0.94),
                 fontsize=9.5, color=INK, va="top",
                 arrowprops=dict(arrowstyle="-", color=INK2, lw=1))

    err = (d["pm25_tomorrow"] - d["pm2_5"]).abs()
    trans = d["is_transition"].astype("float").fillna(0).astype(bool)
    ax2.hist([err[~trans], err[trans]], bins=30, stacked=True,
             color=[SERIES[2], SERIES[1]], edgecolor="white", lw=0.5,
             label=[f"Day stays on the same side of 37.5  ({(~trans).sum()} days)",
                    f"Day crosses 37.5  ({trans.sum()} days)"], zorder=2)
    ax2.set_xlabel("How far off you are if you simply guess" + "\n" + r"$\bf{tomorrow\ =\ today}$" + r" ($\mu$g/m$^3$)")
    ax2.set_ylabel("Days")
    ax2.set_title("Where that simple guess breaks down")
    ax2.grid(axis="y", zorder=0)
    ax2.legend(fontsize=9)

    fig.tight_layout()

    res = {
        "lag1_autocorr": round(float(ac[0]), 4),
        "persistence_mae_all": round(float(err.mean()), 3),
        "persistence_mae_stable": round(float(err[~trans].mean()), 3),
        "persistence_mae_transition": round(float(err[trans].mean()), 3),
        "n_transition_days": int(trans.sum()),
        "pct_transition_days": round(float(trans.mean() * 100), 2),
    }
    pd.Series(res).to_frame("value").to_csv(RESULTS / "persistence_diagnostics.csv")
    print("\n  " + "\n  ".join(f"{k:<28s} {v}" for k, v in res.items()))

    save(fig, "fig06_persistence_limits",
         "Autocorrelation of daily mean PM2.5 (left) and the distribution of "
         "persistence forecast error, split by whether the day crossed the 37.5 "
         "threshold (right).",
         f"Persistence is a strong baseline overall (MAE {res['persistence_mae_all']:.1f}) "
         f"but it is wrong by {res['persistence_mae_transition']:.1f} ug/m3 on the "
         f"{res['pct_transition_days']:.0f}% of days that cross the standard. Those "
         "are the only days a warning system exists for, so that is where a model "
         "has to earn its place.")
    return res


# ---------------------------------------------------------------------------

def fig10_emission_vs_outcome(primary: pd.DataFrame) -> pd.DataFrame | None:
    """
    The scale paradox, and the strongest argument in the report.

    Left  : one dot per DAY. Fire detections near the city against that day's
            PM2.5. Strongly positive -- burning drives smoke.
    Right : one dot per YEAR. Total fire detections against exceedance days.
            The relationship disappears, and can invert.

    If both panels are true at once, then the year-to-year variation in "days
    over the standard" is not measuring how much burning happened. It is
    measuring the weather. Which makes it the wrong number to judge policy by.
    """
    if "hotspots_100km" not in primary.columns:
        print("  [skip] fig10: no hotspot columns -- copy the FIRMS csv to "
              "data/processed/firms_hotspots.csv and re-run prepare_data.py")
        return None

    d = primary.dropna(subset=["pm2_5", "hotspots_100km"]).copy()
    d["year"] = d["date"].dt.year

    rho_day = float(d[["pm2_5", "hotspots_100km"]].corr(method="spearman").iloc[0, 1])

    annual = d.groupby("year").agg(
        hotspots=("hotspots_100km", "sum"),
        exceedance_days=("pm2_5", lambda s: int((s > PM25_STANDARD).sum())),
        days_with_data=("pm2_5", "size"),
        mean_pm25=("pm2_5", "mean"),
    ).reset_index()
    annual["exceed_per_100d"] = (annual["exceedance_days"]
                                 / annual["days_with_data"] * 100).round(1)
    annual.to_csv(RESULTS / "emission_vs_outcome.csv", index=False)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12.5, 5))

    # --- daily ------------------------------------------------------------
    burning = d["is_burning_season"].astype(bool) if "is_burning_season" in d else d["date"].dt.month.isin([1, 2, 3, 4])
    ax1.scatter(d.loc[~burning, "hotspots_100km"], d.loc[~burning, "pm2_5"],
                s=13, color="#b9b8b2", alpha=.55, lw=0, label="Rest of year", zorder=2)
    ax1.scatter(d.loc[burning, "hotspots_100km"], d.loc[burning, "pm2_5"],
                s=15, color=SERIES[1], alpha=.65, lw=0, label="Burning season", zorder=3)
    ax1.axhline(PM25_STANDARD, color=INK, lw=1.1, ls="--", zorder=4)
    ax1.annotate(f"standard {PM25_STANDARD}", xy=(0.99, PM25_STANDARD),
                 xycoords=("axes fraction", "data"), ha="right", va="bottom",
                 fontsize=9, color=INK,
                 bbox=dict(boxstyle="round,pad=0.25", fc="white", ec="none", alpha=.9))
    ax1.set_xscale("symlog", linthresh=10)
    ax1.set_xlim(left=-1.5)
    ax1.set_xlabel("Fires detected within 100 km that day\n(log scale, so 0 sits at the far left)")
    ax1.set_ylabel(r"Daily mean PM2.5 ($\mu$g/m$^3$)")
    ax1.set_title("Day by day: fires and smoke move together\n"
                  f"rank correlation $\\rho$ = {rho_day:.2f}   (1.0 = perfectly in step)",
                  fontsize=11)
    ax1.grid(alpha=.5, zorder=0)
    ax1.legend(loc="upper left", fontsize=9)

    # --- annual -----------------------------------------------------------
    ax2.scatter(annual["hotspots"], annual["exceedance_days"], s=190,
                color=SERIES[0], zorder=3, edgecolor="white", lw=2)
    # place each year label above its point, unless a nearby point sits above it
    xr = max(annual["hotspots"].max() - annual["hotspots"].min(), 1)
    for _, r in annual.iterrows():
        partial = " *" if r["days_with_data"] < 360 else ""
        crowded = (
            (abs(annual["hotspots"] - r["hotspots"]) < 0.12 * xr)
            & (annual["exceedance_days"] > r["exceedance_days"])
        ).any()
        dy, va = (-24, "top") if crowded else (15, "bottom")
        ax2.annotate(f"{int(r['year'])}{partial}",
                     xy=(r["hotspots"], r["exceedance_days"]),
                     xytext=(0, dy), textcoords="offset points",
                     ha="center", va=va, fontsize=10.5, color=INK, fontweight="bold")
    ax2.set_xlabel("Total fires detected within 100 km, whole year")
    ax2.set_ylabel("Days above 37.5 " + r"$\mu$g/m$^3$")
    ax2.set_title("Year by year: the relationship disappears", fontsize=11)
    ax2.grid(alpha=.5, zorder=0)
    ax2.margins(x=.18, y=.22)
    if (annual["days_with_data"] < 360).any():
        ax2.text(0.02, 0.03, "* partial year", transform=ax2.transAxes,
                 fontsize=8.5, color=INK2)

    fig.tight_layout()

    print("\n" + annual.to_string(index=False))
    hi = annual.loc[annual["hotspots"].idxmax()]
    lo = annual.loc[annual["hotspots"].idxmin()]
    print(f"\n  most fires : {int(hi['year'])}  {int(hi['hotspots']):,} detections, "
          f"{int(hi['exceedance_days'])} exceedance days")
    print(f"  fewest     : {int(lo['year'])}  {int(lo['hotspots']):,} detections, "
          f"{int(lo['exceedance_days'])} exceedance days")

    save(fig, "fig10_emission_vs_outcome",
         "Fire detections within 100 km against PM2.5, at two time scales: one "
         "point per day (left, log x-axis) and one point per year (right).",
         f"At daily scale fires and smoke move together (rho = {rho_day:.2f}). At "
         f"annual scale they do not: {int(hi['year'])} had the most fires "
         f"({int(hi['hotspots']):,}) and {int(hi['exceedance_days'])} exceedance days, "
         f"while {int(lo['year'])} had the fewest ({int(lo['hotspots']):,}) and "
         f"{int(lo['exceedance_days'])}. Year-to-year variation in days over the "
         "standard therefore reflects dispersion conditions more than emissions, "
         "which makes it the wrong measure to judge burning policy by.")
    return annual


def main() -> None:
    print("=" * 72)
    print("ANALYSE")
    print("=" * 72)
    panel, primary = load()
    print(f"  panel {panel.shape}, primary location '{PRIMARY_LOCATION}' {primary.shape}")

    fig01_season(primary)
    fig02_exceedance(primary)
    fig03_places(panel)
    fig04_weather(primary)
    fig05_weekly(primary)
    fig06_persistence(primary)
    fig10_emission_vs_outcome(primary)

    cap = pd.DataFrame(CAPTIONS)
    cap.to_csv(RESULTS / "figure_captions.csv", index=False)
    print(f"\n  -> {RESULTS / 'figure_captions.csv'}")
    print("\nEvery figure needs a sentence in the report saying what a reader "
          "should conclude from it. The 'conclusion' column is a prompt, not the "
          "sentence: replace it with what your numbers actually show.")


if __name__ == "__main__":
    main()
