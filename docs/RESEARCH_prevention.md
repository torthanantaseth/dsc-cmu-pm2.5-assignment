# Prevention of PM2.5 in Chiang Mai — verified status, September 2026

Research compiled 4 September 2026 by web search and fetch. Every claim carries a
source URL and the source's date. Items marked **[UNVERIFIED]** could not be
confirmed. Status is distinguished as **[ANNOUNCED]** / **[IMPLEMENTED]** /
**[EVALUATED]**.

> This is source material for Section 1 (Problem background) and Part D
> (Recommendation) of the report. Do not paste it in. Read the sources, pick the
> two or three facts your own analysis connects to, and cite them.

---

## 0. The headline that a data-science report should be built around

Chiang Mai in 2026 ran its **longest and earliest burning ban on record**
(1 Jan – 31 May) and had its **worst fire season in years**:

| Metric | 2568 (2025) | 2569 (2026) | Change |
|---|---|---|---|
| Hotspots, Chiang Mai | 4,709 | 11,023 | **+134%** |
| Burned area, Chiang Mai | 704,453 rai | 1,468,289 rai | **+108%** |
| Days PM2.5 > 37.5 µg/m³ | 60 | 53 | **−12%** |
| Legal cases against burners | — | 245 | — |

Sources: 2568 — [Chiangmai Daily, 30 Jun 2025](https://www.chiangmaidaily.com/2025/06/30/)
(provincial NRE Office); 2569 — [Chiang Mai News](https://www.chiangmainews.co.th/news/3944562/).
Worst districts 2569: Chiang Dao 1,532 hotspots, Hot 1,173, Mae Chaem 1,095,
Omkoi 1,076, Mae Taeng 790. Burned area: Mae Chaem 253,040 rai, Hot 209,881,
Chiang Dao 156,555.

**Why this matters for your report:** burning roughly doubled while exceedance
days fell slightly. Meteorology — ventilation, mixing depth, rainfall — dominates
the year-to-year PM2.5 signal. **"Days over standard" is therefore a poor KPI for
judging prevention policy**, and your `boundary_layer_height` and ventilation-index
features are the evidence for saying so. This is a defensible, non-obvious
recommendation that your own data supports: *change the KPI*.

---

## 1. Clean Air Act (ร่าง พ.ร.บ. บริหารจัดการเพื่ออากาศสะอาด)

**Status: NOT LAW. In joint House–Senate reconciliation as of 2 September 2026.** [ANNOUNCED]

| Date | Event | Source |
|---|---|---|
| Nov 2023 | Cabinet approves 7 draft versions | [Wikipedia](https://en.wikipedia.org/wiki/Clean_Air_Bill_(Thailand)) |
| 17 Jan 2024 | House 1st reading, unanimous | ibid. |
| 21 Oct 2025 | House 2nd + 3rd reading passed | [iLaw](https://www.ilaw.or.th/articles/55643) |
| 27 Oct 2025 | Senate 1st reading; 27-member committee | ibid. |
| ~Dec 2025 | House dissolved → bill lapses unless resubmitted in 60 days | ibid. |
| 5 May 2026 | Cabinet confirms bill among 31 to proceed | [Khaosod English](https://www.khaosodenglish.com/politics/2026/05/05/clean-air-bill-among-31-laws-cabinet-backs-to-proceed/) |
| May 2026 | Parliament votes 611–3 to continue 34 bills | [Thai PBS](https://www.thaipbs.or.th/news/content/505953) |
| **9 Jul 2026** | **Senate passes 145–4–11, with 5 major amendments** | [Bangkokbiznews](https://www.bangkokbiznews.com/sustainability/environment/1242681) · [The Standard](https://thestandard.co/senate-clean-air-act-differences/) |
| **2 Sep 2026** | **House rejects Senate version 414–2; 20-member joint committee formed** | [The Standard](https://thestandard.co/house-rejects-clean-air-bill/) · [Daily News](https://www.dailynews.co.th/news/6159107/) |

### What the House version would mandate
Source: [Policy Watch / Thai PBS](https://policywatch.thaipbs.or.th/article/environment-125)

- Five committees plus a Clean Air Management Office with inspection powers.
- **Clean Air Fund** (กองทุนอากาศสะอาด), separate from the Environment Fund; funds
  control technology, low-interest loans, **victim assistance**.
- Seven economic instruments: tax incentives, pollution fees, tradable permits,
  performance bonds, deposit-refund, subsidies, fee exemptions.
- **Emergency pollution zones** in two tiers — *alert* and *crisis* (exceeding the
  standard; requires a 60-day action plan with quarterly reporting).
- Transboundary: obliges diplomatic action and makes the state responsible for
  damages from external sources.
- Penalties: 2–5 years and fines up to **100 million baht**.

### The five contested Senate amendments
1. Deleted public-interest litigation rights (emergency court protection, NGO standing).
2. Deleted the **PRTR** (Pollutant Release and Transfer Register).
3. Added Chamber of Commerce and Federation of Thai Industries seats on committees.
4. Removed financial-institution liability for financing polluting activities.
5. Removed deposit-refund and mandatory air monitoring in agricultural areas.
   Also replaced elected local heads with appointed governors as provincial chairs.

⚠️ **Sources conflict** on items 2 and 4. The Standard says liability was retained;
Bangkokbiznews says removed. Daily News lists both among items sent to the joint
committee. Treat the detail as unsettled and say so if you cite it.

**Implication:** as of September 2026 Thailand has **no dedicated air-quality
statute**. Everything below operates under a patchwork of ~11 other laws — itself
a critique raised at a CMU forum ([Lanner, 6 Apr 2026](https://www.lannernews.com/06042569-04/)).

---

## 2. Fuel management and burn scheduling — FireD and Burn Check

**Status: IMPLEMENTED, weakly evaluated.**

Two parallel systems, commonly confused:

| System | Owner | Domain |
|---|---|---|
| **FireD (ไฟดี)** | Academic Center for Air Pollution in Northern Thailand (ศวอ.), CMU — [acair.cmu.ac.th/innovation/fired](https://acair.cmu.ac.th/innovation/fired/) | Forest / community fuel management |
| **Burn Check** | Department of Agricultural Extension | Agricultural burn registration, nationwide |

Chiang Mai's 2569 announcement names both: burning is permitted only "when
absolutely necessary", with registration in Fire-D / Burn Check, a firebreak,
district or tambon approval, and mandatory post-burn reporting
([Chiang Mai News](https://www.chiangmainews.co.th/news/chiangmai/3855620/)).
Two-phase process: community registers a request; the provincial command centre
decides using a 3–5 day weather forecast and current PM2.5
([Greennews](https://greennews.agency/?p=23771)).

### Evaluation evidence is thin, and old

- The **only quantitative evaluation found** is a *preliminary* 2021 assessment
  (Chakarit Chotiamornsak, CMU): hotspots down ~60%, burned area down ~50%
  ([Greennews](https://greennews.agency/?p=23771)). ⚠️ Press-reported, no published
  methodology, no counterfactual. **Do not cite as established effect.**
  **No peer-reviewed evaluation of FireD exists.** [UNVERIFIED]
- **Counter-evidence (2024):** Mae Chaem hotspots spiked because controlled burns
  went ahead *without firebreaks*; the deputy governor ordered a review
  ([MGR Online](https://mgronline.com/local/detail/9670000018542)).
- **Structural critique:** at CMU, "over two-thirds of requests for controlled
  burning came from **forest officials, not villagers**"
  ([Bangkok Post](https://www.bangkokpost.com/opinion/opinion/3002094/zero-burning-maximum-harm)).
- **Zoning (2567/2024):** Chiang Mai abandoned a blanket ban for **7 fuel-management
  zones**, explicitly acknowledging that "previous blanket bans inadvertently
  increased illegal burning during restricted periods"
  ([Chiang Mai PRD](https://chiangmai.prd.go.th/th/content/category/detail/id/9/iid/217061)).

---

## 3. Burning-ban windows

**Status: IMPLEMENTED annually; longer windows, worse outcomes.**

| Year | Window | Source |
|---|---|---|
| 2566 (2023) | 15 Feb – 30 Apr (75 days) | [Matichon](https://www.matichon.co.th/region/news_3796136) |
| 2567 (2024) | Blanket ban replaced by 7 zones | [Chiang Mai PRD](https://chiangmai.prd.go.th/th/content/category/detail/id/9/iid/217061) |
| 2568 (2025) | 1 Jan – 15 May (~135 days) | [PRD Radio Chiang Mai](https://radiochiangmai.prd.go.th/th/content/article/detail/id/57/iid/352430) |
| 2569 (2026) | **1 Jan – 31 May (151 days)** | [Chiang Mai News](https://www.chiangmainews.co.th/news/chiangmai/3855620/) · [Prachachat](https://www.prachachat.net/local-economy/news-1969652) |

Issued by Governor Ratthapol Naradisorn. Penalties 2568: up to 3 months and/or
2,500 baht. Forest burning over 25 rai: 4–20 years and up to 2 million baht under
integrated enforcement of 11+ laws ([Lanner, 6 Apr 2026](https://www.lannernews.com/06042569-04/)).

### Does the ban work, or just displace burning?

**For (the strongest published evidence):**
Uttajug, Ueda, Seposo, Honda & Takano (2022), *International Journal of
Epidemiology* 51(2):514. Interrupted time series, Jan–Apr, 2014–2016 vs 2017–2018.
PM10 down 5.3–34.3%; hotspots down 14.3–81.5%; **respiratory hospital visits down
9.1% (95% CI −12.9, −5.1)**; gastrointestinal visits as a negative control showed
no change. [DOI 10.1093/ije/dyac005](https://academic.oup.com/ije/article/51/2/514/6522740) **[EVALUATED]**

**Against:**
- Chiang Mai's own 2567 document: blanket bans "inadvertently increased illegal
  burning during restricted periods".
- 2016: a two-month zero-burning policy failed when "dry debris piling up in the
  forests" produced uncontrollable wildfires ([Bangkok Post](https://www.bangkokpost.com/opinion/opinion/3002094/zero-burning-maximum-harm)).
- Dr Pinkaew Laungaramsri (CMU): Thailand is repeating outdated Western
  fire-suppression doctrine ([Lanner, 8 Apr 2026](https://www.lannernews.com/08042569-01/)).
- 2026 empirically: longest ban, worst season. Correlational — 2026 had exceptional
  fire weather ([2026 Chiang Mai Smog](https://en.wikipedia.org/wiki/2026_Chiang_Mai_Smog)).

⚠️ **No published quantitative study tests temporal displacement around Thai ban
windows.** [UNVERIFIED] — **this is a tractable gap you could fill with public
hotspot data.** See §7.

---

## 4. Maize contract farming and transboundary smoke

**Status: IMPLEMENTED from 1 Jan 2026; first season just completed; no evaluation.**

- Myanmar supplies **87%** of Thailand's maize imports; Laos 12.6%
  ([Policy Watch](https://policywatch.thaipbs.or.th/article/environment-137)).
  Imports 2.01 Mt in 2567; domestic demand 8.4–9.2 Mt vs production 4.5–4.7 Mt.
- **Modelled attribution** (CMAQ-ISAM), Chantaraprachoom et al., *Atmosphere*
  15(11):1358, Nov 2024: for **Western Northern Thailand, Myanmar contributes 19.7%
  of annual PM2.5 and 31.5% during the March–April peak**.
  [DOI 10.3390/atmos15111358](https://www.mdpi.com/2073-4433/15/11/1358)
- **Burn-free maize import rule**, effective 1 Jan 2569, four Ministry of Commerce
  regulations. **Phase 1 accepts importer self-certification**; documentation
  retained 5 years; annual registration with the Department of Foreign Trade.
  Phase 2 (after the Clean Air Act passes) requires exporting-country certificates
  plus cultivation maps.
  ([AgNavigator, 16 Jan 2026](https://www.agnavigator.com/Article/2026/01/16/thailand-tightens-animal-feed-imports-with-burn-free-maize-regulations/))
- ASEAN import window narrowed to 1 Feb – 30 Jun 2026; WTO quota raised from
  54,700 t to **1,000,000 t/yr**.
- Supporting: **TAS 4402-2025** zero-burning GAP standard for maize;
  **Clear Sky Strategy 2024–2030** (Thailand/Laos/Myanmar, target −50% burnt
  agricultural area); **SEACAI 2025–2028** (GIZ, German BMZ + Swiss SDC)
  ([GIZ](https://www.thai-german-cooperation.info/news/seacai-supports-thailand-myanmar-cooperation-under-clear-sky-strategy-on-zero-burning-agriculture-and-traceability/)).
  CP has a policy of not buying from crop-burning farms
  ([Bangkok Post](https://www.bangkokpost.com/thailand/general/2954190/cp-shuns-crop-burning-farms-to-cut-haze)).

⚠️ **Key weakness:** the year-one requirement is self-declaration, which is not an
enforcement mechanism. Effect **[UNVERIFIED]** — no evaluation exists yet.

---

## 5. Agricultural residue alternatives — the economics do not close

**This is the most useful number set in this document.**

Source: [Policy Watch / Thai PBS](https://policywatch.thaipbs.or.th/article/agriculture-63)

- Processing rice straw costs **500–600 baht/rai**; revenue from selling it is
  **250–300 baht/rai** → a structural loss of ~250–300 baht/rai.
- **Subsidy experiment:** 500 baht/rai (capped at 15 rai) → burning fell **30%**.
- **Behavioural experiments:** cash payments cut burning **7–9%**;
  **lottery-style incentives cut it 12–14%** — lotteries outperformed cash at
  equal cost.
- Rice accounts for 45% of agricultural burning hotspots.

### Biochar
Sampattagul et al., *Land* 15(5):813, 11 May 2026, six northern provinces 2019–2024.
[DOI 10.3390/land15050813](https://www.mdpi.com/2073-445X/15/5/813)
- Annual crop residue 3.0–4.5 Mt; feasibly recoverable 1.5–2.5 Mt/yr.
- Six-year non-CO₂ GHG from burning: 2,599,551 tCO₂-eq.
- Biochar sequestration potential 2.3–3.5 Mt CO₂-eq/yr.
- **Required incentive: 1,500–3,500 baht per tonne.**
- Hotspot–PM2.5 correlation r = 0.30–0.84 (Mae Hong Son strongest).
- Authors' own caveat: composting/biochar are "future-perspective options rather
  than immediately deployable solutions".
- Local practitioner: [Warm Heart Mae Chaem biochar](https://warmheartworld.org/biochar-maechaem/).

### Baling and buy-back
Chamber of Commerce buy-back of baled straw and cane leaf at **1,000 baht/tonne**
([Khaosod](https://www.khaosod.co.th/economics/news_3564618)).

### Macro cost of doing it properly
Akahoshi, Zusman, Hanaoka et al., *Atmosphere* 15(11):1309, 30 Oct 2024.
[DOI 10.3390/atmos15111309](https://www.mdpi.com/2073-4433/15/11/1309)
- Institutional barriers cause ~5 years of implementation delay and roughly
  **twice the PM2.5 emissions** over 10–20 years.
- Cost to overcome barriers ≈ **US$14 M/yr over 10 years**; planned 2026 spending
  ≈ US$21 M; the gap requires a **~70% increase**.

---

## 6. Forest fire management, firebreaks, volunteers

**Status: IMPLEMENTED but structurally underfunded — the best-documented failure mode.**

### FY2569 budget
Source: [Rocket Media Lab, 30 Apr 2026](https://rocketmedialab.co/budget-forest-fire-2569/)
- Total across 3 MoNRE agencies: **604,336,800 baht**
- **Chiang Mai: 73,418,000 baht** (highest of any province)
- Firebreak work nationally: 95,220,100 baht
- Mae Hong Son burned 1,110,340 rai but received less than Chiang Mai —
  **allocation is not risk-weighted**.

### Volunteers — the numbers that carry the argument
Source: [Lanner, 20 Mar 2026](https://www.lannernews.com/20032569-02/)
- **~20,000 volunteers** in Chiang Mai.
- Pay **200–300 baht/day**, below minimum wage. **No accident insurance.**
  One volunteer with 30% burns received **7,000 baht** total.
- Ban Pong Nuea: **70,000 baht/year** to manage ~2,000 rai = **35 baht per rai per year**.
- Chiang Mai PAO agreement, 9 Mar 2569: **10.99 M baht across 24 districts and
  727 villages** (≈15,100 baht/village).
- At least two volunteer deaths on duty in 2026
  ([Thai PBS](https://www.thaipbs.or.th/news/content/504143)).

### Where the fires actually are
20 Apr 2569, of 1,518 northern hotspots: **1,013 in conservation forest, 435 in
national reserved forest, 70 non-forest**
([Thai PBS](https://www.thaipbs.or.th/news/content/504805)).
**Two-thirds of fire activity is on protected land** — agricultural measures alone
cannot solve Chiang Mai's problem.

---

## 7. Exposure reduction — the pillar that demonstrably works

### Legal triggers — the answer to "what triggers action at what level"
Committee on Occupational Disease and Environmental Disease Control, under the
Occupational Disease and Environmental Disease Control Act B.E. 2562, announced
4 Feb 2568 ([PRD Region 1](https://region1.prd.go.th/th/content/category/detail/id/57/iid/361709)):

| Zone | 24-h PM2.5 | Mandated actions |
|---|---|---|
| **Surveillance zone** (เขตเฝ้าระวังฯ) | **> 37.5 and ≤ 75** | Masks to vulnerable groups; prepare dust-free areas in hospitals, schools, community centres |
| **Disease control zone** (เขตควบคุมโรค) | **> 75** | The above, plus **government work-from-home**, ban outdoor activities, legal enforcement, active surveillance, **evacuation shelters** |

Note the coupling: the AQI orange/red boundary sits at exactly 75, so the AQI band
maps directly onto a statutory obligation. **This is the cleanest "what triggers
what" story in Thai air policy, and it is the natural hook for a warning-system
recommendation** — your classifier's threshold is choosing when to invoke a legal
category, not just when to print a warning.

### Clean air rooms (ห้องปลอดฝุ่น) — delivery numbers
| Source | Figures |
|---|---|
| [Bangkokbiznews, 19 Apr 2026](https://www.bangkokbiznews.com/news/news-update/1230235) | **2,275 rooms** across 10 northern provinces; **218,415 users**; 128 online pollution clinics via the หมอพร้อม app; 1.62 M vulnerable people targeted |
| [TheCoverage, Apr 2026](https://www.thecoverage.info/news/content/11006) | 1,359 rooms in health facilities + 993 in schools and elderly care; **2,523 มุ้งสู้ฝุ่น** anti-dust nets; **1,948,741 N95 masks**; >30,000 screened |

COPD admissions fell 54% in 2568 ([Chiangmai Daily](https://www.chiangmaidaily.com/2025/06/30/)).

⚠️ **No formal threshold-based national school-closure protocol exists.**
[UNVERIFIED] What exists is a Ministry of Education instruction to suspend outdoor
activities ([MOE, 23 Jan 2025](https://moe360.blog/2025/01/23/pm25-23012025/)) plus
the >75 trigger above. Closures appear to be ad hoc. **No consolidated register of
2026 Chiang Mai school closures was found** — that absence is itself a finding.

### Disaster declarations, 2026
1 Apr: Chiang Mai municipality declares disaster areas
([Nation Thailand](https://www.nationthailand.com/news/general/40064464)).
4 Apr: emergency assistance zones in **17 districts** across Chiang Mai, Lamphun
and Phayao ([Nation Thailand](https://www.nationthailand.com/news/general/40064673)).
Chiang Mai ranked world's most polluted city on 7 April.

---

## 8. The standard and the AQI bands

- 24-hour standard tightened **50 → 37.5 µg/m³**, effective 1 June 2566 (2023);
  Royal Gazette 3 July 2566 ([PCD](https://www.pcd.go.th/pcd_news/29901/)).
- Annual standard 15 µg/m³.

| AQI | Colour | PM2.5 24-h (µg/m³) | Category |
|---|---|---|---|
| 0–25 | Blue | 0–15.0 | Very good |
| 26–50 | Green | 15.1–25.0 | Good |
| 51–100 | Yellow | 25.1–37.5 | Moderate |
| 101–200 | Orange | 37.6–75.0 | Beginning to affect health |
| 201+ | Red | 75.1+ | Affects health |

Source: [PRD](https://www.prd.go.th/th/content/category/detail/id/9/iid/200584).
These are the values in `config.AQI_BREAKPOINTS`.

---

## 9. The legal lever nobody talks about

**Chiang Mai Administrative Court, black case ส.3/2566, red case ส.1/2567,
judgment 19 January 2024:** citizens won against the Prime Minister and the
National Environment Board for delay in solving Northern PM2.5. The court
**ordered an emergency action plan within 90 days**
([Court notice](https://admincourt.go.th/admincourt/site/08doc_detail.php?ids=25471) ·
[Thai PBS](https://www.thaipbs.or.th/news/content/336116)).

The National Environment Board **appealed**; the Supreme Administrative Court
accepted the appeal in April 2024 ([Prachatai](https://prachatai.com/journal/2024/04/108960)).
Two years on, iLaw reports **"ยังไม่มีใครปฏิบัติตาม"** — nobody has complied
([ilaw.or.th/articles/57570](https://www.ilaw.or.th/articles/57570)).

---

## 10. Data you can actually fetch, ranked by usefulness

| Dataset | URL | What it holds | Question it answers |
|---|---|---|---|
| **ตามรอยเผา (TamRoyPao)** | [tamroypao.hii.or.th](https://tamroypao.hii.or.th) | Sentinel-2 burn scars, **20 m pixels**, 7-day cycles, by crop type; **GeoTIFF + CSV by administrative division** | Burned area by crop × district × week — **directly tests displacement around the ban window** |
| **CMU CCDC DustBoy** | [open-api.cmuccdc.org](https://open-api.cmuccdc.org/?lang=english) | Hundreds of low-cost sensors, hourly, 5-year endpoint | Measured urban–rural gradient (see `RESEARCH_data_sources.md`) |
| **Envilink** | [envilink.go.th/th/dataset/](https://envilink.go.th/th/dataset/) | CKAN catalogue: [Air4Thai hourly](https://envilink.go.th/dataset/air-quality-pm2point5), [**FireD burn permits**](https://envilink.go.th/th/dataset/fired), [burn scar](https://envilink.go.th/th/dataset/burnt-area-burn-scar), [repeat burns](https://envilink.go.th/dataset/loc-amount-repeat-burn) | The FireD dataset is the burn-permit record. ⚠️ Returned 403 to automated fetch — try from a browser |
| **GISTDA fire platform** | [fire.gistda.or.th/fire_v2](https://fire.gistda.or.th/fire_v2/) | Hotspots **classified by land-use type**, fire-risk maps, repeat-burn frequency | Hotspot counts by land use — the §6 breakdown |
| Rocket Media Lab budgets | [FY2569](https://rocketmedialab.co/budget-forest-fire-2569/) | Province-level fire budget | Budget-efficiency regression against burned area |
| EPO1 exceedance announcements | [epo01.pcd.go.th](https://epo01.pcd.go.th/th/news/detail/189494/) | Numbered official announcements | A date-stamped record of when the state formally declared exceedance |

### Three analyses nobody has published

1. **Displacement test.** Using TamRoyPao burn scars + GISTDA hotspots for Chiang
   Mai 2566–2569, test whether burning mass shifts into the fortnight before the
   ban start and after the ban end. The ban start date *changed* between years
   (15 Feb 2566 → 1 Jan 2568), giving quasi-experimental variation.
2. **Budget efficiency.** Regress burned area per province on FY2569 allocation per
   province, controlling for forest area and fire weather. Mae Hong Son vs Chiang
   Mai suggests allocation is not risk-weighted.
3. **Decomposing 2026.** Hotspots +134% while exceedance days −12%. Decompose PM2.5
   into an emission component (hotspots) and a ventilation component (boundary
   layer height, wind, rain) to show why "days over standard" misleads as a KPI.
   **This one you can do with the data already in this repository.**

---

## 11. What could not be verified — state these as gaps

1. No peer-reviewed evaluation of FireD exists.
2. No published study of temporal displacement around Thai ban windows.
3. No formal threshold-based school-closure protocol; no register of 2026 closures.
4. No evaluation of the burn-free maize rule (effective only since 1 Jan 2026).
5. Aggregate FireD burn-permit statistics for 2569 not published anywhere reachable.
6. Conflicting accounts of which provisions the Senate removed on 9 Jul 2026.
7. Chiang Mai 2569 mushroom-substrate and baling programme costs — only 2021 material found.
8. Royal Gazette text of the standard not read directly; figures come from PCD, PRD and news.

---

## 12. Suggested framing for the report

Three tiers the evidence actually supports:

- **Legislated but not in force** — the Clean Air Act. Five years in the making,
  passed separately by both chambers, deadlocked in joint committee on 2 Sep 2026,
  and the *enforcement* provisions (PRTR, citizen suits, financial-institution
  liability, deposit-refund) are precisely the ones under attack.
- **In force but not working alone** — burning bans. Longest ban, worst outcome;
  the province's own admission that blanket bans increase illegal burning; the
  500–600 vs 250–300 baht/rai economics; and two-thirds of hotspots on protected
  forest land that agricultural measures cannot touch.
- **Demonstrably working** — exposure reduction. 2,275 clean air rooms, 1.95 M N95
  masks, statutory triggers at 37.5 and 75, 218,415 room users, COPD admissions
  −54%. It treats the symptom, but it is the only pillar with delivery data.

And the structural fact under all of it: Chiang Mai spends **~35 baht per rai per
year** on community fire management and pays **20,000 uninsured volunteers 200–300
baht/day**, while the academic estimate of adequate implementation is roughly
**70% above current national spending**.
