"""
run_all.py — one command runs the whole project.

    python run_all.py            fast path: uses the CSVs you already have (~3 min)
    python run_all.py --fetch    full path: downloads everything first (~30 min)

Every step is run in a try/except so that one failure (usually a network problem)
does not stop the rest. A summary at the end says what worked and what to do next.
"""

from __future__ import annotations

import shutil
import sys
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

DO_FETCH = "--fetch" in sys.argv

RESULTS: list[tuple[str, str, str]] = []   # (step, status, note)


def banner(text: str) -> None:
    print("\n" + "#" * 74)
    print(f"#  {text}")
    print("#" * 74)


def step(name: str, fn, note_ok: str = "") -> bool:
    banner(name)
    try:
        fn()
        RESULTS.append((name, "OK", note_ok))
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"\n!!! {name} FAILED: {type(exc).__name__}: {exc}")
        traceback.print_exc(limit=3)
        RESULTS.append((name, "FAILED", f"{type(exc).__name__}: {exc}"))
        return False


# ---------------------------------------------------------------------------
# 0 · make sure there is data to work with
# ---------------------------------------------------------------------------

def bootstrap_data() -> None:
    """Copy the CSVs you already fetched, if data/processed/ is empty."""
    processed = ROOT / "data" / "processed"
    processed.mkdir(parents=True, exist_ok=True)

    wanted = ["openmeteo_air_hourly.csv", "openmeteo_weather_hourly.csv"]
    missing = [f for f in wanted if not (processed / f).exists()]
    if not missing:
        print("  data/processed/ already has the hourly CSVs -- nothing to copy.")
        return

    # Look for them next to the repo, e.g. Downloads/PM2.5/forpredict/
    candidates = [ROOT.parent / "forpredict", ROOT.parent, ROOT.parent.parent / "forpredict"]
    for f in missing:
        for c in candidates:
            src = c / f
            if src.exists():
                shutil.copy2(src, processed / f)
                print(f"  copied {src}  ->  data/processed/{f}")
                break
        else:
            print(f"  [!] could not find {f} anywhere nearby.")
            print(f"      Copy it into {processed} by hand, or run with --fetch.")


# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 74)
    print("  PM2.5 Northern Thailand -- full pipeline")
    print(f"  mode: {'FULL FETCH (~30 min)' if DO_FETCH else 'fast, using existing CSVs (~3 min)'}")
    print("=" * 74)

    if DO_FETCH:
        import fetch_data
        step("1/6  FETCH -- download everything, save raw responses", fetch_data.main,
             "data/raw/ now holds exactly what the APIs returned")
    else:
        step("1/6  BOOTSTRAP -- reuse the CSVs you already have", bootstrap_data)

    import prepare_data
    ok_prep = step("2/6  PREPARE -- clean, join, aggregate, build features",
                   prepare_data.main, "daily_panel.csv and model_table.csv written")

    if not ok_prep:
        print("\nPREPARE failed, so nothing downstream can run. Fix that first.")
        summary()
        return

    import checks
    step("3/6  C1 -- is the time axis really Thailand local time?", checks.c1_time,
         "needs the internet")
    step("4/6  C4 -- do two points inside Chiang Mai differ at all?",
         checks.c4_grid_test, "needs the internet -- THE decision for the spatial analysis")
    step("4/6  C2, C3, C4 -- join, missing values, place comparison",
         lambda: (checks.c2_join(), checks.c3_missing(), checks.c4_places()),
         "offline, from the CSVs")
    step("5/6  C6 -- CAMS against measured Air4Thai stations",
         checks.c6_ground_truth, "needs the internet -- RUN THIS AGAIN ON OTHER DAYS")

    import analyse
    step("6/6  ANALYSE -- figures fig01 to fig06", analyse.main,
         "outputs/figures/")

    import model
    step("6/6  MODEL -- baselines, models, checkpoint C5", model.main,
         "outputs/results/metrics.json, fig07, fig08")

    summary()


def summary() -> None:
    banner("SUMMARY")
    width = max(len(n) for n, _, _ in RESULTS) if RESULTS else 10
    for name, status, note in RESULTS:
        mark = "OK  " if status == "OK" else "FAIL"
        print(f"  [{mark}] {name:<{width}}  {note}")

    failed = [n for n, s, _ in RESULTS if s == "FAILED"]
    print()
    if not failed:
        print("  Everything ran.")
    else:
        print(f"  {len(failed)} step(s) failed: {', '.join(failed)}")
        print("  If they are the C1 / C4 / C6 steps, it is almost always the network.")
        print("  Check that this machine can reach open-meteo.com and air4thai.pcd.go.th.")

    print("""
  What you now have
    outputs/figures/     the figures for Part B and Part C of the report
    outputs/results/     metrics.json, metrics.csv, and every audit table
    data/processed/      the joined daily panel and the model table

  What to do next
    1. Open docs/REPORT_GUIDE.md -- it maps each report section to the file
       that holds the number.
    2. Open docs/PART_D_DRAFT.md -- the recommendation section, 20 marks.
    3. Run `python src/checks.py` again on another day. C6 appends, so a few
       paired observations are far more convincing than one.
    4. Before submitting: `pip freeze` and paste the real versions into
       requirements.txt.
""")


if __name__ == "__main__":
    main()
