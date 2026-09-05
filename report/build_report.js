// Builds report/PM25_Northern_Thailand_Report.docx from the two markdown drafts.
// Run:  node report/build_report.js
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  ImageRun, PageBreak, Footer, PageNumber, ExternalHyperlink,
} = require("docx");

const FIG = process.env.FIGDIR || path.join(__dirname, "..", "outputs", "figures");
const OUT = path.join(__dirname, "PM25_Northern_Thailand_Report.docx");

const CONTENT_W = 9746;           // A4 minus 0.75" margins, in DXA
const INK = "1A1A1A", MUTED = "595959", RULE = "D9D9D9", HDR = "F2F2F2";

// ---------------------------------------------------------------- helpers
const P = (text, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 100, line: o.line ?? 252 },
  alignment: o.align,
  indent: o.indent,
  border: o.border,
  children: [new TextRun({
    text, size: o.size ?? 20, color: o.color ?? INK,
    bold: o.bold, italics: o.italics, font: "Calibri",
  })],
});

// paragraph from [{t,b,i}] runs
const PR = (runs, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 100, line: 252 },
  alignment: o.align,
  children: runs.map(r => new TextRun({
    text: r.t, bold: r.b, italics: r.i, size: o.size ?? 20,
    color: r.c ?? o.color ?? INK, font: "Calibri",
  })),
});

const H = (text, level) => new Paragraph({
  heading: level,
  spacing: { before: level === HeadingLevel.HEADING_1 ? 240 : 190, after: 90 },
  children: [new TextRun({
    text, font: "Calibri", color: INK, bold: true,
    size: level === HeadingLevel.HEADING_1 ? 27 : 23,
  })],
});

const BULLET = (text, o = {}) => new Paragraph({
  bullet: { level: o.level ?? 0 },
  spacing: { after: 70, line: 252 },
  children: [new TextRun({ text, size: 20, color: INK, font: "Calibri" })],
});

// figure + caption
function figure(file, number, caption, widthPx = 440) {
  const p = path.join(FIG, file);
  if (!fs.existsSync(p)) return [P(`[missing figure: ${file}]`, { color: "C00000" })];
  const buf = fs.readFileSync(p);
  const d = buf.slice(16, 24);
  const w = d.readUInt32BE(0), h = d.readUInt32BE(4);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 40 },
      children: [new ImageRun({
        type: "png", data: buf,
        transformation: { width: widthPx, height: Math.round(widthPx * h / w) },
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        new TextRun({ text: `Figure ${number}. `, bold: true, size: 16, color: MUTED, font: "Calibri" }),
        new TextRun({ text: caption, size: 16, color: MUTED, font: "Calibri" }),
      ],
    }),
  ];
}

// table: rows[0] is the header
function table(rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const scale = CONTENT_W / total;
  const cols = widths.map(w => Math.round(w * scale));
  return new Table({
    columnWidths: cols,
    width: { size: CONTENT_W, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: RULE },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: rows.map((cells, ri) => new TableRow({
      tableHeader: ri === 0,
      children: cells.map((c, ci) => new TableCell({
        width: { size: cols[ci], type: WidthType.DXA },
        shading: ri === 0 ? { type: ShadingType.CLEAR, fill: HDR, color: "auto" } : undefined,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({
          spacing: { after: 0, line: 228 },
          alignment: ci > 0 && ri > 0 && /^[-+]?[\d.,%]+$/.test(String(c).trim())
            ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [new TextRun({
            text: String(c), size: 17, bold: ri === 0,
            color: ri === 0 ? INK : INK, font: "Calibri",
          })],
        })],
      })),
    })),
  });
}

const SPACER = () => P("", { after: 60 });
const PB = () => new Paragraph({ children: [new PageBreak()] });

// ---------------------------------------------------------------- content
const body = [];
const push = (...x) => x.forEach(i => body.push(i));


// ---- helpers used only by the content below -----------------------------
// A question-and-answer table: the lab sheet asks a question, this answers it.
function qaTable(rows, qW = 3100) {
  return table(rows, [qW, 9746 - qW]);
}
const NOTE = (t) => PR([{ t, i: true, c: MUTED }], { size: 17, after: 190 });
const LEAD = (t) => PR([{ t, b: true }], { after: 120 });

// ---- title block
push(
  new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({
      text: "DS-270702  DATA SCIENCE PROGRAMMING  ·  HOMEWORK 4",
      size: 18, color: MUTED, font: "Calibri", bold: true,
    })],
  }),
  new Paragraph({
    spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: INK } },
    children: [new TextRun({
      text: "PM2.5 in Northern Thailand: from raw data to a recommendation",
      size: 36, bold: true, color: INK, font: "Calibri",
    })],
  }),
  PR([{ t: "Master of Science in Data Science · Chiang Mai University", c: MUTED }], { size: 20, after: 60 }),
  PR([
    { t: "Name ", c: MUTED }, { t: "Thana Thanantaseth", b: true },
    { t: "     Student ID ", c: MUTED }, { t: "690631061", b: true },
  ], { size: 20, after: 40 }),
  PR([
    { t: "Repository ", c: MUTED },
    { t: "github.com/torthanantaseth/dsc-cmu-pm2.5-assignment" },
  ], { size: 20, after: 300 }),
);

// ================================================================ 1
push(H("1 · Problem background", HeadingLevel.HEADING_1));

push(P("Between January and April each year, air quality across the eight upper northern provinces of Thailand becomes hazardous to breathe. Three sources combine: agricultural residue burning after the rice and maize harvests, forest fires on protected land, and smoke transported from Myanmar and Laos. A fourth factor multiplies them: Chiang Mai sits in a mountain basin where a stable dry-season atmosphere traps smoke rather than dispersing it."));

push(PR([
  { t: "The distribution of that burning is not what public discussion assumes. On 20 April 2026, of 1,518 hotspots detected across the northern region, " },
  { t: "1,013 were in conservation forest and 435 in national reserved forest; only 70 were outside forest land", b: true },
  { t: " [1]. Two-thirds of fire activity is on protected land, so measures aimed only at agriculture cannot resolve the problem." },
]));

push(H("1.1 The 37.5 standard already obliges action, but only after the fact", HeadingLevel.HEADING_2));
push(P("Thailand tightened its 24-hour ambient PM2.5 standard from 50 to 37.5 µg/m³ with effect from 1 June 2023 [2]. That number carries statutory weight under the Occupational Disease and Environmental Disease Control Act [3]:"));
push(table([
  ["24-hour mean", "Zone", "What the state is obliged to do"],
  ["> 37.5 µg/m³", "Surveillance and prevention zone", "Distribute masks to vulnerable groups; prepare dust-free areas in hospitals, schools and community centres"],
  ["> 75 µg/m³", "Disease control zone", "The above, plus government work-from-home, suspension of outdoor activities, active surveillance and evacuation shelters"],
  ["> 125 µg/m³ for 5 consecutive days", "Disaster declaration", "Releases the governor's emergency advance funds [20]"],
], [1900, 2600, 5246]));
push(NOTE("Every one of these is triggered by a measurement already taken. That is the gap this project addresses."));

push(H("1.2 The season costs the north money and health every year", HeadingLevel.HEADING_2));
push(table([
  ["", "Finding", "Source"],
  ["Health", "Each +10 µg/m³ of daily mean PM2.5 raises Chiang Mai's mortality rate by about 1.6% over the next six days", "[4]"],
  ["Health", "Respiratory treatment, Chiang Mai FY2023: US$17.16 per outpatient visit, US$376.47 per admission. Disability burden about 41,372 YLD per 100,000 per year, ten northern provinces", "[5][6]"],
  ["Economy", "Annual welfare cost of PM2.5 in Chiang Mai province: ~70.4 billion baht", "[7]"],
  ["Economy", "A 5% rise in monthly mean PM2.5 → 106,060 fewer foreign tourists and a 476 million baht opportunity loss", "[8]"],
  ["Households", "Median monthly household income in Chiang Mai: 18,620 baht; northern households spend 77.5% of income", "[9][10]"],
  ["Households", "An entry-level air purifier costs 2,240 to 3,590 baht, which is 12 to 19% of one month's median income, before filters and power", "computed"],
], [1250, 7100, 1396]));
push(NOTE("Self-protection is therefore constrained by liquidity, not by awareness."));

push(H("1.3 The people who cannot avoid it are already counted", HeadingLevel.HEADING_2));
push(table([
  ["Group", "Scale", "Exposure"],
  ["General population, Chiang Mai province", "1.80 million [11]", "Ambient exposure January to April"],
  ["Designated vulnerable groups, ten northern provinces", "1.62 million targeted [12]", "The population the 2,275 clean-air rooms exist for"],
  ["Volunteer firefighters, Chiang Mai", "~20,000 [13]", "200 to 300 baht/day, below minimum wage, uninsured; two died on duty in 2026"],
  ["Tourism-dependent small businesses", "Northern hotel occupancy 38.7% in Apr 2025 vs 47.3% in Mar, ~63% nationally [14]", "Lose their season when the air is worst"],
  ["Schoolchildren", "No national threshold-based closure rule exists [15]", "Outdoor activity suspension is instructed, but no published number triggers it"],
], [2700, 3100, 3946]));

push(H("1.4 The machinery to act exists, what is missing is one day of notice", HeadingLevel.HEADING_2));
push(PR([
  { t: "Two facts frame any recommendation. First, Thailand has " },
  { t: "no dedicated clean air statute", b: true },
  { t: ": the Clean Air Bill passed the House in October 2025 and the Senate in July 2026 in materially different forms; on 2 September 2026 the House rejected the Senate version 414 to 2 and referred it to a joint committee [16]." },
]));
push(PR([
  { t: "Second, more of the current policy has not obviously worked. Chiang Mai's 2026 burning ban ran 1 January to 31 May, the longest and earliest on record, and the province recorded " },
  { t: "11,023 hotspots against 4,709 the previous year, with burned area rising from 704,453 to 1,468,289 rai", b: true },
  { t: " [17][18]. That observation motivates the question in Section 2." },
]));

// ================================================================ 2
push(H("2 · Approach", HeadingLevel.HEADING_1));

push(new Paragraph({
  spacing: { before: 60, after: 180 },
  indent: { left: 340 },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: "2A78D6", space: 12 } },
  children: [new TextRun({
    text: "Can tomorrow's PM2.5 in Chiang Mai be predicted accurately enough to be useful as a warning, and if so, what should be done differently as a result?",
    size: 22, bold: true, color: INK, font: "Calibri",
  })],
}));

push(H("2.1 The question was chosen because an answer changes something", HeadingLevel.HEADING_2));
push(table([
  ["Reason", "Detail"],
  ["The trigger already exists and is reactive",
   "A 24-hour mean above 37.5 µg/m³ already obliges the actions in the table above, but all of them fire on a measurement already taken. The gap a forecast fills is therefore exactly one day of lead time on an action that is already mandated and already funded, a narrow claim, and a testable one."],
  ["The outcome measure may not measure what it is used for",
   "The province reports the annual count of days above the standard, and that is what performance is judged by. The policy context above shows effort and that number moving in opposite directions in 2026. A number that can do that deserves examination before it is used to evaluate anything."],
  ["Feasibility inside a two-week deadline",
   "Both parts can be answered with data that is free, scriptable, and available without a key or an approval process."],
], [3100, 6646]));

push(H("2.2 What I expected, and where I was wrong", HeadingLevel.HEADING_2));
push(P("Three of these four turned out to be wrong, and the places where they were wrong are the substance of Section 4."));
push(table([
  ["What I expected", "What actually happened", "Where"],
  ["A gradient-boosted model with weather features would beat a persistence baseline comfortably",
   "It beat it by 4% on overall MAE, less than the model's own bias against instruments. The only meaningful gain was on the days conditions change", "the model results"],
  ["Wind speed would be the dominant meteorological driver, because still air lets smoke accumulate",
   "Spearman ρ = −0.013. Adding boundary layer height, which should capture basin trapping directly, did not help either", "the weather comparison"],
  ["Two points 90 km apart inside Chiang Mai would be different places in the data",
   "One pair 12 km apart returned byte-identical values for a full week, while the API reported different coordinates for them", "the data quality checks C4"],
  ["Years with more burning would have more days above the standard",
   "The year with the most detected fires had the fewest such days", "the fire-count comparison"],
  ["The air quality source would turn out to be model output rather than measurement",
   "Correct. The comparison against Air4Thai instruments was planned from the start", "the data quality checks C3, C6"],
], [3100, 5400, 1246]));

// ================================================================ 3
push(H("3 · Method", HeadingLevel.HEADING_1));

push(H("3.1 Three sources, all fetched by script, none downloaded by hand", HeadingLevel.HEADING_2));
push(P("Four sources. Three are model output and one is a physical instrument, and that distinction runs through the whole of the results."));
push(PR([
  { t: "An endpoint is the web address a script sends a request to. ", b: true },
  { t: "Each one below accepts a set of parameters (coordinates, variable names, a date range, a timezone) and returns the matching data as a file, with no human clicking anything. That is what makes the acquisition a script rather than a manual download, which the assignment requires. None of the endpoints used here needs a paid account; only NASA FIRMS needs a free registration key." },
]));
push(table([
  ["#", "Source", "Endpoint requested, and what it returns", "Period", "Rows"],
  ["1", "Open-Meteo\nAir Quality", "air-quality-api.open-meteo.com/v1/air-quality\nGive it a coordinate and a date range, it returns hourly PM2.5, PM10, CO and dust from Copernicus CAMS Global, a worldwide atmospheric model on a 0.4 degrees, about 45 km, grid. No key needed.", "2023-01-01 to 2026-08-29", "128,352"],
  ["2", "Open-Meteo\nWeather Archive", "archive-api.open-meteo.com/v1/archive\nSame idea, but returns hourly weather from ERA5 reanalysis on a 0.25° grid: temperature, humidity, wind, rainfall, boundary layer height and more. No key needed.", "2023-01-01 to 2026-08-29", "128,352"],
  ["3", "Open-Meteo\nHistorical Forecast", "historical-forecast-api.open-meteo.com/v1/forecast\nReturns what the weather model PREDICTED for a past date, rather than what later turned out to be true. This is the only legitimate way to give the model tomorrow's weather.", "2023-01-01 to 2026-08-29", "128,352"],
  ["4", "Air4Thai\nPollution Control Department", "air4thai.pcd.go.th/services/getNewAQI_JSON.php\nTakes no parameters. Returns the CURRENT reading from all 173 Thai monitoring stations at the moment of the request. These are real instruments, not a model. There is no history endpoint.", "snapshot at run time", "173 stations"],
  ["5", "NASA FIRMS", "firms.modaps.eosdis.nasa.gov/api/area/csv\nGive it a bounding box and a date, it returns every thermal anomaly the VIIRS and MODIS satellites detected there: one row per fire, with coordinates and time. Free key by email.", "2023-01-01 to 2026-09-02", "334,388"],
], [340, 1500, 5350, 1650, 906]));
push(P("Variables from source 1: pm2_5, pm10, carbon_monoxide, dust. From source 2: thirteen meteorological variables including boundary_layer_height, wind_speed_10m, relative_humidity_2m and precipitation. From source 3: seven forecast variables, used only as described under what the model predicts."));
push(P("Four locations were fetched, the provincial capitals of Chiang Mai (18.7883, 98.9853), Chiang Rai (19.9086, 99.8325), Lampang (18.2855, 99.5130) and Mae Hong Son (19.3020, 97.9650). Mueang Chiang Mai is the primary location for all modelling. The choice of capitals rather than districts is a consequence of checkpoint C4 (see the data quality checks)."));
push(P("All 49 API calls are logged in data/processed/fetch_log.csv with endpoint, parameters, requested and served coordinates, date range, row count, retrieval timestamp and status. Raw responses are preserved unmodified in data/raw/ (49 files, 22 MB), so a clean clone reproduces every number here."));
push(PR([
  { t: "Reproducibility caveat. ", b: true },
  { t: "Air4Thai returns the current reading only and has no working history endpoint, so running src/fetch_data.py on a different day produces a different file. This is why the C6 comparison is a set of snapshots accumulated across repeated runs rather than a validation across the record." },
]));

push(H("3.2 No gaps at all in the sources, and the only gaps are ones I created", HeadingLevel.HEADING_2));
push(PR([
  { t: "Missing values, in one paragraph. ", b: true },
  { t: "The air quality and weather sources arrive with no gaps at all: zero missing hours across three and a half years. That sounds like good luck and is the most important clue in the project, because no real instrument is that complete; the data quality checks explain what it means. Air4Thai, which is a real instrument, does have gaps and marks them with the value −1 rather than leaving them blank. Every missing value in the final table was created by this pipeline, not by the sources: a 7-day average has nothing to average on day one, and tomorrow's PM2.5 does not exist on the last day. Those are 0.22% of cells, filled with the column median inside the model pipeline." },
]));
push(table([
  ["Decision", "Rule applied", "What it prevents"],
  ["Hourly → daily coverage", "A calendar day (Asia/Bangkok) is kept only if ≥18 of 24 hours are present; otherwise dropped, not averaged", "A mean from six hours counting the same as a mean from 24, which biases the exceedance count with no error raised"],
  ["Wind direction", "Averaged as a unit vector, not arithmetically", "The mean of 350° and 10° computing as 180°, the opposite direction"],
  ["Precipitation and PM2.5", "Rainfall summed rather than averaged; PM2.5 kept as daily mean, max, min and standard deviation", "Understating rainfall 24-fold; the daily mean concealing the nocturnal peak"],
  ["Air4Thai quirks", "Values ≤ −1 masked before any arithmetic (every field arrives as a string); verify=False for the incomplete certificate chain", "Averaging a sentinel value into a real mean, quietly wrong, with no error raised"],
  ["Fire detections", "Daily counts within 50 km and 100 km by haversine distance; a day with no detection recorded as 0, not missing", "Treating a satellite pass that saw no fire as an absence of information"],
  ["Target across date gaps", "shift(−1) validated so it cannot pair non-consecutive days", "Silently pairing days either side of a gap as if they were consecutive"],
], [1900, 3900, 3946]));
push(PR([
  { t: "The join is exact. ", b: true },
  { t: "128,352 hourly rows per source; 5,348 daily rows per source after aggregation; 5,348 rows after the inner join; no key present in one source and absent from another. Fire counts were then left-joined. Full accounting: outputs/results/join_audit.csv." },
]));

push(H("3.3 What the model predicts, and what the prediction is for", HeadingLevel.HEADING_2));
push(P("Before any modelling detail, it is worth being exact about what is predicted, when, and what a person would do with the answer."));
push(table([
  ["", "Answer"],
  ["What is predicted", "The average PM2.5 across the whole of the next calendar day, in µg/m³. And separately, a yes or no: will that average go above 37.5?"],
  ["Where", "Mueang Chiang Mai. The four provincial capitals are compared descriptively, but only Chiang Mai is modelled"],
  ["When the prediction is made", "The evening of the day before. Nothing measured after that moment is allowed into the model"],
  ["How far ahead", "One day. Not one week, and not a whole season. The reason is in the next paragraph"],
  ["What someone would do with it", "Decide, the evening before, whether to open clean-air rooms, distribute masks and tell schools to keep children indoors, instead of deciding on the morning itself once the air is already bad"],
  ["Why that is worth anything", "Those three actions are already required by law once the daily mean passes 37.5, and they are already funded. The forecast does not create new obligations. It moves existing ones about twelve hours earlier"],
], [2300, 7446]));
push(PR([
  { t: "Why one day and not longer. ", b: true },
  { t: "A seasonal forecast, saying which weeks of next year will be bad, would be far more useful. It cannot be built here: the record begins in January 2023, giving four burning seasons, and four is not enough to train or test against. A one-day forecast has more than thirteen hundred days behind it. The scope is therefore short-range, and the seasonal question is described rather than forecast." },
]));

push(H("3.3.1 Which values the model is allowed to see", HeadingLevel.HEADING_3));
push(P("115 columns were offered to the model. The admission rule is simple: could a person have known this number on the evening the forecast is issued? If not, it is excluded, however useful it would be."));
push(table([
  ["Kind of value", "Example", "Allowed?"],
  ["Things already measured, up to and including today", "Today's PM2.5, yesterday's, the 7-day average, today's wind and humidity, how many fires the satellite saw today", "Yes. These exist by the evening"],
  ["The weather forecast for tomorrow", "Tomorrow's predicted temperature, wind, rainfall and mixing depth, taken from an archive of what was forecast at the time", "Yes, with a caveat below"],
  ["The calendar", "Day of the year, month, day of the week, whether it falls in the burning season", "Yes. Known indefinitely far ahead"],
  ["What the weather actually turned out to be tomorrow", "Tomorrow's measured wind speed from the ERA5 archive", "No. This is the trap"],
], [2400, 5400, 1946]));
push(PR([
  { t: "Why that last row is a trap. ", b: true },
  { t: "ERA5 is not a forecast. It is a reconstruction of past weather built afterwards, from measurements taken during and after the day in question. Feeding a model tomorrow's wind speed from it looks impressively accurate and cannot be deployed, because on a real evening that number does not exist yet. Three mechanisms guard against it: features are admitted only by matching an approved list of name patterns, a check stops the program with an error if a forbidden column reaches the model, and the forecast columns come from a service that stores predictions rather than reconstructions." },
]));
push(PR([
  { t: "A caveat I would rather state than be asked about. ", b: true },
  { t: "The forecast archive stitches together the earliest hours of each successive model run, which is what makes it track reality closely. Those hours come from a run starting at the beginning of the day being predicted, a few hours after the evening my model works from. So the forecast columns are much safer than reconstructed weather but not perfectly clean. A system built for real use should draw on the service that stores each forecast at a fixed 24-hour lead time. The results report what happens with those columns removed." },
]));

push(H("3.4 The split is by time, because a random split would leak the future", HeadingLevel.HEADING_2));
push(table([
  ["", "Choice", "Why"],
  ["Training period", "2023-01-01 to 2025-05-31 (882 days)", "All the model may learn from"],
  ["Test period", "2025-06-01 to 2026-08-28 (454 days)", "Held back entirely. The later portion, because the data has time order, and chosen to contain one complete burning season, the period a warning system must work in"],
  ["Why not a random split", "Days were not shuffled", "Yesterday's PM2.5 predicts today's very strongly, so shuffling would put the day before and after a test day into training, close to handing over the answer"],
  ["Cross-validation inside training", "TimeSeriesSplit, five folds", "Each fold trains on earlier days and validates on later ones, never the reverse. Its effect on a seasonal series is reported with the results"],
], [2200, 2900, 4646]));

push(H("3.5 Four models, and what each was expected to add", HeadingLevel.HEADING_2));
push(table([
  ["Model", "Predicts", "Key settings", "What it was expected to do"],
  ["Persistence\n(the baseline)", "Tomorrow equals today", "None. It is a rule, not a model", "Set the bar. Anything that cannot beat it is not worth deploying"],
  ["Majority class\n(the baseline)", "\"Safe\" every single day", "None", "Show why accuracy is useless here: scores about 0.90, warns nobody"],
  ["Ridge regression", "Tomorrow's average PM2.5, a number", "α = 10, features standardised", "Simple and transparent. Expected to beat persistence modestly"],
  ["Gradient boosting\n(regression)", "Tomorrow's average PM2.5, a number", "400 rounds, learning rate 0.05, depth 6", "Catch non-linear effects the linear model cannot. Expected to be strongest"],
  ["Logistic regression", "Will tomorrow exceed 37.5? A probability", "Class weights balanced, features standardised", "Give a probability that can be turned into a warning at a chosen sensitivity"],
  ["Gradient boosting\n(classification)", "Will tomorrow exceed 37.5? A probability", "Same settings as above", "Same purpose, tested as an alternative"],
], [1900, 2300, 2400, 3146]));
push(PR([
  { t: "Missing values are filled with the column median, and for the linear models values are rescaled to a common range. Both happen inside the pipeline, so they are calculated from training days only and cannot leak information from the test period." },
]));

push(H("3.5.1 Success is measured on the days a forecast would be consulted", HeadingLevel.HEADING_3));
push(table([
  ["Task", "Headline metric", "Reported three ways", "Why not accuracy"],
  ["Predicting the number", "Mean absolute error: on average how many µg/m³ the forecast was off by, ignoring direction", "All days; burning season only; days when the situation changes", "Accuracy is undefined for a number. This is in the same unit as the data, so it reads directly"],
  ["Predicting the yes/no", "Recall: of the days that really exceeded the standard, what share did the system warn about. Reported with precision, the share of warnings that were right", "Plus the full count of missed days and false alarms", "One day in ten exceeds the standard, so predicting \"safe\" always scores 0.90 and protects nobody"],
], [2000, 3200, 2400, 2146]));
push(NOTE("A day when the situation changes means one whose exceedance status differs from the day before. Those days carry the entire argument."));

// ================================================================ 4
push(PB(), H("4 · Results", HeadingLevel.HEADING_1));

push(H("4.1 Part B, the five questions, answered", HeadingLevel.HEADING_2));
push(P("The lab sheet lists five questions worth answering with a graph. Each is answered below, with the figure that supports it."));
push(qaTable([
  ["Question", "Answer, and the figure that supports it"],
  ["When does the season start and end, and does that change from year to year?",
   "It moves by more than a month. Taking onset as the first day the 7-day average crosses 37.5: 2 Feb in 2023, 21 Feb in 2025, 5 Mar in 2026. The two-day figure for 2024 is not a season that barely happened; that year's average grazed the threshold and fell back, which shows how fragile a fixed cut-off is near the boundary.   (Figure A1)"],
  ["How many days per year exceed the 37.5 standard, and is the trend going up or down?",
   "40, 11, 29 and 45 days across 2023 to 2026, an almost fourfold swing. No trend: four years, one of them incomplete at 241 days, which is why the percentage column is given below.   (Figure 2)"],
  ["Does the problem look the same in different places?",
   "No, and not in the order usually assumed. Chiang Rai 153 exceedance days, Chiang Mai 125, Lampang 93, Mae Hong Son 55, with Chiang Rai ahead of Chiang Mai in all four years. Read alongside the ground-truth check, which finds the model's bias is not uniform between provinces.   (Figure 3)"],
  ["Which weather conditions accompany the worst days?",
   "Rain and humidity, both about −0.71, but both are confounded with season: the wet months are the months nobody burns. They describe when, not why. Wind speed is uncorrelated at −0.013, and so is boundary layer height at +0.069. The strongest link of anything tested is fire detections, +0.695.   (Figure A2)"],
  ["Is there a weekly pattern? If so, what would explain it?",
   "None, in either season; the error bars overlap throughout. That is informative rather than empty: a weekday effect would point to traffic or industry, and its absence fits sources that do not observe a calendar.   (Figure A3)"],
], 3400));

push(H("4.1.1 Exceedance by year", HeadingLevel.HEADING_3));
push(table([
  ["Year", "Days in record", "Days above 37.5 µg/m³", "% of days", "Mean PM2.5", "Max"],
  ["2023", "365", "40", "11.0", "21.9", "70.3"],
  ["2024", "366", "11", "3.0", "19.8", "47.5"],
  ["2025", "365", "29", "7.9", "23.1", "91.2"],
  ["2026", "241", "45", "18.7", "24.6", "99.4"],
], [900, 1500, 1900, 1100, 1300, 900]));
push(NOTE("outputs/results/exceedance_by_year.csv. 2026 is incomplete at 241 days."));
push(...figure("fig02_exceedance_trend.png", 2,
  "Days per year exceeding the 37.5 µg/m³ daily standard (left) and monthly mean PM2.5 by year (right), µg/m³."));
push(...figure("fig03_places.png", 3,
  "Seven-day rolling mean PM2.5 by location, µg/m³ (left) and total exceedance days per location across the record (right)."));

push(H("4.2 Data quality, the six checkpoints", HeadingLevel.HEADING_2));
push(qaTable([
  ["Checkpoint", "Verdict and the evidence for it"],
  ["C1 · Time",
   "PASS. The same day was requested twice: in UTC it gave 37.1 at 00:00, in Bangkok time the same 37.1 at 07:00, a shift of exactly seven hours and no timestamp in one series but not the other. This matters because PM2.5 peaks overnight, and a UTC day would cut that peak in half and lower the exceedance count silently."],
  ["C2 · The join",
   "PASS. 128,352 hourly rows per source became 5,348 daily rows per source after the 18-hour coverage rule, and the join of the two returned 5,348. Nothing was lost and nothing was duplicated."],
  ["C3 · Missing values",
   "PASS, with a caveat. 38 columns are exactly 0.0000% missing across three and a half years. No instrument is that perfect, so this confirms the source is a model, Copernicus CAMS, not a measurement."],
  ["C4 · Comparing places",
   "FAILED on the first attempt, then rewritten. Two districts 12 km apart returned identical numbers. This decided the spatial design of the project and is described below."],
  ["C5 · Model versus baseline",
   "PASS. The baseline was scored first on the same test days, and the results appear under the model section below."],
  ["C6 · Ground truth",
   "PASS, with a known bias. Against 70 paired readings from real Air4Thai instruments, CAMS reads 5.38 µg/m³ too low, and all 14 stations read low, not just some. The instrument is right; CAMS is a 45 km average."],
], 2200));

push(H("4.2.1 Why the analysis uses four provinces and not districts", HeadingLevel.HEADING_3));
push(P("Six points across Chiang Mai were requested for one week of hourly data and the returned numbers compared with each other."));
push(new Paragraph({
  spacing: { before: 60, after: 160 },
  indent: { left: 340 },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: "EB6834", space: 12 } },
  children: [new TextRun({
    text: "Mueang and Hang Dong, 12 km apart, returned identical numbers for all 168 hours, a maximum difference of 0.0 µg/m³, even though the API reported two different coordinates for them.",
    size: 20, bold: true, color: INK, font: "Calibri",
  })],
}));
push(table([
  ["", "What it shows"],
  ["Why the first version of the check passed", "It compared the coordinates the API reported, and six requests came back with six different coordinates. Only comparing the actual numbers finds the problem"],
  ["What causes it", "CAMS resolves about 45 km, so two nearby requests are read from the same square and interpolated. The reported coordinate is cosmetic"],
  ["How widespread", "1 of 15 within-province pairs identical, 14 different"],
  ["A second reason not to trust district detail", "CAMS ranks Mae Chaem among the cleanest of the six, yet Mae Chaem burned more land than any other Chiang Mai district in 2026, 253,040 rai [17]. A 45 km average with no terrain cannot see smoke sitting in a valley"],
  ["Decision taken", "The analysis compares the four provincial capitals, 100 to 250 km apart and verified to return genuinely different numbers. The urban to rural question is left to the limitations table, with the data that would answer it"],
], [2600, 7146]));

push(H("4.2.2 What the two source findings change in the rest of the report", HeadingLevel.HEADING_3));
push(LEAD("Two checkpoints found the same underlying fact, that this data is a model and not a measurement. Everything downstream inherits it."));
push(table([
  ["Found by", "Consequence for this report"],
  ["C3, no missing values at all", "Errors are systematic model bias, not random noise, so they do not average away over more days"],
  ["C3, source is a model", "A model trained on these numbers learns to predict CAMS rather than the air, which is why the conclusion says it must be retrained on measured data before anyone relies on it"],
  ["C6, reads 5.38 low everywhere", "Days CAMS reports at 33 to 37 may really have exceeded 37.5. Every exceedance count in this report is more likely an under-count than an over-count"],
  ["C6, bias is uneven by place", "From −0.7 at Yupparaj Wittayalai in Chiang Mai to −9.1 at Mae Moh in Lampang, so the ranking between provinces may partly be uneven model error rather than real difference"],
  ["C6, measured only in clean air", "The paired readings were 6.9 to 18.4 µg/m³, rainy season. Whether the same bias holds up near 37.5 is not established here"],
], [2600, 7146]));

push(H("4.3 Fire explains the worst days, the wind does not", HeadingLevel.HEADING_2));
push(LEAD("The question here is simple: on the dirtiest days of the year, what else is different? The table compares the cleanest quarter of days against the dirtiest quarter."));
push(table([
  ["On the dirtiest days there is", "Clean days", "Dirty days", "Does it move with PM2.5?"],
  ["Far more burning nearby", "few fires", "many fires", "YES, strongly. The only one of these that actually causes smoke"],
  ["Almost no rain", "12.6 mm", "0.0 mm", "Yes, but this is just the season. Nobody burns in the rainy months"],
  ["Much drier air", "85.6 %", "61.5 %", "Yes, same reason as rain"],
  ["Slightly cooler air", "26.5 °C", "25.3 °C", "Barely"],
  ["The same wind", "4.15 km/h", "4.16 km/h", "NO. Identical to two decimal places"],
  ["The same mixing depth", "335.7 m", "364.4 m", "NO"],
  ["The same ventilation", "1431.9 m·km/h", "1473.3 m·km/h", "NO"],
], [2700, 1650, 1650, 3746]));
push(NOTE("Spearman ρ against daily PM2.5: fires +0.695, precipitation −0.711, humidity −0.706, temperature −0.100, boundary layer height +0.069, ventilation +0.019, wind speed −0.013. Boundary layer height is the depth of air that smoke is free to mix into; ventilation combines it with wind speed."));
push(LEAD("Two of these came out the opposite of what was expected, and both are reported rather than quietly dropped."));
push(table([
  ["Expected", "Found", "Best explanation"],
  ["Bad days are days the wind does not blow", "Wind speed on clean and dirty days is the same number", "Wind at ground level in a mountain basin is not what clears the air"],
  ["Bad days are days the air sits in a shallow lid over the valley", "Mixing depth shows almost nothing either", "A daily average mixes the deep afternoon layer with the shallow night one and cancels the signal. The night-time minimum is probably the right quantity, and it was not computed"],
], [2900, 2900, 3946]));
push(P("So this report does not claim to have shown how the smoke clears, and the conclusion does not claim it either."));

push(H("4.4 Part C, model performance against baseline (C5)", HeadingLevel.HEADING_2));
push(H("4.4.1 Guessing \"tomorrow = today\" is hard to beat, except where it matters", HeadingLevel.HEADING_3));
push(...figure("fig06_persistence_limits.png", 6,
  "Autocorrelation of daily mean PM2.5 by lag in days (left), and the distribution of persistence forecast error in µg/m³, split by whether the day crossed the 37.5 threshold (right)."));
push(table([
  ["", "Days", "Persistence MAE (µg/m³)", "Reading"],
  ["All days", "1,335", "3.98", "Lag-1 autocorrelation is 0.894, so yesterday explains about 80% of today"],
  ["Days keeping the same side of 37.5", "1,261  (94.5%)", "3.59", "No warning system is needed: everyone can already see the air"],
  ["Days crossing 37.5", "74  (5.5%)", "10.60", "Three times worse. The entire information gap sits here"],
], [3100, 1700, 2100, 2846]));

push(H("4.4.2 Predicting the number: the win is small, and only on the right days", HeadingLevel.HEADING_3));
push(LEAD("MAE is the average size of the miss in µg/m³. Lower is better. The comparison that counts is the last column, the days the air actually changes."));
push(table([
  ["Model", "Ordinary days", "Burning season", "Days the air changes"],
  ["Guessing \"same as yesterday\"", "4.118", "6.846", "14.079"],
  ["Ridge", "4.303", "6.529", "11.791"],
  ["Histogram gradient boosting", "3.946", "6.424", "12.098"],
], [3200, 1950, 1950, 1950]));
push(NOTE("Mean absolute error in µg/m³ over 454 test days. outputs/results/metrics.json"));
push(...figure("fig07_regression_vs_baseline.png", 7,
  "Test set predictions against actual daily mean PM2.5 in µg/m³ (top) and absolute error by day (bottom), with transition days marked.", 380));
push(table([
  ["Reading", ""],
  ["On ordinary days the model barely wins", "3.95 against 3.98, a 4% gain, which is smaller than the 5.38 bias the data itself carries. Not worth claiming"],
  ["On the days that matter it wins clearly", "14.1 down to 11.8, a 16% cut, and both models manage it"],
], [3600, 6146]));

push(H("4.4.3 Predicting danger: 91% caught, at the price of 26 false alarms", HeadingLevel.HEADING_3));
push(LEAD("Instead of a number, this asks a yes or no question: will tomorrow go over 37.5? There are only two ways to be wrong, and they do not cost the same."));
push(table([
  ["Approach", "Dangerous days it missed", "False alarms", "Caught what share of dangerous days"],
  ["Say \"safe\" every day", "45", "0", "0%"],
  ["Guess \"same as yesterday\"", "8", "8", "82%"],
  ["This model, threshold 0.344", "4", "26", "91%"],
  ["This model, tuned to never miss", "0", "99", "100%"],
], [3300, 2100, 1600, 2746]));
push(NOTE("454 test days, 45 of them above the standard. Of the 67 warnings issued at the chosen threshold, 41 were right."));
push(table([
  ["One score for every threshold at once, formally PR-AUC", ""],
  ["The test", "Rank all 454 test days from most likely dangerous to least, on the model score alone, and see whether the 45 genuinely dangerous days sit near the top"],
  ["The scale", "Ranking at random scores 0.099, since only 9.9% of days are dangerous. Putting all 45 first scores 1.000"],
  ["This model", "0.877. The dangerous days pile up near the top instead of scattering, which is what says the model holds real information. Where to put the threshold is then a separate decision about how to spend it"],
], [2900, 6846]));
push(...figure("fig08_classification_threshold.png", 8,
  "Precision to recall curve with the chosen operating point (left) and the confusion matrix at that threshold over 454 test days (right)."));
push(table([
  ["Why 0.344 and not the default 0.5", ""],
  ["The two mistakes cost different amounts", "A false alarm costs one day of opening a clean-air room and handing out masks, reversible and already budgeted. A miss costs a day of people breathing it unprotected"],
  ["So the threshold was moved to buy recall", "Missed days drop from 8 to 4 against the baseline, false alarms rise from 8 to 26"],
  ["But not all the way", "The last row of the table is why. Catching every single day means warning once every four and a half days, which is how a warning system teaches people to ignore it"],
], [3200, 6546]));

push(H("4.4.4 Cross-validation scores worse, and the split is why, not the model", HeadingLevel.HEADING_3));
push(table([
  ["", ""],
  ["The two numbers", "The ranking score just described, measured on the training years by cross-validation: 0.318 ± 0.292. Measured on the single test period: 0.877"],
  ["Why they differ", "Cross-validation cuts the timeline into five blocks in order. Some blocks land almost entirely in the clean half of the year, where there are barely any dangerous days to find, so the score there collapses toward the base rate"],
  ["Is the model unstable", "No. This is the split meeting a strongly seasonal series, not the model behaving differently run to run. The ± 0.292 is the size of that effect"],
  ["Which number to believe", "The test period, because it contains one complete burning season. The cross-validation spread is reported next to it rather than hidden, since reporting only the mean would look like the model works everywhere equally"],
], [1900, 7846]));
push(H("4.5 Fire explains the daily variation but not the yearly variation", HeadingLevel.HEADING_2));
push(P("Fire detections were expected to explain both the daily and the year-to-year variation in exceedance days. They explain the first and not the second."));
push(...figure("fig10_emission_vs_outcome.png", 10,
  "Fire detections within 100 km against PM2.5 at two time scales: one point per day, log x-axis (left) and one point per year (right)."));
push(table([
  ["Year", "Fire detections within 100 km", "Days above 37.5 µg/m³", ""],
  ["2023", "19,190", "40", ""],
  ["2024", "21,312", "11", "most fires, fewest bad days"],
  ["2025", "9,329", "29", "fewest fires, nearly 3× 2024's bad days"],
  ["2026", "19,491", "45", "241 days only"],
], [1100, 3200, 2400, 3046]));
push(NOTE("outputs/results/emission_vs_outcome.csv. Day to day, the same two quantities correlate at Spearman ρ = 0.695."));
push(PR([
  { t: "Both statements are true simultaneously, and together they carry a conclusion neither carries alone: " },
  { t: "the year-to-year variation in the number of days above the standard is not principally a measure of how much burning occurred.", b: true },
  { t: " This report cannot say what it is a measure of. The obvious candidate, dispersion, is not supported by the meteorological variables available here (see what accompanies the worst days). Identifying the mechanism would need sub-daily mixing depth, which was not computed, or transport modelling, which is out of scope. What the finding supports is a negative claim, and it is what the recommendation to report burning and exposure separately rests on." },
]));

// ================================================================ 5
push(H("5 · Conclusion", HeadingLevel.HEADING_1));

push(H("5.1 Four findings, and what each one costs to believe", HeadingLevel.HEADING_2));
push(LEAD("Each finding is paired with the thing that limits it, so neither is read without the other."));
push(table([
  ["Finding", "Conclusion", "Challenge"],
  ["The dataset is a model, and it reads low",
   "0.00% missing in 38 columns identifies it as CAMS output. Against instruments: −5.38 µg/m³ mean bias, low at 14 of 14 stations, n = 70",
   "Measured only in clean air, 6.9 to 18.4 µg/m³, so the size of the gap near 37.5 is unknown"],
  ["Guessing \"tomorrow = today\" is hard to beat, except where it matters",
   "Yesterday explains about 80% of today. The guess is off by 3.59 on the 94.5% of stable days and by 10.60 on the 5.5% that cross the standard",
   "That leaves a narrow margin for any model, and the overall win is smaller than the bias the data already carries"],
  ["A one-day warning is achievable, and its cost is countable",
   "41 of 45 dangerous days caught, 4 missed, 26 false alarms in 454 days, against a baseline that misses 8 and raises 8",
   "The warning predicts the model's exceedance days, not the air's, until it is retrained on measured data"],
  ["The yearly count of bad days does not measure burning",
   "Fires and smoke move together day to day, ρ = 0.695. Year to year they do not: the most fires (2024) came with the fewest bad days (11)",
   "What the yearly variation does track is not identified. Dispersion, the obvious candidate, is not supported by this data"],
], [2500, 3900, 3346]));

push(H("5.2 Part D, the five questions, answered", HeadingLevel.HEADING_2));
push(qaTable([
  ["Question", "Answer"],
  ["What specifically do you recommend?",
   "Three things, set out one per section below. (1) Publish a next-day probability that the daily mean will exceed 37.5 µg/m³, with its miss rate. (2) Report a burning measure and an exposure measure as two numbers instead of exceedance days alone. (3) Add an air-pollution category to the national relief schedule, which currently has none."],
  ["Who is it for?",
   "Recommendation 1: Health Center 1 Chiang Mai (ศูนย์อนามัยที่ 1 เชียงใหม่), which runs the northern clean-air-room programme, and the Provincial Public Health Office. Recommendation 2: the Chiang Mai provincial PM2.5 working group and the Provincial Office of Natural Resources and Environment. Recommendation 3: the Department of Disaster Prevention and Mitigation and the provincial governor."],
  ["What does your analysis actually support?",
   "That persistence fails specifically on transition days and that a model reduces error there by 16%. That a classifier halves the unwarned dangerous days from 8 to 4 at a cost of 18 additional false alarms. That CAMS reads about 5 µg/m³ low at every station tested. That annual exceedance-day counts do not track annual fire counts."],
  ["What are you extrapolating?",
   "Every costing and every health figure in the background section comes from cited external sources, not from this analysis. The claim that a one-day warning would change outcomes assumes the mandated actions are effective, which is not tested here. The mechanism behind the year-to-year decoupling is not identified, only its existence."],
  ["If your recommendation depends on your model, what happens on the days your model is wrong?",
   "There are two ways it is wrong, and only one is the model's fault. Model error: 4 exceedance days in 454 arrive unwarned at the chosen threshold; at the CMU mortality elasticity of +1.6% per 10 µg/m³ over six days [4], those are not a rounding error, and the system should publish that rate. Source error, which is larger: the model predicts CAMS's exceedance days, and C6 shows CAMS reads ~5 µg/m³ low and does so unevenly between provinces. Before deployment it must be retrained on measured station data."],
  ["What would you need that you do not have?",
   "The limitations table below sets these out. In one line: five years of measured, district-resolution station data, which would remove both the model-versus-instrument problem and the resolution problem at once."],
], 3300));

push(H("5.3 Recommendation 1, warn one day ahead, and publish the miss rate", HeadingLevel.HEADING_2));
push(LEAD("Publish each evening the probability that tomorrow exceeds 37.5 µg/m³, so clean-air rooms open and schools are told the night before rather than the morning after."));
push(table([
  ["PIC", "Health Center 1 Chiang Mai, which runs the northern clean-air-room programme, and the Chiang Mai Provincial Public Health Office"],
  ["Expected outcome", "Days that arrive unannounced fall from 8 in 454 to 4. The model catches 91% of dangerous days against the baseline's 82%, using actions the surveillance-zone designation already mandates"],
  ["Challenge", "As demonstrated it predicts CAMS, not the air, so it must be retrained on measured station data before it is switched on. The miss rate has to be published with the forecast, or the system is asking for trust it has not earned"],
], [1700, 8046]));

push(H("5.4 Recommendation 2, report burning and exposure as two numbers, not one", HeadingLevel.HEADING_2));
push(LEAD("Stop treating the annual count of days above 37.5 µg/m³ as the score for how well the season was managed. Report it next to a burning measure."));
push(table([
  ["PIC", "The Chiang Mai provincial PM2.5 working group and the Provincial Office of Natural Resources and Environment. Both measures are already collected, by GISTDA and the FireD permit system, so nothing new has to be gathered"],
  ["Expected outcome", "A bad-burning year and a bad-weather year can be told apart. 2024 had the most fires and the fewest bad days; 2025 had the fewest fires and nearly three times as many. One number cannot separate those, and a province judged on one number is judged largely on the weather"],
  ["Challenge", "This does not identify what the year-to-year variation does track. Dispersion, the obvious candidate, is not supported by the weather data here, so the recommendation rests on the negative finding alone"],
], [1700, 8046]));

push(H("5.5 Recommendation 3, add an air-pollution line to the relief schedule", HeadingLevel.HEADING_2));
push(LEAD("Thailand's emergency relief schedule has categories for a destroyed home and for lost tools, and none for a household that could not work for six weeks."));
push(table([
  ["PIC", "The Department of Disaster Prevention and Mitigation and the Chiang Mai provincial governor, using relief machinery that already exists [19]"],
  ["Expected outcome", "Relief triggers on exposure rather than on catastrophe. Funds are currently released only after five days above 125 µg/m³ have already been endured [20]; an index built on exceedance days would arrive while the harm is still being done"],
  ["Challenge", "This report contributes only the exposure-day counts such an index would use. The relief categories and the trigger rule are cited from regulation, not derived here"],
], [1700, 8046]));

push(H("5.6 What this analysis cannot support, and what would fix each one", HeadingLevel.HEADING_2));
push(table([
  ["This analysis does not support", "Why", "What would fix it"],
  ["The true number of exceedance days", "All counts are CAMS's; C6 measures the gap only in clean air", "Measured station data"],
  ["Any trend", "Four years, one of them 241 days; counts swing 11 to 45 with no direction", "A longer measured record"],
  ["Seasonal forecasting", "Four burning seasons cannot train or validate next year's onset", "A decade of measured data"],
  ["Urban versus rural within Chiang Mai", "The source resolves ~45 km; one pair 12 km apart returned identical data", "CMU CCDC DustBoy: five years of hourly station data, Mae Chaem and Chiang Dao included. Needs approval"],
  ["Causation", "Fire counts nearby do not establish those fires made its PM2.5", "Atmospheric transport modelling"],
  ["Whether the burning ban worked", "No enforcement records and no comparison group", "FireD permit records, Envilink; TamRoyPao burn scars at 20 m"],
  ["Full operational validity of the forecast features", "The fc_* columns may not have been available at prediction time", "Open-Meteo Previous Runs API, _previous_day1"],
  ["Health cost of the four missed days", "From a literature elasticity, not from data", "NHSO outpatient use is open; MoPH HDC needs authorisation"],
  ["The dispersion hypothesis", "Daily averaging appears to cancel the signal", "Nocturnal minimum mixing depth"],
  ["The tourism claim", "Cited from the literature, not tested here", "Monthly arrivals by province, MOTS"],
], [3000, 3600, 3146]));

// ================================================================ references
push(PB(), H("References", HeadingLevel.HEADING_1));
[
  "[1] Thai PBS, northern hotspot breakdown by land classification, 20 April 2026. thaipbs.or.th/news/content/504805",
  "[2] Pollution Control Department, revised ambient PM2.5 standard, effective 1 June 2023; Royal Gazette 3 July 2023. pcd.go.th/pcd_news/29901/",
  "[3] Committee on Occupational Disease and Environmental Disease Control, announcement of 4 February 2025 defining surveillance and disease control zones. region1.prd.go.th/th/content/category/detail/id/57/iid/361709",
  "[4] Bangkok Post, reporting Chiang Mai University Faculty of Medicine findings on PM2.5 mortality and northern lung cancer rates, 7 April 2024. bangkokpost.com/thailand/general/2772351/",
  "[5] Scientific Reports 12(1), 7 August 2023, disease burden of air pollution in ten northern provinces. nature.com/articles/s41598-023-39930-9",
  "[6] BMC Public Health, 5 February 2026, cost of respiratory illness across all 25 districts of Chiang Mai, FY2023. link.springer.com/article/10.1186/s12889-026-26478-2",
  "[7] PIER / Kasetsart University (W. Attavanich), welfare cost of PM2.5, 2019 data, published 23 February 2023. thaipublica.org/2023/02/pier-air-pollution-pm2-5-01/",
  "[8] Namcome & Tansuchat (2021), Community and Social Development Journal, multivariate GARCH analysis of PM2.5 and foreign tourist arrivals in Chiang Mai. so05.tci-thaijo.org/index.php/cmruresearch/article/view/247437",
  "[9] National Statistical Office, provincial household income, 2023. nso.go.th/public/e-book/Analytical-Reports/Income-2566/46/",
  "[10] National Statistical Office, Household Socio-Economic Survey, first half 2025. nso.go.th/nsoweb/storage/survey_detail/2025/20251001104758_86578.pdf",
  "[11] Department of Provincial Administration, Chiang Mai population as at 31 December 2025. opsmoac.go.th/chiangmai-dwl-files-481291791021",
  "[12] Bangkokbiznews, Ministry of Public Health northern clean-air-room programme, 19 April 2026. bangkokbiznews.com/news/news-update/1230235",
  "[13] Lanner, volunteer firefighter pay and conditions in Chiang Mai, 20 March 2026. lannernews.com/20032569-02/",
  "[14] Thai Hotels Association sentiment index via Prachachat, April 2025. prachachat.net/tourism/news-1812611",
  "[15] Ministry of Education instruction on outdoor activities during PM2.5 episodes, 23 January 2025. moe360.blog/2025/01/23/pm25-23012025/",
  "[16] The Standard, House rejects Senate version of the Clean Air Bill, 2 September 2026. thestandard.co/house-rejects-clean-air-bill/",
  "[17] Chiang Mai News, provincial hotspot and burned-area figures for 2026. chiangmainews.co.th/news/3944562/",
  "[18] Chiangmai Daily, provincial figures for 2025, reporting the Provincial Office of Natural Resources and Environment, 30 June 2025. chiangmaidaily.com/2025/06/30/",
  "[19] Department of Disaster Prevention and Mitigation, revised emergency assistance rates effective 6 March 2026. queensirikit.prd.go.th/th/content/category/detail/id/39/iid/481398",
  "[20] Government declaration of disaster zones in Chiang Mai, Lamphun and Phayao, 5 April 2026. prd.go.th/th/content/category/detail/id/33/iid/491804",
].forEach(t => push(P(t, { size: 19, after: 100 })));

// ================================================================ appendix
push(PB(), H("Appendix", HeadingLevel.HEADING_1));
push(...figure("fig01_season_onset.png", "A1",
  "PM2.5 7-day rolling mean by day of year, one line per year, µg/m³ (top), and the resulting season window per year (bottom). Season onset is defined as the first day the 7-day mean exceeds 37.5 µg/m³.", 430));
push(...figure("fig04_weather_conditions.png", "A2",
  "Distribution of each meteorological variable on days in the best and worst quartiles of daily mean PM2.5. Units are given on each panel."));
push(...figure("fig05_weekly_pattern.png", "A3",
  "Mean daily PM2.5 in µg/m³ by day of week, split by season. Error bars are one standard error of the mean.", 400));

// ================================================================ AI disclosure
push(PB(), H("Use of AI tools", HeadingLevel.HEADING_1));
push(P("This project was carried out by one student working with AI agents. The table below divides the work between me and the four AI agents I directed. Every agent output passed back through me before it entered this report."));
push(SPACER());
push(table([
  ["Who", "What they did"],
  ["Thana (me)",
   "Selected the data sources and the question. Wrote and ran the fetch. Set the overall framework and the repository layout. Drafted the initial notebooks. Set every parameter, including the 18-hour coverage rule, the 37.5 threshold, the train and test split dates and the 90% recall target. Made every final decision about what entered this report and what was cut."],
  ["AI agent 1",
   "Deep analysis. Exploratory figures, the season and place comparisons, the weather correlation sweep and the emissions against outcome comparison."],
  ["AI agent 2",
   "Model training. The baseline, ridge, gradient boosting and logistic regression pipelines, the time-series cross-validation and the metric reporting."],
  ["AI agent 3",
   "Checking the model against the real world. The six checkpoints, the Air4Thai comparison and the grid resolution test."],
  ["AI agent 4",
   "Drafting the report and the presentation from my output files."],
], [1800, 7946]));
push(SPACER());
push(table([
  ["What I changed or rejected in the agents' work", ""],
  ["Checkpoint C4",
   "Rejected the first version. It compared the coordinates the API reported and passed. I noticed two points with different coordinates returning identical PM2.5 values and had the check rewritten to compare the series themselves. The rewritten check found one identical pair out of fifteen, and this changed the spatial design of the whole project."],
  ["Scope of the fetch",
   "Cut the district-level points and kept four provincial capitals, once the rewritten check showed nearby points were not independent."],
  ["Features",
   "Adopted the allow-list and the assertion guard after being warned that ERA5 values for the next day are reanalysis. Recorded that even the forecast archive may not be fully clean."],
  ["Background claims",
   "Checked every figure against its cited source and excluded several that could not be verified."],
  ["The report text",
   "Restructured it into tables, removed the jargon, and verified every number against the files in outputs/ before accepting it."],
], [2300, 7446]));
push(SPACER());
push(P("I am responsible for every line of code and every claim in this report.", { italics: true }));

// ---------------------------------------------------------------- assemble
const doc = new Document({
  styles: { default: { document: { run: { font: "Calibri", size: 21, color: INK } } } },
  sections: [{
    properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            children: ["DS-270702 · Homework 4 · PM2.5 in Northern Thailand    ", PageNumber.CURRENT],
            size: 16, color: MUTED, font: "Calibri",
          })],
        })],
      }),
    },
    children: body,
  }],
});

Packer.toBuffer(doc).then(b => {
  fs.writeFileSync(OUT, b);
  console.log("wrote", OUT, (b.length / 1e6).toFixed(2), "MB");
});
