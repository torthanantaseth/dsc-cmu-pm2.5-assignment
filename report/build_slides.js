// Builds report/PM25_presentation.pptx - 14 slides, 10 minutes, speaker notes = the script.
// Run:  node report/build_slides.js
const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");

const FIG = process.env.FIGDIR || path.join(__dirname, "..", "outputs", "figures");
const OUT = path.join(__dirname, "PM25_presentation.pptx");

// autumn wildfire palette: charred wood, ember, amber, dry leaf
const DARK   = "2A2018";   // charred wood, title and section slides
const LIGHT  = "FFFDFA";   // warm white page
const PAPER  = "F5EDE1";   // dry-paper card fill
const TINT   = "FBE8D8";   // ember-tinted card fill
const FIRE   = "BF5722";   // ember orange, the primary accent
const BLUE   = "8A6A2F";   // dark amber, the second accent
const INK    = "2C231C";   // dark brown-black text
const MUTED  = "7C6B5B";   // dry bark, secondary text
const ONDARK = "F0E5D6";   // warm off-white on charred wood
const FIRE_LT= "E9A56B";   // lit ember, for use on dark
const RULE   = "E3D8C8";   // table rules

const HEAD = "Sarabun";
const BODY = "Sarabun";

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "DS-270702 Homework 4";
pres.title = "PM2.5 in Northern Thailand";

const W = 10, H = 5.625, M = 0.55;
const CW = W - 2 * M;

// ---------------------------------------------------------------- helpers
function darkSlide() {
  const s = pres.addSlide();
  s.background = { color: DARK };
  return s;
}
function lightSlide(kicker, title) {
  const s = pres.addSlide();
  s.background = { color: LIGHT };
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: M, y: 0.3, w: CW, h: 0.22, isTextBox: true,
      fontFace: BODY, fontSize: 10.5, bold: true, color: FIRE, charSpacing: 1.6, margin: 0,
    });
  }
  if (title) {
    s.addText(title, {
      x: M, y: 0.54, w: CW, h: 0.56, isTextBox: true,
      fontFace: HEAD, fontSize: 25, bold: true, color: INK, margin: 0, valign: "top",
    });
  }
  return s;
}
// the one-sentence lead that sits under every title
function lead(s, text, y = 1.16) {
  s.addText(text, {
    x: M, y, w: CW, h: 0.34, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 13.5, bold: true, color: INK, valign: "top",
  });
}
// the house table: first column is the label, rest is the content
function houseTable(s, rows, opts = {}) {
  const {
    x = M, y = 1.6, w = CW, colW, rowH = 0.44,
    header = false, fontSize = 11.5, accentCol = -1, accentRow = -1,
  } = opts;
  s.addTable(
    rows.map((r, ri) => r.map((c, ci) => ({
      text: String(c),
      options: {
        bold: (header && ri === 0) || ci === 0,
        color: (accentCol === ci && (!header || ri > 0)) || accentRow === ri
          ? FIRE : (header && ri === 0 ? MUTED : INK),
        fill: { color: header && ri === 0 ? PAPER : LIGHT },
        align: opts.numeric && ci > 0 ? "right" : "left",
        fontSize, fontFace: BODY, valign: "middle",
      },
    }))),
    {
      x, y, w, colW, rowH,
      border: { type: "solid", color: RULE, pt: 1 },
      margin: [4, 8, 4, 8],
    });
}
function stat(s, x, y, w, value, label, color = FIRE) {
  s.addText(value, {
    x, y, w, h: 0.66, isTextBox: true, margin: 0,
    fontFace: HEAD, fontSize: 32, bold: true, color, align: "left",
  });
  s.addText(label, {
    x, y: y + 0.58, w, h: 0.6, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 11.5, color: MUTED, align: "left",
  });
}
function card(s, x, y, w, h, fill = PAPER) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.08,
  });
}
// the dark strip that carries the one thing to remember from the slide
function punch(s, y, big, small) {
  card(s, M, y, CW, small ? 1.02 : 0.7, DARK);
  s.addText(big, {
    x: M + 0.28, y: y + 0.14, w: CW - 0.56, h: 0.38, isTextBox: true, margin: 0,
    fontFace: HEAD, fontSize: 15, bold: true, color: LIGHT, valign: "middle",
  });
  if (small) {
    s.addText(small, {
      x: M + 0.28, y: y + 0.56, w: CW - 0.56, h: 0.36, isTextBox: true, margin: 0,
      fontFace: BODY, fontSize: 11.5, color: FIRE_LT, valign: "middle",
    });
  }
}
function fig(s, file, o) {
  const p = path.join(FIG, file);
  if (!fs.existsSync(p)) { console.warn("MISSING", file); return; }
  const b = fs.readFileSync(p);
  const iw = b.readUInt32BE(16), ih = b.readUInt32BE(20);
  const ratio = ih / iw;
  let w = o.w, h = w * ratio;
  if (o.maxH && h > o.maxH) { h = o.maxH; w = h / ratio; }
  s.addImage({ path: p, x: o.x + (o.w - w) / 2, y: o.y, w, h });
  return h;
}

// ================================================================ 1 · title
{
  const s = darkSlide();
  s.addText("DS-270702  ·  DATA SCIENCE PROGRAMMING  ·  HOMEWORK 4", {
    x: M, y: 1.5, w: CW, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 11.5, bold: true, color: FIRE_LT, charSpacing: 1.8,
  });
  s.addText("PM2.5 in Northern Thailand", {
    x: M, y: 1.95, w: CW, h: 0.78, isTextBox: true, margin: 0,
    fontFace: HEAD, fontSize: 42, bold: true, color: LIGHT,
  });
  s.addText("From raw data to a recommendation", {
    x: M, y: 2.75, w: CW, h: 0.45, isTextBox: true, margin: 0,
    fontFace: HEAD, fontSize: 22, color: ONDARK, italic: true,
  });
  s.addText("Thana Thanantaseth   ·   690631061   ·   Master of Science in Data Science, Chiang Mai University", {
    x: M, y: 3.62, w: CW, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 12.5, color: "9C8A76",
  });
  s.addNotes(
`[0:00-0:25]
สวัสดีครับ ผมธนา ธนันต์เศรษฐ์ รหัส 690631061 นี่คือการบ้านครั้งที่ 4 วิชา Data Science Programming
หัวข้อ PM2.5 ในภาคเหนือ จากข้อมูลดิบสู่ข้อเสนอเชิงนโยบาย

สิบนาทีนี้จะเล่าสี่เรื่อง คำถามที่ตั้งไว้ โค้ดทำงานยังไง ข้อมูลกลายเป็นอะไร และข้อเสนอสามข้อ

ขอบอกไว้ก่อนเลยว่า โมเดลของผมไม่ได้ชนะ baseline แบบขาดลอย
และนั่นกลับเป็นผลที่มีประโยชน์ที่สุดในงานนี้`);
}

// ================================================================ 2 · the question
{
  const s = lightSlide("The question", "What I set out to answer");
  card(s, M, 1.18, CW, 1.0, TINT);
  s.addText("Can tomorrow's PM2.5 in Chiang Mai be predicted well enough to be worth warning people with, and if it can, what should change as a result?", {
    x: M + 0.28, y: 1.3, w: CW - 0.56, h: 0.78, isTextBox: true, margin: 0,
    fontFace: HEAD, fontSize: 16, bold: true, color: INK, valign: "middle",
  });
  lead(s, "Two reasons this question is worth a term project, and not just curiosity.", 2.4);
  houseTable(s, [
    ["Why ask it", "What is already true today"],
    ["The action is already funded and already mandated",
     "37.5 µg/m³ obliges agencies to hand out masks and open dust-free rooms. A forecast is worth exactly one day of warning on a decision that has already been made"],
    ["The scoreboard may be measuring the weather",
     "2026 had the longest burning ban on record and the worst fire season on record. When effort and the headline number move in opposite directions, the number needs checking"],
  ], { y: 2.84, colW: [3.1, 5.8], rowH: 0.6, header: true, fontSize: 11.5 });
  s.addNotes(
`[0:25-1:05]
คนเชียงใหม่รู้อยู่แล้วว่าเดือนมีนาอากาศแย่ นั่นไม่ใช่การวิเคราะห์
ผมเลยเลือกคำถามที่ถ้าตอบได้แล้วเปลี่ยนอะไรได้จริง

เหตุผลข้อแรก เกณฑ์มันมีอยู่แล้ว และเป็นเชิงตั้งรับ ค่าเฉลี่ยรายวันเกิน 37.5
กฎหมายบังคับให้แจกหน้ากากและเปิดห้องปลอดฝุ่นอยู่แล้ว แต่สั่งการจากค่าที่วัดไปแล้ว
พยากรณ์จึงมีค่าเท่ากับเวลาล่วงหน้าหนึ่งวัน ของสิ่งที่สั่งไว้แล้วและมีงบแล้ว แคบ ชัด ทดสอบได้

ข้อสอง ปี 2569 เชียงใหม่ห้ามเผายาวที่สุดเท่าที่เคยมี แต่เป็นปีที่ไฟหนักที่สุด
ถ้าความพยายามกับตัวเลขที่ใช้วัดผลไปคนละทาง ตัวเลขนั้นก็ควรถูกตรวจสอบ`);
}

// ================================================================ 3 · how the code works
{
  const s = lightSlide("How the code works  ·  1 of 2", "One command runs everything");
  lead(s, "Nothing in this deck was produced by hand. Every number comes back if you run one line.");

  houseTable(s, [
    ["File", "What it does"],
    ["src/config.py", "every path, URL and constant, in one place"],
    ["src/fetch_data.py", "downloads, saves the raw response untouched"],
    ["src/prepare_data.py", "clean, join, build features"],
    ["src/checks.py", "the six checkpoints"],
    ["src/analyse.py", "the figures"],
    ["src/model.py", "baseline first, then models, then scoring"],
    ["run_all.py", "runs all of the above in order"],
  ], { y: 1.62, w: 5.0, colW: [1.85, 3.15], rowH: 0.37, header: true, fontSize: 10.5 });

  card(s, M + 5.3, 1.62, CW - 5.3, 1.25, DARK);
  s.addText("$ python run_all.py", {
    x: M + 5.55, y: 1.8, w: 3.3, h: 0.3, isTextBox: true, margin: 0,
    fontFace: "Courier New", fontSize: 14, bold: true, color: "C9B27A",
  });
  s.addText("Fetch, prepare, check, draw, model.\nEach step wrapped, so one network failure does not stop the rest.", {
    x: M + 5.55, y: 2.14, w: 3.3, h: 0.62, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 10.5, color: ONDARK,
  });
  stat(s, M + 5.55, 3.12, 1.5, "49", "raw API responses,\nsaved before parsing");
  stat(s, M + 7.25, 3.12, 1.7, "128,352", "hourly rows, from\neach of three sources", BLUE);

  s.addNotes(
`[1:05-1:55]
ใบงานกำหนดว่าคลิปต้องครอบคลุมว่าโค้ดทำงานยังไง ผมขอเล่าตรงนี้ก่อนผลลัพธ์

repository เป็นไปตาม layout ที่กำหนด config.py เก็บ path URL และค่าคงที่ไว้ที่เดียว
ไม่มี hard-code กระจายที่อื่น fetch_data เซฟ raw response ทุกไฟล์ก่อนที่อะไรจะไป parse
prepare_data ทำความสะอาด join สร้าง feature checks.py คือ checkpoint ทั้งหกข้อ
analyse.py วาดกราฟ model.py ทำ baseline กับโมเดล

ผมเพิ่ม run_all.py ให้รันทั้งหมดตามลำดับ แต่ละขั้นครอบด้วย try except
ถ้าเน็ตพังจุดเดียว ที่เหลือยังรันต่อ แล้วสรุปท้ายบอกว่าขั้นไหนพัง

ผลคือได้ raw 49 ไฟล์ และข้อมูลรายชั่วโมง 128,352 แถว จากทั้งสามแหล่ง`);
}

// ================================================================ 4 · pipeline decisions
{
  const s = lightSlide("How the code works  ·  2 of 2", "Four places the code would run fine and answer wrong");
  lead(s, "Each row is a trap that raises no error. The right column is what the code does instead.");
  houseTable(s, [
    ["The trap", "What the code does"],
    ["A day with six hours of data averages just as happily as a day with twenty-four",
     "Keep a day only if 18 of 24 hours are present. Otherwise drop it, never average it"],
    ["The average of 350° and 10° of wind direction is 180°, the exact opposite direction",
     "Average directions as unit vectors, not as numbers"],
    ["Air4Thai writes a missing reading as the text -1, which averages like a real value",
     "Mask anything at or below -1 before any arithmetic touches it"],
    ["A feature nobody could know yesterday makes the score look excellent",
     "An allow-list guard stops the run with an error. It covers the weather columns. The forecast columns are a gap I state in the limitations"],
  ], { y: 1.68, colW: [4.6, 4.3], rowH: 0.72, header: true, fontSize: 11 });
  s.addNotes(
`[1:55-2:40]
สี่จุดในไปป์ไลน์ที่โค้ดจะรันผ่านสวยงาม แต่ให้คำตอบผิด และไม่มี error เตือนเลย

หนึ่ง วันที่มีข้อมูลแค่หกชั่วโมง กับวันที่มีครบยี่สิบสี่ชั่วโมง ถ้าเอามาเฉลี่ยเหมือนกัน
ค่าเฉลี่ยสองตัวนั้นไม่ใช่ของชนิดเดียวกัน ผมเลยตั้งกฎว่าวันไหนไม่ครบสิบแปดชั่วโมง ตัดทิ้ง ไม่เฉลี่ย

สอง ทิศลม ลองนึกว่าวัดได้สองชั่วโมง ชั่วโมงแรก 350 องศา ชั่วโมงสอง 10 องศา
ทั้งสองครั้งลมมาจากทิศเหนือแทบจะเป๊ะ แต่ถ้าเอามาบวกหารสอง จะได้ 180 องศา ซึ่งคือทิศใต้
ตรงข้ามกับความจริงพอดี เพราะองศาเป็นวงกลม ไม่ใช่เส้นตรง ผมเลยแปลงเป็นเวกเตอร์ก่อนแล้วค่อยเฉลี่ย

สาม Air4Thai เขียนค่าที่หายไปเป็นข้อความว่า ลบหนึ่ง ไม่ใช่ค่าว่าง
สมมติวันหนึ่งวัดได้ห้าค่า สี่สิบสอง สามสิบแปด ลบหนึ่ง สี่สิบห้า ลบหนึ่ง
ถ้าไม่กรอง เฉลี่ยได้ยี่สิบสี่จุดหก แต่ความจริงคือสี่สิบเอ็ดจุดเจ็ด
ยี่สิบสี่จุดหกดูเป็นตัวเลขปกติมาก และมันจะทำให้วันนั้นถูกนับว่าไม่เกินมาตรฐาน ทั้งที่เกิน

สี่ เรื่อง data leakage ผมใส่ guard ที่หยุดโปรแกรมทันที
ถ้ามีคอลัมน์ที่รู้ไม่ได้ ณ เวลาทำนายหลุดเข้าโมเดล เขียนเป็น allow-list
คือคอลัมน์สภาพอากาศต้องลงท้ายด้วย lag หรือ roll เท่านั้น อย่างอื่นไม่ผ่าน

ขอพูดตรงๆ ว่า guard นี้ไม่เคยทำงานเลยในรอบสุดท้าย และยังไม่ครอบคลุมคอลัมน์ fc_
ซึ่งเป็นค่าพยากรณ์ที่อาจไม่มีจริง ณ เวลานั้น ผมเขียนไว้ในตารางข้อจำกัดของรายงานแล้ว
วิธีแก้คือใช้ Previous Runs API ของ Open-Meteo ซึ่งผมไม่ได้ทำในรอบนี้`);
}

// ================================================================ 5 · C3 the data is a model
{
  const s = lightSlide("Data quality  ·  checkpoint C3", "The data is not measured. It is a model.");
  lead(s, "38 columns are exactly 0.0000% missing across three and a half years. No instrument is that perfect.");
  card(s, M, 1.62, 3.0, 1.5, TINT);
  s.addText("0.0000%", {
    x: M + 0.24, y: 1.76, w: 2.6, h: 0.7, isTextBox: true, margin: 0,
    fontFace: HEAD, fontSize: 38, bold: true, color: FIRE,
  });
  s.addText("missing, 38 columns,\n3.5 years of hourly data", {
    x: M + 0.24, y: 2.46, w: 2.6, h: 0.56, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 11, color: INK,
  });
  s.addText([
    { text: "Real monitors lose data to calibration, power cuts and maintenance. Air4Thai writes those gaps as -1.", options: { breakLine: true } },
    { text: " " , options: { breakLine: true, fontSize: 6 } },
    { text: "A complete series is the signature of model output. The source is Copernicus CAMS, which produces a value for every cell and every hour whether or not anything was measured there.", options: {} },
  ], {
    x: M + 3.3, y: 1.66, w: CW - 3.3, h: 1.42, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 12, color: INK, valign: "top",
  });
  lead(s, "Three things follow from that, and they run through everything after this slide.", 3.28);
  houseTable(s, [
    ["Errors are model bias, not random noise", "So they do not average away by collecting more days"],
    ["A model trained on this learns to predict CAMS", "So it must be retrained on measured data before anyone relies on it"],
    ["Every exceedance count here is CAMS's count", "So the next checkpoint asks how far off CAMS is"],
  ], { y: 3.68, colW: [3.9, 5.0], rowH: 0.44, fontSize: 11 });
  s.addNotes(
`[2:40-3:20]
มาที่ผลลัพธ์ เริ่มจาก checkpoint เพราะมันเปลี่ยนสิ่งที่ส่วนที่เหลือเคลมได้

C3 สั่งให้รายงานเปอร์เซ็นต์ข้อมูลที่หายไปของทุกคอลัมน์
ของผมมีสามสิบแปดคอลัมน์ที่หายไปศูนย์จุดศูนย์ศูนย์ศูนย์ศูนย์เปอร์เซ็นต์พอดี ตลอดสามปีครึ่ง

ตรงนี้แหละที่ผมไม่หยุด เพราะข้อมูลที่สมบูรณ์เกินไปคือสัญญาณเตือน ไม่ใช่ข่าวดี
เครื่องวัดจริงมันหยุดส่งข้อมูลเสมอ ตอนสอบเทียบ ตอนไฟดับ ตอนสัญญาณขาด ตอนซ่อมบำรุง
Air4Thai ซึ่งเป็นเครื่องวัดจริง ก็เข้ารหัสช่องว่างพวกนั้นไว้เป็นลบหนึ่ง

ถ้าเครื่องวัดจริงยังมีรู แล้วข้อมูลที่ไม่มีรูเลยมาจากไหน
คำตอบคือมันไม่ใช่เครื่องวัด แหล่งจริงคือ Copernicus CAMS
ซึ่งเป็นแบบจำลองบรรยากาศระดับโลก ที่ผลิตตัวเลขให้ทุกกริดทุกชั่วโมง
ไม่ว่าตรงนั้นจะเคยมีใครไปวัดหรือไม่ แบบจำลองไม่มีวันไฟดับ

สามอย่างที่ตามมา หนึ่ง ความคลาดเคลื่อนเป็นอคติเชิงระบบ ไม่ใช่ noise เก็บข้อมูลเพิ่มไม่ช่วย
สอง โมเดลที่เทรนด้วยข้อมูลนี้ เก่งเรื่องทำนาย CAMS ไม่ใช่ทำนายอากาศจริง
สาม ทุกตัวเลขวันเกินมาตรฐานในงานนี้ คือตัวเลขของ CAMS
ซึ่งบังคับให้คำถามถัดไปคือ แล้ว CAMS ผิดไปเท่าไหร่`);
}

// ================================================================ 6 · C6 ground truth
{
  const s = lightSlide("Data quality  ·  checkpoint C6", "So I measured how wrong it is");
  lead(s, "70 paired readings against real Air4Thai instruments. CAMS reads low at every single station.");
  stat(s, M, 1.66, 2.5, "-5.38", "µg/m³ average gap,\nCAMS minus instrument");
  stat(s, M + 3.0, 1.66, 2.5, "14 / 14", "stations where CAMS read\nlow, with no exception", BLUE);
  stat(s, M + 6.1, 1.66, 2.8, "70", "paired readings, collected\nover several runs", BLUE);
  houseTable(s, [
    ["What it means for my own numbers",
     "Days CAMS reports at 33 to 37 may really have gone over 37.5. My exceedance counts are more likely under-counts than over-counts"],
    ["Limit I state myself, 1",
     "Measured at 6.9 to 18.4 µg/m³ in the rainy season. Whether the same gap holds up near 37.5 is not established"],
    ["Limit I state myself, 2",
     "The gap is uneven, -0.7 in Chiang Mai city and -9.1 at Mae Moh, so the province ranking may partly be uneven model error"],
  ], { y: 3.1, colW: [2.7, 6.2], rowH: 0.6, fontSize: 11 });
  s.addNotes(
`[3:20-4:00]
C6 ให้เทียบกับ Air4Thai ซึ่งเป็นเครื่องวัดจริง
Air4Thai ไม่มี endpoint ย้อนหลัง ยิงได้แค่ค่าปัจจุบัน ผมเลยรันหลายวันแล้วเก็บสะสม ได้เจ็ดสิบคู่

ผลคือ CAMS อ่านต่ำกว่าเครื่องวัดเฉลี่ยห้าจุดสามแปด และต่ำทั้งสิบสี่จากสิบสี่สถานี
ไม่ใช่ส่วนใหญ่ แต่ทั้งหมด การไปทางเดียวกันหมดแบบนี้คืออคติเชิงระบบ ไม่ใช่ความบังเอิญ

ที่สำคัญคือทิศทางของมันสวนทางกับตัวเลขของผมเอง
สมมติวันหนึ่ง CAMS รายงานสามสิบห้าจุดสอง ผมนับเป็นวันปกติเพราะไม่ถึงสามสิบเจ็ดจุดห้า
แต่ถ้าบวกกลับห้าจุดสามแปด ค่าจริงน่าจะราวสี่สิบจุดหก ซึ่งเกินมาตรฐาน
แปลว่าจำนวนวันเกินมาตรฐานทุกตัวในรายงานผม น่าจะนับขาด ไม่ใช่นับเกิน

ข้อจำกัดสองข้อที่ผมขอพูดเอง
ข้อแรก เจ็ดสิบคู่นั้นเก็บในหน้าฝนทั้งหมด ค่าอยู่แค่หกจุดเก้าถึงสิบแปดจุดสี่
ผมวัด bias ในอากาศสะอาด แล้วเอาไปพูดถึงเส้นสามสิบเจ็ดจุดห้าซึ่งอยู่นอกช่วงที่วัด
มันอาจจะเท่าเดิม อาจจะมากกว่า ผมพิสูจน์ไม่ได้

ข้อสอง bias ไม่เท่ากันทุกที่ ที่ยุพราชวิทยาลัยในเมืองเชียงใหม่ต่ำแค่ศูนย์จุดเจ็ด
แต่ที่แม่เมาะลำปางต่ำถึงเก้าจุดหนึ่ง เพราะแม่เมาะมีโรงไฟฟ้าถ่านหิน
ซึ่งเป็นแหล่งกำเนิดเฉพาะจุดที่กริดสี่สิบห้ากิโลเมตรมองไม่เห็น
แปลว่าการจัดอันดับระหว่างจังหวัดในงานผม อาจปนความผิดพลาดของแบบจำลองที่ไม่เท่ากันอยู่`);
}

// ================================================================ 7 · C4 the trap
{
  const s = lightSlide("Data quality  ·  checkpoint C4", "The check that passed, and should not have");
  card(s, M, 1.18, CW, 1.3, DARK);
  s.addText("Two points 12 km apart inside Chiang Mai returned exactly the same numbers for all 168 hours", {
    x: M + 0.3, y: 1.32, w: CW - 0.6, h: 0.36, isTextBox: true, margin: 0,
    fontFace: HEAD, fontSize: 15.5, bold: true, color: LIGHT,
  });
  s.addText("Mueang       18.7883, 98.9853   →   grid 18.800 / 99.000\nHang Dong    18.6883, 98.9214   →   grid 18.700 / 98.900", {
    x: M + 0.3, y: 1.74, w: 5.3, h: 0.58, isTextBox: true, margin: 0,
    fontFace: "Courier New", fontSize: 10, color: ONDARK,
  });
  s.addText("largest difference over\nthe week:   0.0 µg/m³", {
    x: M + 5.9, y: 1.76, w: 2.8, h: 0.56, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 11.5, bold: true, color: FIRE_LT,
  });
  houseTable(s, [
    ["My first version passed", "It compared the coordinates the API reported. Six requests, six different coordinates, so it said PASS"],
    ["What actually causes it", "CAMS resolves about 45 km, so two nearby requests are read from the same square. The reported coordinate is cosmetic"],
    ["How widespread", "1 of 15 pairs inside the province identical, 14 different. Only comparing the values finds it"],
    ["What I did about it", "Dropped district-level analysis. Compare the four provincial capitals, checked to be genuinely different"],
  ], { y: 2.66, colW: [2.4, 6.5], rowH: 0.58, fontSize: 11 });
  s.addNotes(
`[4:00-4:55]  สไลด์สำคัญ อย่ารีบ
นี่คือ C4 สิ่งที่ผมภูมิใจที่สุด เพราะเกือบพลาดไป

C4 บอกว่าถ้าจะเทียบสองพื้นที่ ต้องพิสูจน์ก่อนว่ามันคืนข้อมูลต่างกันจริง
เวอร์ชันแรกของผมเทียบพิกัดที่ API คืนกลับมา หกจุด หกพิกัดต่างกัน มันผ่าน

แล้วผมมาดูตัวเลขจริง เมืองกับหางดง ห่างกันสิบสองกิโลเมตร
คืนค่า PM2.5 เหมือนกันทุกตัวเลข ตลอดหนึ่งร้อยหกสิบแปดชั่วโมง ผลต่างสูงสุดเป็นศูนย์
ทั้งที่ API รายงานพิกัดคนละค่าให้สองจุดนั้น

เหตุผลคือ Open-Meteo รายงานบนกริดศูนย์จุดหนึ่งองศา แต่ CAMS ละเอียดแค่ศูนย์จุดสี่องศา
ราวสี่สิบห้ากิโลเมตร สองคำขอจึงมาจากกริดหยาบเดียวกันได้ แล้วยังรายงานพิกัดต่างกัน
มีแต่การเทียบค่าเท่านั้นที่จับได้

ผมเลยเขียน check ใหม่ให้เทียบชุดข้อมูลจริง ตัดการวิเคราะห์ระดับอำเภอทิ้ง
แล้วจำกัดการเทียบเชิงพื้นที่ไว้ที่สี่จังหวัดที่ตรวจแล้วว่าต่างกันจริง`);
}

// ================================================================ 8 · why a model
{
  const s = lightSlide("Machine learning  ·  1 of 3", "Why build a model at all?");
  lead(s, "Yesterday alone already explains about 80% of today. So a model has to earn its place somewhere specific.");
  fig(s, "fig06_persistence_limits.png", { x: M, y: 1.58, w: CW, maxH: 2.5 });
  houseTable(s, [
    ["What kind of day", "Share of days", "How far off \"tomorrow = today\" is"],
    ["Days the air stays on the same side of 37.5", "94.5%", "3.59 µg/m³"],
    ["Days the air crosses 37.5", "5.5%", "10.60 µg/m³, three times worse"],
  ], { y: 4.2, colW: [4.5, 1.6, 2.8], rowH: 0.34, header: true, fontSize: 11, accentRow: 2 });
  s.addNotes(
`[4:55-5:35]
ทีนี้มาที่โมเดล คำถามแรกคือ ต้องมีโมเดลไหม

เพราะมีวิธีเดาที่ง่ายที่สุดอยู่แล้ว คือทายว่าพรุ่งนี้เท่ากับวันนี้ ไม่ต้องเทรน ไม่ต้องใช้อะไรเลย
และมันแข็งแรงมาก เพราะค่าวันนี้กับค่าเมื่อวานสัมพันธ์กันที่ศูนย์จุดแปดเก้าสี่
ยกกำลังสองได้ศูนย์จุดแปด แปลว่าเมื่อวานอย่างเดียวอธิบายวันนี้ได้แปดสิบเปอร์เซ็นต์
เหลือช่องให้โมเดลแค่ยี่สิบเปอร์เซ็นต์ นั่นคือแผงซ้าย

แต่พอผมถามต่อว่า มันพลาดเท่ากันทุกวันจริงหรือ คำตอบคือไม่
ผมเลยแบ่งวันเป็นสองกอง กองแรกคือวันที่เมื่อวานกับวันนี้อยู่ฝั่งเดียวกันของเส้นสามสิบเจ็ดจุดห้า
กองที่สองคือวันที่ข้ามเส้น

กองแรกมีเก้าสิบสี่จุดห้าเปอร์เซ็นต์ พลาดแค่สามจุดห้าเก้า
กองที่สองมีห้าจุดห้าเปอร์เซ็นต์ พลาดถึงสิบจุดหกศูนย์ แย่กว่าเกือบสามเท่า
ค่าเฉลี่ยรวมออกมาสามจุดเก้าแปด เพราะวันเงียบครองสัดส่วนเกือบทั้งหมด มันกลบส่วนที่สำคัญที่สุดไว้

และความต่างนี้ไม่ใช่แค่ตัวเลข พลาดสามจุดห้าเก้าคือทายสี่สิบสี่แล้วจริงสี่สิบเจ็ด คำตอบยังเกินมาตรฐานเหมือนเดิม
แต่พลาดสิบจุดหกคือทายสามสิบเอ็ดแล้วจริงห้าสิบสอง คำตอบพลิกจากปลอดภัยเป็นอันตราย
อันแรกทำให้ตัวเลขเพี้ยน อันหลังทำให้การตัดสินใจเพี้ยน

และวันที่ข้ามเส้นพวกนั้น คือวันเดียวที่ระบบเตือนภัยมีอยู่เพื่อสิ่งนั้น ผมจึงวัดโมเดลตรงนั้น`);
}

// ================================================================ 9 · model vs baseline
{
  const s = lightSlide("Machine learning  ·  2 of 3", "My model loses on average, and that is the finding");
  lead(s, "The numbers are the average size of the miss, in µg/m³. Lower is better. Read the last column.");
  houseTable(s, [
    ["", "Ordinary days", "Burning season", "Days the air changes"],
    ["Guessing \"tomorrow = today\"", "4.118", "6.846", "14.079"],
    ["Ridge regression", "4.303", "6.529", "11.791"],
    ["Gradient boosting", "3.946", "6.424", "12.098"],
  ], { y: 1.68, colW: [3.3, 1.7, 1.9, 2.0], rowH: 0.44, header: true, fontSize: 12.5, numeric: true, accentCol: 3 });
  houseTable(s, [
    ["On ordinary days it barely wins", "3.95 against 3.98, which is smaller than the 5.38 gap the data itself carries. Not worth claiming"],
    ["On the days that matter it wins clearly", "14.1 down to 11.8, a 16% cut, and both models manage it"],
  ], { y: 3.46, colW: [3.3, 5.6], rowH: 0.40, fontSize: 11 });
  punch(s, 4.5,
    "The useful output is a warning that tomorrow changes, not tomorrow's number.",
    "That is what the next slide predicts, and what the first recommendation asks the province to publish.");
  s.addNotes(
`[5:35-6:20]
การเปรียบเทียบ บนชุดทดสอบสี่ร้อยห้าสิบสี่วันที่โมเดลไม่เคยเห็น แบ่งด้วยเวลาไม่ใช่สุ่ม
และในโค้ด baseline ถูกให้คะแนนก่อนบรรทัดที่เทรนโมเดล เพื่อไม่ให้ผมมีโอกาสเลือก baseline ที่ทำให้ตัวเองชนะ

คอลัมน์แรก gradient boosting ได้สามจุดเก้าห้า เทียบกับ baseline สี่จุดหนึ่งสอง ชนะสี่เปอร์เซ็นต์
ฟังดูดี แต่ผมไม่เอามาเคลม เพราะชนะได้แค่ศูนย์จุดหนึ่งเจ็ด
ในขณะที่ผมวัด bias ของข้อมูลตัวเองไว้ที่ห้าจุดสามแปด ชัยชนะเล็กกว่าความผิดพลาดของข้อมูลสามสิบเท่า
มันอยู่ในระดับ noise

คอลัมน์สุดท้าย วันที่อากาศเปลี่ยน baseline พลาดสิบสี่จุดหนึ่ง ridge พลาดสิบเอ็ดจุดแปด
ลดลงสิบหกเปอร์เซ็นต์ ชนะสองจุดสองเก้า ซึ่งอยู่ในระดับเดียวกับ bias แล้ว พอมีน้ำหนัก
และที่สำคัญคือทั้งสองโมเดลชนะในคอลัมน์นี้ ไม่ใช่ตัวเดียว
ถ้าตัวเดียวอาจเป็นความบังเอิญ แต่สองวิธีที่ทำงานคนละแบบชนะเหมือนกัน แปลว่ามีอะไรจริงอยู่

สังเกตด้วยว่า ridge แพ้ baseline ในคอลัมน์แรก แต่ชนะขาดที่สุดในคอลัมน์สุดท้าย
ถ้าดูแค่ค่าเฉลี่ยรวม ridge คือตัวที่ควรทิ้ง แต่พอดูเกณฑ์ที่ตรงกับการใช้งานจริง มันคือตัวที่ดีที่สุด

สรุปคือ persistence ไม่มีใครชนะได้บนวันเงียบๆ ที่ครองค่าเฉลี่ยอยู่
โมเดลผมพิสูจน์ตัวเองได้เฉพาะบนวันที่ข้ามเกณฑ์ นั่นแคบกว่าคำว่าโมเดลผมดีกว่า
และเป็นสิ่งที่หลักฐานรองรับ

และนี่คือจุดที่เปลี่ยนทิศทางของงาน ถ้าโมเดลมีค่าเฉพาะวันที่อากาศเปลี่ยน
สิ่งที่ควรเผยแพร่ก็ไม่ใช่ตัวเลขของพรุ่งนี้ เพราะตัวเลขนั้นเดาเองก็เกือบได้แล้ว
สิ่งที่ควรเผยแพร่คือคำเตือนว่าพรุ่งนี้กำลังจะเปลี่ยน
ซึ่งเป็นคนละคำถาม และเป็นคำถามที่สไลด์ถัดไปตอบ รวมถึงเป็นสิ่งที่ข้อเสนอข้อแรกขอให้จังหวัดทำ`);
}

// ================================================================ 10 · the warning system
{
  const s = lightSlide("Machine learning  ·  3 of 3", "Where to draw the line is a policy choice, not a default");
  lead(s, "The model returns a probability. Someone has to decide how sure is sure enough to warn.");
  fig(s, "fig08_classification_threshold.png", { x: M, y: 1.48, w: CW, maxH: 1.76 });
  houseTable(s, [
    ["Approach", "Dangerous days missed", "False alarms", "Caught"],
    ["Say \"safe\" every day", "45", "0", "0%"],
    ["Guessing \"tomorrow = today\"", "8", "8", "82%"],
    ["Where I set the line", "4", "26", "91%"],
    ["Tuned to never miss one", "0", "99", "100%"],
  ], { y: 3.34, colW: [3.4, 2.2, 1.6, 1.7], rowH: 0.26, header: true, fontSize: 10.5, numeric: true, accentRow: 3 });
  s.addText("A false alarm costs one day of opening a room and handing out masks. A miss costs a day of people breathing it unprotected. Catching all 45 would mean warning every four and a half days, which is how a warning system teaches people to ignore it.", {
    x: M, y: 4.94, w: CW, h: 0.5, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 10, italic: true, color: MUTED,
  });
  s.addNotes(
`[6:20-7:10]
กรอบที่สองคือ classification พรุ่งนี้จะเกิน 37.5 ไหม
วันที่เกินมีราวสิบเปอร์เซ็นต์ accuracy จึงใช้ไม่ได้ ทายว่าปลอดภัยทุกวันก็ได้เก้าสิบแล้ว

โมเดลไม่ได้ตอบใช่หรือไม่ใช่ มันตอบเป็นความน่าจะเป็น แล้วต้องมีคนตัดสินว่ามั่นใจเท่าไหร่ถึงจะเตือน
ค่า default คือศูนย์จุดห้า ผมไม่ใช้ ผมตั้งเป้าเชิงนโยบายก่อนว่าต้องจับวันอันตรายให้ได้เก้าสิบเปอร์เซ็นต์
แล้วเลือกเส้นที่สูงที่สุดที่ยังผ่านเกณฑ์นั้น ได้ศูนย์จุดสามสี่สี่

ความผิดพลาดสองแบบไม่สมมาตร เตือนผิดหนึ่งครั้งเสียแค่เปิดห้องหนึ่งวันกับแจกหน้ากาก
ย้อนกลับได้ และอยู่ในงบแล้ว แต่การพลาดหนึ่งวันคือคนกลุ่มเปราะบางหนึ่งจุดหกล้านคนไม่ได้รับการป้องกัน

โมเดลพลาดสี่วัน เตือนผิดยี่สิบหกครั้งใน 454 วัน baseline พลาดแปด เตือนผิดแปด
ลดการพลาดลงครึ่งหนึ่ง แลกกับเตือนผิดราวสามเท่า

และผมจงใจไม่ไล่ล่าให้พลาดเป็นศูนย์ เพราะจับให้ครบต้องยอมเตือนผิดเก้าสิบเก้าครั้ง
คือเตือนทุกสี่วันครึ่ง ซึ่งสอนให้คนเลิกฟัง`);
}

// ================================================================ 11 · the finding
{
  const s = lightSlide("The finding", "A bad-day count is not a burning score");
  lead(s, "Both are true at once: day to day fires and smoke track closely, year to year they do not.");
  fig(s, "fig10_emission_vs_outcome.png", { x: M, y: 1.48, w: CW, maxH: 2.02 });
  houseTable(s, [
    ["Year", "Fire detections within 100 km", "Days over the standard", ""],
    ["2023", "19,190", "40", ""],
    ["2024", "21,312", "11", "most fires, fewest bad days"],
    ["2025", "9,329", "29", "fewest fires, nearly 3x 2024's bad days"],
    ["2026", "19,491", "45", "241 days only"],
  ], { y: 3.6, colW: [0.9, 2.6, 2.0, 3.4], rowH: 0.26, header: true, fontSize: 10.5, accentCol: 3 });
  s.addNotes(
`[7:10-8:00]  สไลด์สำคัญ
ผลที่ผมไม่ได้คาดไว้ และข้อเสนอของผมยืนอยู่บนมัน

ผมเพิ่มจุดความร้อนจากดาวเทียม NASA เข้าไป คาดว่าจะอธิบายได้ทั้งรายวันและรายปี

รายวันอธิบายได้จริง แผงซ้าย ความสัมพันธ์ศูนย์จุดหกเก้า แรงกว่าตัวแปรสภาพอากาศทุกตัวที่ทดสอบ

แต่รายปีความสัมพันธ์หายไป ดูตาราง ปี 2567 มีจุดไฟมากที่สุด สองหมื่นหนึ่งพันจุด
แต่มีวันเกินมาตรฐานน้อยที่สุด แค่สิบเอ็ดวัน
ปี 2568 มีไฟไม่ถึงครึ่ง แต่มีวันแย่มากกว่าเกือบสามเท่า

สองอย่างนี้ไม่ขัดกัน รายวันถามว่าควันมาจากไหน รายปีถามว่ามีกี่วันที่สะสมจนข้ามเส้น
ซึ่งขึ้นกับจังหวะ ไม่ใช่ปริมาณรวม

สรุปคือ จำนวนวันเกินมาตรฐานรายปี ไม่ได้วัดว่าปีนั้นเผามากแค่ไหนเป็นหลัก
ผมบอกไม่ได้ว่ามันวัดอะไร ตัวเลือกที่ชัดที่สุดคือการระบายอากาศ แต่ข้อมูลของผมเองไม่รองรับ`);
}

// ================================================================ 12 · recommendations
{
  const s = lightSlide("Recommendations", "Three, each addressed to a body that can act");
  lead(s, "Same four boxes every time: who does it, what they do, what it should produce, and what limits it.");
  houseTable(s, [
    ["PIC", "What to do", "Expected outcome", "Challenge"],
    ["Health Center 1\nChiang Mai",
     "Publish each evening the probability that tomorrow goes over 37.5, with the miss rate",
     "Days arriving unwarned fall from 8 to 4 in 454",
     "Predicts CAMS, not the air. Retrain on station data first"],
    ["Provincial PM2.5\nworking group",
     "Report a burning number and an exposure number side by side, not exceedance days alone",
     "A bad-burning year can be told from a bad-weather year",
     "Does not say what the yearly variation does track"],
    ["Disaster Prevention\nand Mitigation",
     "Add an air-pollution category to the national relief schedule, which has none",
     "Relief triggers on exposure, not on catastrophe",
     "Only the exposure counts come from this work"],
  ], { y: 1.6, colW: [1.7, 3.0, 2.2, 2.0], rowH: [0.3, 1.02, 1.02, 1.02], header: true, fontSize: 10, accentCol: 2 });
  s.addText("Written the way I write a roadmap: no recommendation without a named owner, and none without the thing that limits it.", {
    x: M, y: 4.92, w: CW, h: 0.4, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 10.5, italic: true, color: MUTED,
  });
  s.addNotes(
`[8:00-8:50]
ข้อเสนอสามข้อ ผมจัดเป็นสี่ช่องเหมือนกันทุกข้อ คือ ใครทำ ทำอะไร คาดว่าจะได้อะไร และติดอะไร
เป็นรูปแบบเดียวกับที่ผมใช้เขียน roadmap ในงานประจำ ผมไม่เสนออะไรที่ไม่มีเจ้าของ
และไม่เสนออะไรโดยไม่บอกข้อจำกัดของมันไปพร้อมกัน

ข้อแรก เสนอต่อศูนย์อนามัยที่ 1 เชียงใหม่ ซึ่งดูแลห้องปลอดฝุ่นสองพันสองร้อยเจ็ดสิบห้าห้อง
ให้เผยแพร่ความน่าจะเป็นที่พรุ่งนี้จะเกินมาตรฐาน ควบคู่กับค่าปัจจุบันที่เผยแพร่อยู่แล้ว
แล้วเผยแพร่อัตราการพลาดด้วย ระบบที่ปิดบังความผิดพลาดของตัวเอง
คือระบบที่ขอความไว้วางใจที่ยังไม่ได้พิสูจน์

ข้อสอง เสนอต่อคณะทำงาน PM2.5 จังหวัด ให้รายงานตัวเลขการเผาคู่กับตัวเลขวันเกินมาตรฐาน
เพราะจังหวัดที่ถูกวัดด้วยวันเกินมาตรฐานอย่างเดียว กำลังถูกวัดด้วยดินฟ้าอากาศเป็นส่วนใหญ่
ทั้งในทางบวกและทางลบ

ข้อสาม เสนอต่อ ปภ. บัญชีเงินเยียวยาภัยพิบัติมีหมวดบ้านพัง มีหมวดเครื่องมือทำกินเสียหาย
แต่ไม่มีหมวดสำหรับครัวเรือนที่ทำงานไม่ได้หกสัปดาห์ และเกณฑ์ปัจจุบันคือรอให้เกิน 125 ครบห้าวันก่อน
คือจ่ายหลังจากเกิดหายนะแล้ว ไม่ใช่จ่ายตามการรับสัมผัส

เงื่อนไขที่ใช้กับทั้งสามข้อ ระบบที่ผมสาธิตทำนายค่าของแบบจำลอง ไม่ใช่ของอากาศจริง
ต้องเทรนใหม่ด้วยข้อมูลสถานีตรวจวัดก่อนเปิดใช้จริง`);
}

// ================================================================ 13 · limits
{
  const s = lightSlide("Honesty", "What this analysis does not support");
  lead(s, "I would rather say these myself than be asked.");
  houseTable(s, [
    ["This does not support", "Why"],
    ["The true number of exceedance days", "Every count is CAMS's, and CAMS reads low"],
    ["Any trend", "Four years, one of them incomplete"],
    ["Seasonal forecasting", "Four burning seasons cannot validate a model of next year"],
    ["City versus countryside in Chiang Mai", "The grid is 45 km, wider than the difference"],
    ["Causation", "Fires near a place do not prove those fires made its smoke"],
    ["Whether the burning ban worked", "That needs enforcement records and a comparison group"],
  ], { y: 1.66, colW: [3.7, 5.2], rowH: 0.38, header: true, fontSize: 11.5 });
  card(s, M, 4.42, CW, 0.72, TINT);
  s.addText("The one thing that would fix the most: five years of MEASURED station data from the CMU DustBoy network. It removes the model-versus-instrument problem and the resolution problem at the same time.", {
    x: M + 0.28, y: 4.52, w: CW - 0.56, h: 0.54, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 11.5, bold: true, color: INK, valign: "middle",
  });
  s.addNotes(
`[8:50-9:20]
ขอพูดสั้นๆ ถึงสิ่งที่การวิเคราะห์นี้ไม่รองรับ ผมอยากพูดเองมากกว่าโดนถาม

ตัวเลขทั้งหมดเป็นของแบบจำลอง สี่ปีไม่ใช่แนวโน้ม สี่ฤดูเผาไม่พอจะ validate การพยากรณ์ฤดูกาล
กริดหยาบเกินกว่าจะเทียบเมืองกับชนบท จำนวนไฟใกล้พื้นที่หนึ่งไม่ได้พิสูจน์ว่าไฟนั้นทำให้เกิดฝุ่นตรงนั้น
และผมบอกไม่ได้ว่ามาตรการห้ามเผาได้ผลหรือไม่

สิ่งเดียวที่แก้ได้มากที่สุดคือ ข้อมูลสถานีตรวจวัดจริงย้อนหลังห้าปี จากเครือข่าย DustBoy ของ มช.`);
}

// ================================================================ 14 · close
{
  const s = darkSlide();
  s.addText("What I would want you to remember", {
    x: M, y: 0.85, w: CW, h: 0.45, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 12.5, bold: true, color: FIRE_LT, charSpacing: 1.4,
  });
  const pts = [
    ["The data turned out to be a model, so I measured how wrong it was", "-5.38, low at 14 of 14 stations"],
    ["Two points 12 km apart were the same data", "and the API said otherwise"],
    ["The model loses on average and wins where it counts", "14.1 to 11.8 on the days that change"],
    ["The number the province is judged by tracks the weather", "most fires, fewest bad days, same year"],
  ];
  pts.forEach(([t, b], i) => {
    const y = 1.5 + i * 0.78;
    s.addText(t, {
      x: M, y, w: 6.0, h: 0.36, isTextBox: true, margin: 0,
      fontFace: HEAD, fontSize: 14.5, bold: true, color: LIGHT,
    });
    s.addText(b, {
      x: M + 6.1, y: y + 0.03, w: 2.8, h: 0.32, isTextBox: true, margin: 0,
      fontFace: BODY, fontSize: 11.5, color: FIRE_LT, align: "right",
    });
  });
  s.addText("Thank you.   Repository:  github.com/torthanantaseth/dsc-cmu-pm2.5-assignment", {
    x: M, y: 4.75, w: CW, h: 0.35, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 12.5, color: ONDARK,
  });
  s.addNotes(
`[9:20-9:40]
สี่อย่างที่อยากให้จำ

ข้อมูลกลายเป็นแบบจำลอง ผมเลยไปวัดว่ามันผิดไปเท่าไหร่
สองจุดที่ห่างกันสิบสองกิโลเมตรเป็นข้อมูลชุดเดียวกัน
โมเดลของผมแพ้โดยเฉลี่ยแต่ชนะในวันที่สำคัญ
และตัวเลขที่ใช้ตัดสินผลงานจังหวัด สะท้อนดินฟ้าอากาศมากกว่าการเผา

ลิงก์ repository อยู่บนจอครับ github ทับ torthanantaseth ทับ dsc-cmu-pm2.5-assignment ขอบคุณครับ`);
}

pres.writeFile({ fileName: OUT }).then(() => console.log("wrote", OUT));
