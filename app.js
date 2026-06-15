/* ===================================================
   GeoQuake ID — app.js
   Sumber Data: USGS Earthquake Hazards Program
   API: https://earthquake.usgs.gov/fdsnws/event/1/
   Filter: Bounding Box Indonesia
   =================================================== */

"use strict";

// ---- CONFIG ----
const INDONESIA_BBOX = {
  minlat: -11, maxlat: 6,
  minlon: 95,  maxlon: 141,
};

// Warna chart
const COLORS = {
  accent:  "#00D4AA",
  amber:   "#F59E0B",
  red:     "#EF4444",
  blue:    "#3B82F6",
  purple:  "#8B5CF6",
  grid:    "rgba(255,255,255,0.06)",
  tooltip: "#111A2E",
};

// ---- STATE ----
let allEarthquakes = [];
let activeRange   = "week";
let activeMagMin  = 0;
let charts        = {};   // simpan instance Chart.js agar bisa di-destroy/rebuild

// ---- INIT ----
document.addEventListener("DOMContentLoaded", () => {
  setupFilters();
  fetchData();
});

// ---- FILTER UI ----
function setupFilters() {
  document.querySelectorAll("#time-filter .filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#time-filter .filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeRange = btn.dataset.range;
      renderAll();
    });
  });

  document.querySelectorAll("#mag-filter .filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#mag-filter .filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeMagMin = parseFloat(btn.dataset.mag);
      renderAll();
    });
  });
}

// ---- FETCH DATA ----
async function fetchData() {
  try {
    // Ambil 90 hari — simpan semua, filter UI yang atur rentang
    const endtime   = new Date();
    const starttime = new Date();
    starttime.setDate(starttime.getDate() - 90);

    const params = new URLSearchParams({
      format:   "geojson",
      starttime: starttime.toISOString().split("T")[0],
      endtime:   endtime.toISOString().split("T")[0],
      minlatitude:  INDONESIA_BBOX.minlat,
      maxlatitude:  INDONESIA_BBOX.maxlat,
      minlongitude: INDONESIA_BBOX.minlon,
      maxlongitude: INDONESIA_BBOX.maxlon,
      orderby: "time",
    });

    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?${params}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    allEarthquakes = data.features.map(f => ({
      time:      f.properties.time,
      mag:       f.properties.mag  ?? 0,
      depth:     f.geometry.coordinates[2],
      lat:       f.geometry.coordinates[1],
      lon:       f.geometry.coordinates[0],
      place:     f.properties.place ?? "Tidak diketahui",
    })).filter(e => e.mag !== null && !isNaN(e.mag));

    // Timestamp update
    document.getElementById("last-update-time").textContent =
      new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    renderAll();
  } catch (err) {
    console.error("Gagal mengambil data:", err);
    document.getElementById("table-body").innerHTML =
      `<tr><td colspan="5" class="loading-cell" style="color:#EF4444;">
        Gagal memuat data. Periksa koneksi atau coba lagi nanti.<br>
        <small style="opacity:.6">${err.message}</small>
      </td></tr>`;
  }
}

// ---- FILTER DATA ----
function getFilteredData() {
  const days = activeRange === "week" ? 7 : activeRange === "month" ? 30 : 90;
  const cutoff = Date.now() - days * 86400_000;
  return allEarthquakes.filter(e => e.time >= cutoff && e.mag >= activeMagMin);
}

// ---- RENDER ALL ----
function renderAll() {
  const data = getFilteredData();
  renderKPI(data);
  renderTrendChart(data);
  renderRegionChart(data);
  renderDepthChart(data);
  renderScatterChart(data);
  renderTable(data);
}

// ---- KPI ----
function renderKPI(data) {
  const total  = data.length;
  const maxMag = data.length ? Math.max(...data.map(e => e.mag)) : 0;
  const avgMag = data.length ? data.reduce((s, e) => s + e.mag, 0) / data.length : 0;
  const strong = data.filter(e => e.mag >= 5).length;

  countUp("kpi-total",  total,         0, 1200);
  countUp("kpi-max",    maxMag,        1, 1200);
  countUp("kpi-avg",    avgMag,        1, 1200);
  countUp("kpi-strong", strong,        0, 1200);
}

/** Animasi count-up angka dari 0 ke target */
function countUp(id, target, decimals, duration) {
  const el     = document.getElementById(id);
  const start  = performance.now();
  const from   = 0;

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current  = from + (target - from) * ease;
    el.textContent = decimals ? current.toFixed(decimals) : Math.floor(current).toLocaleString("id-ID");
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = decimals ? target.toFixed(decimals) : target.toLocaleString("id-ID");
  }
  requestAnimationFrame(step);
}

// ---- CHART UTILS ----
function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); charts[key] = null; }
}

const baseOptions = {
  responsive:          true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: COLORS.tooltip,
      borderColor:     COLORS.accent,
      borderWidth:     1,
      titleColor:      "#E8F0FE",
      bodyColor:       "#8899BB",
      padding:         10,
      cornerRadius:    8,
    },
  },
  scales: {
    x: {
      grid:  { color: COLORS.grid },
      ticks: { color: "#556080", font: { family: "'Inter', sans-serif", size: 11 } },
    },
    y: {
      grid:  { color: COLORS.grid },
      ticks: { color: "#556080", font: { family: "'Inter', sans-serif", size: 11 } },
    },
  },
};

// ---- CHART 1: LINE — Tren Harian ----
function renderTrendChart(data) {
  destroyChart("trend");

  // Hitung jumlah gempa per hari
  const days = activeRange === "week" ? 7 : activeRange === "month" ? 30 : 90;
  const counts = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    counts[key] = 0;
  }
  data.forEach(e => {
    const key = new Date(e.time).toISOString().split("T")[0];
    if (key in counts) counts[key]++;
  });

  const labels = Object.keys(counts).map(k => {
    const d = new Date(k);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  });
  const values = Object.values(counts);

  const ctx = document.getElementById("chart-trend").getContext("2d");

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0,   "rgba(0,212,170,0.35)");
  gradient.addColorStop(1,   "rgba(0,212,170,0)");

  charts.trend = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Jumlah Gempa",
        data: values,
        borderColor:     COLORS.accent,
        backgroundColor: gradient,
        borderWidth:     2,
        pointRadius:     3,
        pointHoverRadius: 6,
        pointBackgroundColor: COLORS.accent,
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      ...baseOptions,
      animation: { duration: 900, easing: "easeOutQuart" },
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            title:  items => `📅 ${items[0].label}`,
            label:  item  => ` ${item.raw} kejadian gempa`,
          },
        },
      },
    },
  });
}

// ---- CHART 2: BAR — Gempa per Wilayah ----
function renderRegionChart(data) {
  destroyChart("region");

  // Ekstrak nama wilayah dari string place (ambil bagian setelah koma terakhir)
  const regionCounts = {};
  data.forEach(e => {
    let region = e.place.split(",").pop().trim();
    if (!region || region.length < 2) region = "Lainnya";
    regionCounts[region] = (regionCounts[region] || 0) + 1;
  });

  // Top 10
  const sorted = Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const labels = sorted.map(s => s[0]);
  const values = sorted.map(s => s[1]);

  // Warna bar per intensitas
  const barColors = values.map(v => {
    const max = values[0];
    const ratio = v / max;
    if (ratio > 0.75) return COLORS.red;
    if (ratio > 0.4)  return COLORS.amber;
    return COLORS.accent;
  });

  const ctx = document.getElementById("chart-region").getContext("2d");
  charts.region = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Jumlah Gempa",
        data: values,
        backgroundColor: barColors,
        borderRadius: 5,
        borderSkipped: false,
      }],
    },
    options: {
      ...baseOptions,
      indexAxis: "y",
      animation: { duration: 800, easing: "easeOutBack" },
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            label: item => ` ${item.raw} gempa`,
          },
        },
      },
      scales: {
        x: { ...baseOptions.scales.x, beginAtZero: true },
        y: { ...baseOptions.scales.y, ticks: { color: "#8899BB", font: { size: 10 } } },
      },
    },
  });
}

// ---- CHART 3: DOUGHNUT — Distribusi Kedalaman ----
function renderDepthChart(data) {
  destroyChart("depth");

  // Klasifikasi kedalaman hiposentrum
  // Dangkal: < 70 km | Menengah: 70–300 km | Dalam: > 300 km
  const counts = { "Dangkal (< 70 km)": 0, "Menengah (70–300 km)": 0, "Dalam (> 300 km)": 0 };
  data.forEach(e => {
    if (e.depth < 70)       counts["Dangkal (< 70 km)"]++;
    else if (e.depth <= 300) counts["Menengah (70–300 km)"]++;
    else                     counts["Dalam (> 300 km)"]++;
  });

  const labels      = Object.keys(counts);
  const values      = Object.values(counts);
  const bgColors    = [COLORS.red, COLORS.amber, COLORS.blue];
  const total       = values.reduce((s, v) => s + v, 0);

  const ctx = document.getElementById("chart-depth").getContext("2d");
  charts.depth = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: bgColors,
        borderColor:     "transparent",
        hoverOffset:     8,
      }],
    },
    options: {
      ...baseOptions,
      cutout: "68%",
      animation: { animateRotate: true, duration: 900 },
      plugins: {
        ...baseOptions.plugins,
        legend: { display: false },
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            label: item => {
              const pct = total ? ((item.raw / total) * 100).toFixed(1) : 0;
              return ` ${item.raw} gempa (${pct}%)`;
            },
          },
        },
      },
    },
  });

  // Custom legend
  const legendEl = document.getElementById("depth-legend");
  legendEl.innerHTML = labels.map((l, i) => {
    const pct = total ? ((values[i] / total) * 100).toFixed(1) : 0;
    return `<div class="legend-item">
      <span class="legend-dot" style="background:${bgColors[i]}"></span>
      <span>${l} — <strong style="color:var(--text-primary)">${pct}%</strong></span>
    </div>`;
  }).join("");
}

// ---- CHART 4: SCATTER — Magnitudo vs Kedalaman ----
function renderScatterChart(data) {
  destroyChart("scatter");

  // Sampel maks 500 titik agar canvas tidak berat
  const sample = data.length > 500
    ? data.sort(() => 0.5 - Math.random()).slice(0, 500)
    : data;

  const points = sample.map(e => ({ x: e.depth, y: e.mag }));

  const ctx = document.getElementById("chart-scatter").getContext("2d");
  charts.scatter = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [{
        label: "Gempa",
        data: points,
        backgroundColor: points.map(p =>
          p.y >= 5  ? "rgba(239,68,68,0.7)"  :
          p.y >= 3  ? "rgba(245,158,11,0.6)" :
                      "rgba(0,212,170,0.4)"
        ),
        pointRadius: 3,
        pointHoverRadius: 6,
      }],
    },
    options: {
      ...baseOptions,
      animation: { duration: 700 },
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            label: item => [
              ` Kedalaman: ${item.raw.x.toFixed(1)} km`,
              ` Magnitudo: ${item.raw.y.toFixed(1)}`,
            ],
          },
        },
      },
      scales: {
        x: {
          ...baseOptions.scales.x,
          title: {
            display: true,
            text:    "Kedalaman (km)",
            color:   "#556080",
            font:    { size: 11 },
          },
        },
        y: {
          ...baseOptions.scales.y,
          title: {
            display: true,
            text:    "Magnitudo",
            color:   "#556080",
            font:    { size: 11 },
          },
        },
      },
    },
  });
}

// ---- TABLE: 10 Gempa Terbaru ----
function renderTable(data) {
  const tbody  = document.getElementById("table-body");
  const recent = [...data].sort((a, b) => b.time - a.time).slice(0, 10);

  if (!recent.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-cell">Tidak ada data untuk filter ini.</td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(e => {
    const mag   = e.mag.toFixed(1);
    const cls   = e.mag >= 5 ? "mag-high" : e.mag >= 3 ? "mag-mid" : "mag-low";
    const time  = new Date(e.time).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    return `<tr>
      <td>${time} WIB</td>
      <td>${e.place}</td>
      <td><span class="mag-badge ${cls}">${mag}</span></td>
      <td>${e.depth.toFixed(1)} km</td>
      <td style="font-size:0.7rem;color:var(--text-muted)">${e.lat.toFixed(3)}°, ${e.lon.toFixed(3)}°</td>
    </tr>`;
  }).join("");
}
