# DRAFT — Sections 1, 2 and 5, plus the AI disclosure table

Companion to `DRAFT_method_results.md`. Together they cover the five required
sections of the report.

**How to use this.** Section 2 contains four statements about what you expected
before starting. They are plausible priors and they are the ones your results
actually overturned — but they have to be *yours*. Read each one and either keep
it because it was true of you, or replace it with what you did expect. An examiner
can tell the difference, and Section 2 is where they will look.

Section 5 makes a choice: it argues **two** recommendations rather than four,
because the lab sheet asks for something concrete rather than a list. If you prefer
different ones, `docs/PART_D_DRAFT.md` has the other two with their evidence chains.

Citations use `[n]` and resolve to the reference list at the end. Every source there
is real and dated; check any you quote before submitting.

---

# 1 · Problem background

## 1.1 What the problem is

Between roughly January and April each year, air quality across the eight upper
northern provinces of Thailand deteriorates to levels that are hazardous to breathe.
Three sources combine: the burning of agricultural residue after the rice and maize
harvests, forest fires on protected land, and smoke transported across the borders
with Myanmar and Laos. A fourth factor is not a source but a multiplier — Chiang
Mai sits in a mountain basin, and during the dry season a stable atmosphere traps
smoke in the valley rather than dispersing it.

The distribution of that burning is not what public discussion usually assumes. On
20 April 2026, of 1,518 hotspots detected across the northern region, **1,013 were
in conservation forest and 435 in national reserved forest; only 70 were outside
forest land** [1]. Two-thirds of fire activity occurs on protected land, which means
measures aimed only at agriculture cannot resolve the problem.

Thailand tightened its 24-hour ambient PM2.5 standard from 50 to **37.5 µg/m³**
with effect from 1 June 2023 [2]. That single number carries statutory weight. Under
the Occupational Disease and Environmental Disease Control Act, a 24-hour mean
above 37.5 µg/m³ defines a *surveillance zone*, obliging agencies to distribute
masks to vulnerable groups and to prepare dust-free areas in hospitals, schools and
community centres; above 75 µg/m³ a *disease control zone* additionally requires
government work-from-home, suspension of outdoor activities, and evacuation
shelters [3].

## 1.2 Why it matters

**Health.** Research at the Chiang Mai University Faculty of Medicine estimates that
each additional 10 µg/m³ of daily mean PM2.5 raises Chiang Mai's mortality rate by
approximately **1.6% over the following six days** [4]. Across the ten northern
provinces, PM2.5 is associated with a disability burden of roughly **41,372 years
lived with disability per 100,000 population per year** [5]. Lung cancer mortality
in the northern region rose from 20.3 to 30.7 per 100,000 between 2010 and 2019,
the highest of any Thai region [4]. Treatment costs are documented for Chiang Mai
specifically: a study of all 25 districts found a mean of **US$17.16 per outpatient
respiratory visit and US$376.47 per inpatient admission** in FY2023 [6].

**Economics.** A valuation study using national survey data put the annual welfare
cost of PM2.5 in Chiang Mai province at approximately **70.4 billion baht** [7]. The
tourism effect has been estimated directly: a multivariate GARCH analysis of
2014–2018 arrivals found that a 5% rise in monthly average PM2.5 was associated with
**106,060 fewer foreign tourists in Chiang Mai and an opportunity loss of
476 million baht**, concentrated in April and May [8].

**Household capacity to protect itself.** Median monthly household income in Chiang
Mai is **18,620 baht** [9], and northern households already spend about 77.5% of
income [10]. An entry-level air purifier adequate for one bedroom costs
2,240–3,590 baht at Thai retail — between 12% and 19% of one month's median income,
before filters and electricity. Self-protection is therefore constrained by
liquidity, not by awareness.

## 1.3 Who is affected

The population of Chiang Mai province is approximately 1.80 million [11]. The
Ministry of Public Health's 2026 northern programme targeted 1.62 million people in
vulnerable groups and reported 2,275 clean-air rooms with 218,415 users across ten
provinces [12].

Three groups are exposed in ways that are easy to overlook. Roughly **20,000
volunteer firefighters** in Chiang Mai are paid 200–300 baht per day, below minimum
wage and without accident insurance; at least two died on duty in 2026 [13].
Tourism-dependent small businesses lose their season precisely when the air is
worst: northern hotel occupancy fell to 38.7% in April 2025 from 47.3% in March,
against a national figure near 63% [14]. And schoolchildren are affected without a
formal protocol — the Ministry of Education has instructed schools to suspend
outdoor activities during episodes [15], but no threshold-based national closure
rule and no consolidated register of closures could be located.

## 1.4 Policy context

Two facts frame any recommendation. First, Thailand still has **no dedicated clean
air statute**: the Clean Air Bill passed the House in October 2025 and the Senate in
July 2026 in materially different forms, and as of 2 September 2026 the House
rejected the Senate version 414–2 and referred it to a joint committee [16].

Second, and more uncomfortable, doing more of the current policy has not obviously
worked. Chiang Mai's 2026 burning ban ran 1 January to 31 May, the longest and
earliest on record — and the province recorded 11,023 hotspots against 4,709 the
previous year, with burned area rising from 704,453 to 1,468,289 rai [17][18]. That
observation is what motivates the question in Section 2.

---

# 2 · Approach

## 2.1 The question

This project sets out to answer one question in two parts:

> **Can tomorrow's PM2.5 in Chiang Mai be predicted accurately enough to be useful
> as a warning, and if so, what should be done differently as a result?**

## 2.2 Why this question

Two features of the existing system make it the right question to ask.

The first is that **the trigger already exists and is reactive**. As set out in
§1.1, a 24-hour mean above 37.5 µg/m³ already obliges specific actions. Those
obligations are activated by a measurement that has already been taken — masks are
distributed on a day whose air is already bad, and a clean-air room opens after
people have breathed the morning. The gap a forecast can fill is therefore precisely
defined: it is worth exactly one day of lead time on an action that is already
mandated and already funded. That is a narrow claim, and it is testable.

The second is that **the outcome measure may not measure what it is used for**. The
province reports the annual count of days above the standard, and that number is
what the public and the press judge performance by. Section 1.4 notes that 2026
combined the longest ban on record with the worst fire season on record. If policy
effort and the headline number can move in opposite directions, then the number
deserves examination before it is used to evaluate anything.

A third consideration was practical. Both parts can be answered with data that is
free, scriptable, and available without a key or an approval process — which,
given a two-week deadline, mattered.

## 2.3 What I expected to find before starting

Recording these matters, because three of the four turned out to be wrong, and the
places where they were wrong are the substance of Section 4.

1. **I expected a gradient-boosted model with weather features to beat a persistence
   baseline comfortably.** It beat it by 4% on overall MAE, which is less than the
   model's own bias against instruments, and the only meaningful improvement was on
   the small subset of days where conditions change.
2. **I expected wind speed to be the dominant meteorological driver**, on the
   reasoning that still air lets smoke accumulate. Its correlation with daily PM2.5
   is −0.013. Adding boundary layer height, which should capture basin trapping
   more directly, did not help either.
3. **I expected two points 90 km apart inside Chiang Mai province to be different
   places in the data.** One pair 12 km apart returned byte-identical values for a
   full week, while the API reported different coordinates for them.
4. **I expected years with more burning to have more days above the standard.** The
   year with the most detected fires had the fewest such days.

I also expected, correctly, that the air quality source would turn out to be model
output rather than measurement, and planned the comparison against Air4Thai
instruments from the start.

---

# 5 · Conclusion

## 5.1 What I found

**The dataset is a model, and it reads low.** Every PM2.5 value used here is
Copernicus CAMS output, identifiable because it is 0.00% missing across three and a
half years of hourly data. Compared against Air4Thai instruments across 70 paired
observations, CAMS read lower at **every one of 14 northern stations**, with a mean
bias of **−5.38 µg/m³**. Every exceedance count in this report is therefore more
likely an under-count than an over-count.

**Persistence is hard to beat, except where it matters.** Daily PM2.5 has a lag-1
autocorrelation of 0.894. "Tomorrow is like today" is accurate to within
3.59 µg/m³ on the 94.5% of days when conditions do not change, and wrong by
10.60 µg/m³ on the 5.5% of days that cross the standard. A model earns its place
only on the second group, and it does: transition-day error falls from 14.08 to
11.79 µg/m³.

**A one-day warning is achievable and its cost is quantifiable.** At a threshold
chosen for approximately 90% recall, the classifier catches 41 of 45 exceedance days
in a 454-day test period, missing 4 and raising 26 false alarms — against
persistence, which misses 8 and raises 8.

**The annual count of exceedance days does not measure burning.** Fire detections
and PM2.5 move together strongly day to day (ρ = 0.695) and not at all year to
year: 2024 had the most detected fires and the fewest exceedance days; 2025 had
under half as many fires and nearly three times as many bad days.

## 5.2 Recommendation 1 — publish a next-day exceedance probability, and choose its threshold openly

**For: Health Center 1 Chiang Mai (ศูนย์อนามัยที่ 1 เชียงใหม่), which operates the
northern clean-air-room programme, and the Chiang Mai Provincial Public Health
Office.**

Publish each evening a probability that the following day's mean will exceed
37.5 µg/m³, alongside the current-conditions figure already published, and use it to
pre-position the actions that the surveillance-zone designation already mandates:
opening clean-air rooms, distributing masks, and notifying schools before the
morning rather than during it.

Three specifics, because a recommendation that cannot be implemented is not one.

**Set the threshold by the asymmetry of the two errors, not at 0.5.** A false alarm
costs one day of opening a room and distributing masks — reversible, and already
within an existing budget line. A miss costs a day of unprotected exposure for a
population of 1.62 million people in designated vulnerable groups. On this data a
threshold of 0.34 delivers 91% recall.

**Publish the miss rate.** Four dangerous days in 454 arrived unwarned at the chosen
threshold. A warning system that conceals its own error rate is asking for trust it
has not earned.

**Do not pursue zero misses.** Catching all 45 exceedance days requires a threshold
of 0.02 and 99 false alarms — a warning roughly every four and a half days. The four
missed days are the price of a system people continue to act on.

**What this recommendation depends on, and where it breaks.** It rests on a model
trained on CAMS, which C6 shows reads about 5 µg/m³ low and does so unevenly between
provinces. The system as demonstrated predicts *the model's* exceedance days. Before
deployment it must be retrained on measured station data. This is a demonstration
that the method works, not a system ready to be switched on, and it should not be
presented as one.

## 5.3 Recommendation 2 — report emissions and exposure as two numbers, not one

**For: the Chiang Mai provincial PM2.5 working group and the Provincial Office of
Natural Resources and Environment (สำนักงานทรัพยากรธรรมชาติและสิ่งแวดล้อมจังหวัดเชียงใหม่).**

Stop reporting the annual count of days above 37.5 µg/m³ as the headline measure of
whether the season went well. Report two numbers instead: an **emissions measure**
(hotspot count and burned area, both already collected through GISTDA and the FireD
permit system) and an **exposure measure** (exceedance days), and present them
together so that a bad-weather year and a bad-burning year can be told apart.

The evidence is §4.5. Fires and smoke track each other closely from day to day, and
the annual totals are unrelated — the year with the most fires had the fewest bad
days. A province evaluated on exceedance days alone is being evaluated substantially
on conditions it does not control, in both directions: it can be blamed for a bad
year in which enforcement improved, and credited for a good year in which nothing
changed but the weather.

**What this analysis does not establish.** It does not identify what drives the
year-to-year variation. The obvious candidate is dispersion, and this analysis does
not support it: daily-mean boundary layer height (ρ = +0.069), the ventilation index
built from it (+0.019) and wind speed (−0.013) are all effectively uncorrelated with
PM2.5. The likely reason is that daily means average the deep afternoon mixing layer
together with the shallow nocturnal one and cancel the signal, but that is a
hypothesis, not a result. The recommendation stands on the negative finding — that
exceedance-day counts do not track emissions — which does not require knowing what
they do track.

## 5.4 A third measure, resting on external evidence rather than this analysis

Thailand's emergency relief schedule contains categories for total loss of a home
(4,900 baht), livelihood tools (13,500 baht) and house repair (up to 88,600 baht)
[19]. All are written for floods and storms. None fits a household that could not
work, could not open its shop, and had to buy an air purifier, for six weeks. The
disaster-zone trigger itself — PM2.5 above 125 µg/m³ for five consecutive days
[20] — releases funds only after those five days have been endured.

Adding an air-pollution category to that existing schedule, indexed to exceedance
days, would use machinery that already exists rather than requiring a new agency or
statute. This report contributes only the exposure-day counts such an index would
use; the costing and the policy design rest on the sources cited, not on my own
analysis, and I flag that distinction rather than blur it.

## 5.5 What this analysis does not support

1. **The true number of exceedance days.** All counts are CAMS's; C6 measures the
   gap at low concentrations only, and does not establish the bias near 37.5.
2. **Any trend.** Four years, one of them 241 days. The counts swing from 11 to 45
   with no direction that this record can distinguish from noise.
3. **Seasonal forecasting.** Four burning seasons cannot train or validate a model
   that predicts next year's onset. Figure 1 describes what happened; it does not
   forecast. The 2024 season measures two days by the stated rule purely because
   that year's rolling mean grazed the threshold, which shows how sensitive the
   result is to a definition chosen by the analyst.
4. **Urban versus rural conditions within Chiang Mai.** The source resolves ~45 km;
   one pair of points 12 km apart returned identical data.
5. **Causation.** Fire counts near a location do not establish that those fires
   produced that location's PM2.5. That requires atmospheric transport modelling.
6. **The effect of any policy.** Nothing here can say whether the burning ban
   worked. That needs enforcement records and a comparison group.
7. **Full operational validity of the forecast features.** As set out in §3.4, the
   `fc_*` columns may not have been available at the moment of prediction.

## 5.6 What I would do with more time

**Retrain on measured data.** The CMU CCDC DustBoy network exposes five years of
hourly station data through an authenticated API, including stations in Mae Chaem
and Chiang Dao. This single change addresses limitations 1 and 4 together: it
removes the model-versus-instrument problem, and it provides the district-level
resolution the CAMS grid cannot. A key requires registration and administrative
approval, which is why it is future work rather than present work.

**Cost the missed days in health outcomes.** The four unwarned exceedance days are
currently expressed through a mortality elasticity taken from the literature.
Provincial admissions data would let them be costed directly. The Ministry of Public
Health's HDC platform requires a supervisor's authorisation I do not have; the
National Health Security Office publishes provincial outpatient service use openly
and is the accessible substitute.

**Test the dispersion hypothesis properly.** The failure of daily-mean boundary
layer height is most plausibly an aggregation artefact. Recomputing with the
nocturnal minimum mixing depth, and with sub-daily rather than daily aggregation,
would establish whether the mechanism is absent or merely averaged away.

**Test the tourism claim.** Monthly arrivals by province are published by the
Ministry of Tourism and Sports. Joining them to these exceedance counts and
controlling for the seasonal pattern of provinces unaffected by haze would convert
"tourism suffers during the season" from an assertion into a difference-in-differences
estimate.

**Resolve the hotspot latency question.** FIRMS near-real-time products lag by about
three hours and standard-processing products by considerably longer. Establishing
which product a live system could rely on determines whether the hotspot features
used here are operationally available on day *t*.

---

# References

[1] Thai PBS, northern hotspot breakdown by land classification, 20 April 2026.
`https://www.thaipbs.or.th/news/content/504805`

[2] Pollution Control Department, revised ambient PM2.5 standard, effective
1 June 2023; Royal Gazette 3 July 2023. `https://www.pcd.go.th/pcd_news/29901/`

[3] Committee on Occupational Disease and Environmental Disease Control,
announcement of 4 February 2025 defining surveillance and disease control zones.
`https://region1.prd.go.th/th/content/category/detail/id/57/iid/361709`

[4] Bangkok Post, reporting Chiang Mai University Faculty of Medicine findings on
PM2.5 mortality and northern lung cancer rates, 7 April 2024.
`https://www.bangkokpost.com/thailand/general/2772351/`

[5] *Scientific Reports* 12(1), 7 August 2023, disease burden of air pollution in
ten northern provinces. `https://www.nature.com/articles/s41598-023-39930-9`

[6] *BMC Public Health*, 5 February 2026, cost of respiratory illness across all
25 districts of Chiang Mai, FY2023.
`https://link.springer.com/article/10.1186/s12889-026-26478-2`

[7] PIER / Kasetsart University (W. Attavanich), welfare cost of PM2.5, 2019 data,
published 23 February 2023. `https://thaipublica.org/2023/02/pier-air-pollution-pm2-5-01/`

[8] Namcome & Tansuchat (2021), *Community and Social Development Journal*,
multivariate GARCH analysis of PM2.5 and foreign tourist arrivals in Chiang Mai.
`https://so05.tci-thaijo.org/index.php/cmruresearch/article/view/247437`

[9] National Statistical Office, provincial household income, 2023.
`https://www.nso.go.th/public/e-book/Analytical-Reports/Income-2566/46/`

[10] National Statistical Office, Household Socio-Economic Survey, first half 2025.
`https://www.nso.go.th/nsoweb/storage/survey_detail/2025/20251001104758_86578.pdf`

[11] Department of Provincial Administration, Chiang Mai population as at
31 December 2025. `https://www.opsmoac.go.th/chiangmai-dwl-files-481291791021`

[12] Bangkokbiznews, Ministry of Public Health northern clean-air-room programme,
19 April 2026. `https://www.bangkokbiznews.com/news/news-update/1230235`

[13] Lanner, volunteer firefighter pay and conditions in Chiang Mai, 20 March 2026.
`https://www.lannernews.com/20032569-02/`

[14] Thai Hotels Association sentiment index via Prachachat, April 2025.
`https://prachachat.net/tourism/news-1812611`

[15] Ministry of Education instruction on outdoor activities during PM2.5 episodes,
23 January 2025. `https://moe360.blog/2025/01/23/pm25-23012025/`

[16] The Standard, House rejects Senate version of the Clean Air Bill,
2 September 2026. `https://thestandard.co/house-rejects-clean-air-bill/`

[17] Chiang Mai News, provincial hotspot and burned-area figures for 2026.
`https://www.chiangmainews.co.th/news/3944562/`

[18] Chiangmai Daily, provincial figures for 2025, reporting the Provincial Office
of Natural Resources and Environment, 30 June 2025.
`https://www.chiangmaidaily.com/2025/06/30/`

[19] Department of Disaster Prevention and Mitigation, revised emergency assistance
rates effective 6 March 2026.
`https://queensirikit.prd.go.th/th/content/category/detail/id/39/iid/481398`

[20] Government declaration of disaster zones in Chiang Mai, Lamphun and Phayao,
5 April 2026. `https://www.prd.go.th/th/content/category/detail/id/33/iid/491804`

*Fuller notes on every source above, including conflicting accounts and items that
could not be verified, are in `docs/RESEARCH_prevention.md` and
`docs/RESEARCH_recovery.md`.*

---

# Section 11 · Use of AI tools

**This table must be true. Edit every row so that it describes what you actually
did.** The rows below are a starting point based on this conversation; delete any
that do not apply and add anything missing.

| Where you used it | What you asked for | What you changed or rejected |
|---|---|---|
| Repository structure and pipeline scripts (`src/*.py`) | A project skeleton matching the required layout, with fetching, cleaning, joining and modelling separated into modules | Reviewed each module against the lab sheet's rules; kept the structure. Reduced the fetch to four provincial capitals after checkpoint C4 showed district-level points were not independent |
| Checkpoint C4 | A check that two locations return different data | **Rejected the first version.** It compared the coordinates the API reported and passed. I noticed two points with different coordinates returning identical PM2.5 values and had the check rewritten to compare the series themselves. The rewritten check found one identical pair out of fifteen |
| Feature construction and leakage guard | Advice on which features are knowable at the moment of prediction | Adopted the allow-list and the assertion guard. Added the historical forecast source after being warned that ERA5 values for *t+1* are reanalysis. Recorded in §3.4 that even the forecast archive may not be fully clean |
| Background research (§1) | Verified sources on Chiang Mai PM2.5 policy, health costs and household economics | Checked each figure against the cited source before using it. Excluded several claims that could not be verified |
| Report drafting | A draft of the Method and Results sections from my own output files | Rewrote in my own words and verified every number against the files in `outputs/`. [**Describe here what you actually cut or corrected — this column is the one that is read.**] |

*I am responsible for every line of code and every claim in this report.*
