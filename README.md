# GeoQuake ID — Dashboard Gempa Bumi Indonesia

> Visualisasi data gempa bumi real-time di wilayah Indonesia menggunakan data dari USGS Earthquake Hazards Program.

---

## Isi Dashboard

- **Chart 1: Line Chart** — Tren jumlah kejadian gempa per hari dalam rentang waktu yang dipilih
- **Chart 2: Bar Chart (Horizontal)** — 10 wilayah dengan frekuensi gempa tertinggi, warna menunjukkan intensitas relatif
- **Chart 3: Doughnut Chart** — Distribusi klasifikasi kedalaman hiposentrum (dangkal / menengah / dalam)
- **Chart 4: Scatter Plot** — Hubungan antara kedalaman dan magnitudo gempa
- **Fitur Interaktif:** Tooltip saat hover (semua chart), filter rentang waktu (7/30/90 hari), filter minimum magnitudo (Semua / ≥3.0 / ≥5.0) — semua chart update otomatis
- **Animasi:** Entrance animation Chart.js, animasi count-up pada KPI cards, CSS fade-up pada setiap card saat halaman dimuat

## KPI Cards

| Metrik | Deskripsi |
|--------|-----------|
| Total Gempa | Jumlah semua kejadian dalam rentang aktif |
| Magnitudo Tertinggi | Nilai magnitudo tertinggi dari data terfilter |
| Rata-rata Magnitudo | Rata-rata magnitudo seluruh kejadian |
| Gempa Kuat (≥5.0) | Jumlah gempa berpotensi signifikan |

## Sumber Data

- **Nama dataset:** USGS Earthquake Hazards Program — Earthquake Catalog API
- **URL sumber:** https://earthquake.usgs.gov/fdsnws/event/1/
- **Filter wilayah:** Bounding box Indonesia (lat −11° s/d 6°, lon 95° s/d 141°)
- **Periode data:** 90 hari terakhir (diambil langsung dari API saat halaman dimuat)

## Cara Jalankan di Lokal

```bash
# Jalur A — Static (paling mudah):
# Buka index.html langsung di browser
# Atau gunakan Live Server di VS Code (klik kanan → Open with Live Server)

# Jalur B — Menggunakan http-server:
npx http-server .
# Buka http://localhost:8080
```

> ⚠️ Tidak bisa dibuka dengan double-click file karena browser memblokir fetch API pada protokol `file://`. Gunakan Live Server atau http-server.

## Cara Deploy ke Vercel

1. Push folder ini ke repository GitHub (publik)
2. Buka [vercel.com](https://vercel.com) → New Project
3. Import repository GitHub-mu
4. Biarkan semua setting default (Framework: Other)
5. Klik **Deploy** — selesai dalam ~1 menit!
6. URL akan berbentuk: `nama-repo.vercel.app`

## Teknologi

| Teknologi | Kegunaan |
|-----------|----------|
| HTML5 + CSS3 | Struktur dan tampilan dashboard |
| JavaScript (ES2022) | Logika fetch data, filter, dan render chart |
| [Chart.js v4.4](https://www.chartjs.org/) | Visualisasi interaktif (dari CDN) |
| [USGS Earthquake API](https://earthquake.usgs.gov/fdsnws/event/1/) | Sumber data real-time |
| [Vercel](https://vercel.com/) | Platform deployment |
| [Google Fonts](https://fonts.google.com/) | Space Grotesk + Inter |

## Struktur File

```
earthquake-dashboard/
├── index.html   ← Halaman utama & struktur HTML
├── style.css    ← Desain visual (dark theme, responsive)
├── app.js       ← Logika data, Chart.js, interaktivitas
└── README.md    ← Dokumentasi proyek (file ini)
```

## Penjelasan Teknis Singkat

**Fetch Data (`fetchData`):** Memanggil USGS API dengan parameter bounding box Indonesia dan menyimpan hasilnya di variabel `allEarthquakes`. Data diambil 90 hari sekaligus agar filter UI bisa bekerja tanpa fetch ulang.

**Filter (`getFilteredData`):** Menyaring data berdasarkan `activeRange` (rentang hari) dan `activeMagMin` (minimum magnitudo) yang berubah saat user klik tombol filter.

**Count-up KPI:** Fungsi `countUp()` menggunakan `requestAnimationFrame` dan easing cubic untuk animasi angka dari 0 ke nilai target.

**Chart destruction:** Setiap render ulang memanggil `destroyChart()` untuk menghapus instance Chart.js lama agar tidak terjadi memory leak atau chart tumpang tindih.

## Anggota Kelompok

- Nama 1 (NIM)
- Nama 2 (NIM)
- Nama 3 (NIM)
- Nama 4 (NIM)
- Nama 5 (NIM)
