# Bootstrap — get running in 30 seconds with the data you already have

The repository ships without the large CSVs. Two ways to fill `data/processed/`.

## A · Reuse what you already fetched (fastest, no network)

Copy your two existing files in:

```powershell
copy "..\forpredict\openmeteo_air_hourly.csv"     data\processed\
copy "..\forpredict\openmeteo_weather_hourly.csv" data\processed\
```

Then:

```bash
python src/prepare_data.py
python src/analyse.py
python src/model.py
```

Everything runs. `outputs/figures/` and `outputs/results/` in this repo were
produced exactly this way, so you can compare.

**What you will be missing until you do B:** `boundary_layer_height` (the trapping
proxy, and probably the most useful feature available), the historical forecast
columns (`fc_*`, which are what make the next-day model leakage-free), the grid
coordinates that checkpoint C4 needs, and FIRMS hotspot features.

## B · Full fetch (do this before you submit)

```bash
echo "YOUR_FIRMS_MAP_KEY" > firms_key.txt   # optional; free at firms.modaps.eosdis.nasa.gov/api/area/
python src/fetch_data.py
python src/prepare_data.py
python src/checks.py
python src/analyse.py
python src/model.py
```

First run takes several minutes. `data/raw/` then holds exactly what each API
returned, which is what the assignment requires, and re-runs read from it.

## C · The notebook

```bash
jupyter notebook notebooks/01_fetch_and_explore.ipynb
```

It imports the same modules. **Run §3 (the CAMS grid test) first** — it decides
whether a within-province spatial comparison is admissible at all, and it takes
six API calls.
