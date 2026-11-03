const API_URL = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=14.019089&longitude=100.526552&hourly=pm2_5&forecast_hours=48&timezone=Asia%2FBangkok&timeformat=unixtime&domains=cams_global";
const HOUR = 60 * 60;
const DAY = 24 * HOUR;

const button = document.getElementById("reveal-button");
const buttonLabel = document.getElementById("button-label");
const forecastCard = document.getElementById("forecast-card");
const lockedReading = document.getElementById("locked-reading");
const readingPreview = document.getElementById("reading-preview");
const reportSection = document.getElementById("report-section");
const toast = document.getElementById("toast");
let currentReport = null;
let loading = false;
let toastTimer = null;

function getBand(value) {
  if (value <= 15) return {
    key: "good",
    label: "ดีมาก",
    summary: "พยากรณ์อยู่ในระดับดีมาก สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ",
    tips: [
      "ทำกิจกรรมและออกกำลังกายกลางแจ้งได้ตามปกติ",
      "ติดตามสถานการณ์อีกครั้ง หากมีหมอกหรือกลิ่นควันผิดปกติ",
      "ผู้ที่มีอาการระคายเคืองควรพักในที่อากาศถ่ายเท"
    ]
  };
  if (value <= 25) return {
    key: "fair",
    label: "ดี",
    summary: "อากาศโดยรวมอยู่ในระดับดี แต่ค่าฝุ่นอาจเปลี่ยนแปลงตามสภาพอากาศ",
    tips: [
      "ทำกิจกรรมกลางแจ้งได้ตามปกติ และคอยสังเกตอาการ",
      "กลุ่มเสี่ยงควรลดกิจกรรมที่ใช้แรงมากหรือใช้เวลานานกลางแจ้ง",
      "ติดตามค่าฝุ่นและประกาศของโรงเรียนระหว่างวัน"
    ]
  };
  if (value <= 37.5) return {
    key: "moderate",
    label: "ปานกลาง",
    summary: "เริ่มควรเฝ้าระวัง โดยเฉพาะผู้ที่ไวต่อมลพิษทางอากาศ",
    tips: [
      "ลดกิจกรรมกลางแจ้งที่ใช้แรงมากหรือทำต่อเนื่องเป็นเวลานาน",
      "พิจารณาย้ายคาบพละหรือกิจกรรมเข้าในอาคาร",
      "ผู้มีโรคประจำตัวควรเตรียมยาและทำตามคำแนะนำแพทย์"
    ]
  };
  if (value <= 75) return {
    key: "poor",
    label: "เริ่มมีผลกระทบต่อสุขภาพ",
    summary: "ควรลดเวลาสัมผัสฝุ่น และหลีกเลี่ยงกิจกรรมกลางแจ้งที่ใช้แรงมาก",
    tips: [
      "ลดหรือย้ายกิจกรรมกลางแจ้งของนักเรียนเข้าในอาคาร",
      "หากจำเป็นต้องออกนอกอาคาร ใช้หน้ากากกรองฝุ่นที่กระชับ เช่น N95",
      "เด็กเล็ก ผู้สูงอายุ และผู้มีโรคประจำตัวควรอยู่ในอาคารอากาศสะอาด"
    ]
  };
  return {
    key: "very-poor",
    label: "มีผลกระทบต่อสุขภาพ",
    summary: "หลีกเลี่ยงกิจกรรมกลางแจ้ง และอยู่ในห้องอากาศสะอาดเป็นหลัก",
    tips: [
      "งดกิจกรรมกลางแจ้งและการออกกำลังกายกลางแจ้ง",
      "อยู่ในห้องปลอดฝุ่น ปิดประตูหน้าต่าง และใช้เครื่องฟอกอากาศถ้ามี",
      "หากจำเป็นต้องออกนอกอาคาร ควรสวมหน้ากาก N95 ที่กระชับกับใบหน้า"
    ]
  };
}

function localHourLabel(unixSeconds) {
  const localSeconds = unixSeconds + (7 * HOUR);
  return new Date(localSeconds * 1000).toISOString().slice(11, 16);
}

function formatThaiDate(date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok"
  }).format(date);
}

async function fetchForecast() {
  const controller = new AbortController();
  const timeout = window.setTimeout(function () { controller.abort(); }, 10000);
  try {
    const response = await fetch(API_URL, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error("บริการพยากรณ์ตอบกลับไม่สำเร็จ (" + response.status + ")");
    const payload = await response.json();
    const times = payload && payload.hourly && payload.hourly.time;
    const values = payload && payload.hourly && payload.hourly.pm2_5;
    if (!Array.isArray(times) || !Array.isArray(values) || times.length !== values.length) {
      throw new Error("รูปแบบข้อมูลพยากรณ์ไม่ครบ");
    }

    const start = Math.floor(Date.now() / (HOUR * 1000)) * HOUR;
    const end = start + DAY;
    const samples = [];
    for (let i = 0; i < times.length; i += 1) {
      const timestamp = Number(times[i]);
      const reading = Number(values[i]);
      if (timestamp >= start && timestamp < end && Number.isFinite(reading)) {
        samples.push({ time: timestamp, value: reading });
      }
    }
    if (!samples.length) throw new Error("ยังไม่มีข้อมูลสำหรับช่วง 24 ชั่วโมงข้างหน้า");

    const average = samples.reduce(function (sum, sample) { return sum + sample.value; }, 0) / samples.length;
    const bands = Array.from({ length: 8 }, function () { return []; });
    samples.forEach(function (sample) {
      const index = Math.min(7, Math.floor((sample.time - start) / (3 * HOUR)));
      bands[index].push(sample);
    });
    const trend = bands.map(function (group, index) {
      return {
        time: start + index * 3 * HOUR,
        value: group.length ? group.reduce(function (sum, sample) { return sum + sample.value; }, 0) / group.length : null
      };
    });

    return {
      average: average,
      minimum: Math.min.apply(null, samples.map(function (item) { return item.value; })),
      maximum: Math.max.apply(null, samples.map(function (item) { return item.value; })),
      trend: trend,
      sampleCount: samples.length,
      issuedAt: new Date()
    };
  } catch (error) {
    if (error.name === "AbortError") throw new Error("เชื่อมต่อแหล่งข้อมูลใช้เวลานานเกินไป กรุณาลองอีกครั้ง");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function categoryColor(key) {
  const colors = {
    good: "#55a384",
    fair: "#79a6cc",
    moderate: "#d0a54d",
    poor: "#df8a48",
    "very-poor": "#cc5876"
  };
  return colors[key] || "#8eb9ab";
}

function setChart(report) {
  const values = report.trend.map(function (item) { return item.value; }).filter(Number.isFinite);
  const top = Math.max(15, Math.ceil(Math.max.apply(null, values.concat([report.average])) / 5) * 5);
  const midpoint = Math.ceil(top / 2);
  document.getElementById("y-top").textContent = String(top);
  document.getElementById("y-mid").textContent = String(midpoint);

  const bars = document.getElementById("forecast-bars");
  const labels = document.getElementById("chart-x-labels");
  bars.replaceChildren();
  labels.replaceChildren();

  report.trend.forEach(function (point, index) {
    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";
    if (Number.isFinite(point.value)) {
      const value = document.createElement("span");
      value.className = "bar-value";
      value.textContent = point.value.toFixed(0);
      const bar = document.createElement("span");
      bar.className = "bar";
      bar.style.height = Math.max(3, Math.min(100, point.value / top * 100)) + "%";
      bar.style.background = categoryColor(getBand(point.value).key);
      bar.style.animationDelay = (index * 55) + "ms";
      bar.title = localHourLabel(point.time) + " น. · " + point.value.toFixed(1) + " µg/m³";
      wrap.append(value, bar);
    } else {
      const empty = document.createElement("span");
      empty.className = "bar-value";
      empty.textContent = "—";
      wrap.append(empty);
    }
    bars.append(wrap);

    const label = document.createElement("span");
    label.textContent = index % 2 === 0 ? localHourLabel(point.time).slice(0, 2) + " น." : "";
    labels.append(label);
  });
  bars.setAttribute("aria-label", "ค่าเฉลี่ย PM2.5 รายช่วง 3 ชั่วโมง ใน 24 ชั่วโมงถัดไป");
}

function renderRecommendations(band) {
  document.getElementById("advice-summary").textContent = band.summary;
  const list = document.getElementById("advice-list");
  list.replaceChildren();
  band.tips.forEach(function (tip) {
    const item = document.createElement("li");
    const mark = document.createElement("span");
    mark.className = "check-mark";
    mark.textContent = "✓";
    const text = document.createElement("span");
    text.textContent = tip;
    item.append(mark, text);
    list.append(item);
  });
}

function revealReport(report) {
  currentReport = report;
  const band = getBand(report.average);
  document.body.dataset.status = band.key;

  document.getElementById("pm-value").textContent = report.average.toFixed(1);
  document.getElementById("status-label").textContent = band.label;
  document.getElementById("report-badge-label").textContent = band.label;
  document.getElementById("reading-time").textContent = "ข้อมูล ณ " + formatThaiDate(report.issuedAt) + " น.";
  document.getElementById("trend-pill").textContent = "ต่ำสุด " + report.minimum.toFixed(1) + " · สูงสุด " + report.maximum.toFixed(1);
  document.getElementById("legend-text").textContent = "ค่าเฉลี่ย " + report.average.toFixed(1) + " µg/m³";
  document.getElementById("mini-scale-fill").style.width = Math.max(2, Math.min(100, report.average / 100 * 100)) + "%";
  document.getElementById("report-subtitle").textContent =
    "ค่าเฉลี่ย " + report.sampleCount + " ช่วงข้อมูลใน 24 ชั่วโมง · โรงเรียนปทุมวิไล";
  renderRecommendations(band);
  setChart(report);

  lockedReading.hidden = true;
  readingPreview.hidden = false;
  reportSection.hidden = false;
  forecastCard.classList.remove("is-loading");
  forecastCard.classList.add("revealed");
  button.disabled = false;
  buttonLabel.textContent = "อัปเดตข้อมูลล่าสุด";
  document.querySelector(".card-footnote").innerHTML = "<span>i</span> ค่าเฉลี่ยคาดการณ์ 24 ชั่วโมง";
  window.setTimeout(function () { reportSection.scrollIntoView({ behavior: "smooth", block: "start" }); }, 180);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(function () { toast.classList.remove("show"); }, 4300);
}

async function revealOrRefresh() {
  if (loading) return;
  loading = true;
  button.disabled = true;
  forecastCard.classList.add("is-loading");
  buttonLabel.textContent = currentReport ? "กำลังอัปเดตข้อมูล..." : "กำลังประมวลผล...";
  const minimumAnimation = new Promise(function (resolve) { window.setTimeout(resolve, 1250); });
  try {
    const result = await Promise.all([fetchForecast(), minimumAnimation]);
    revealReport(result[0]);
  } catch (error) {
    forecastCard.classList.remove("is-loading");
    button.disabled = false;
    buttonLabel.textContent = currentReport ? "ลองอัปเดตอีกครั้ง" : "ลองโหลดข้อมูลอีกครั้ง";
    showToast(error.message || "โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
  } finally {
    loading = false;
  }
}

button.addEventListener("click", revealOrRefresh);
