# WindCast Monitor

A full-stack forecast monitoring app for UK national wind power generation, built as part of a technical challenge. Compares actual wind generation against BMRS wind power forecasts, with configurable forecast horizon analysis.

> **Built with AI assistance**: GitHub Copilot and Claude (Anthropic) were used to assist with boilerplate, component structure, and Recharts configuration. All core logic — forecast horizon filtering, API integration, error analysis methodology — was written and reasoned through manually.

---

## Live App

🔗 **[https://wind-forecast-app.vercel.app](https://wind-forecast-app.vercel.app)** *(update after deployment)*

📹 **Demo video**: *(add YouTube link after recording)*

---

## Directory Structure

```
wind-forecast-app/
├── app/
│   ├── api/
│   │   ├── actuals/
│   │   │   └── route.ts          # API proxy: fetches FUELHH actuals from Elexon
│   │   └── forecasts/
│   │       └── route.ts          # API proxy: fetches WINDFOR forecasts + applies horizon filter
│   ├── globals.css               # Global styles, dark scrollbar, range input
│   ├── layout.tsx                # Root layout with Space Grotesk + JetBrains Mono fonts
│   └── page.tsx                  # Main dashboard page (controls + chart)
├── components/
│   ├── WindChart.tsx             # Recharts line chart with tooltip, legend, stats bar
│   ├── DateTimePicker.tsx        # Dark-mode datetime-local input
│   └── HorizonSlider.tsx        # Custom styled range slider (0–48h)
├── lib/
│   └── elexon.ts                 # Core data types, fetch functions, horizon logic
├── analysis/
│   ├── notebook1_forecast_error.ipynb    # Forecast error characterisation
│   └── notebook2_reliable_capacity.ipynb # Reliable capacity recommendation
├── public/                       # Static assets
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## How to Run Locally

### Prerequisites
- Node.js 18+
- npm 9+

### Steps

```bash
# 1. Clone / unzip the repo
cd wind-forecast-app

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
# → http://localhost:3000

# 4. Build for production
npm run build
npm start
```

No environment variables required — the app calls Elexon BMRS public APIs directly through Next.js API routes (no auth needed).

---

## Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts:
#   Framework: Next.js (auto-detected)
#   Build command: npm run build
#   Output: .next
```

Or connect your GitHub repo at [vercel.com](https://vercel.com) for automatic deployments.

---

## Running the Analysis Notebooks

```bash
cd analysis

# Install Python dependencies
pip install requests pandas numpy matplotlib seaborn jupyter

# Launch Jupyter
jupyter notebook

# Open:
#   notebook1_forecast_error.ipynb
#   notebook2_reliable_capacity.ipynb
```

Notebooks fetch data directly from the Elexon BMRS API — internet connection required. Data range is Jan–Mar 2025 by default (adjust `DATE_FROM` / `DATE_TO` in the first fetch cell).

---

## Architecture

### Data Flow

```
Browser → Next.js API route → Elexon BMRS API
                                  ├── /datasets/FUELHH/stream  (actuals)
                                  └── /datasets/WINDFOR/stream (forecasts)
```

Next.js API routes act as a server-side proxy, avoiding CORS issues and enabling response caching (`Cache-Control: s-maxage=300`).

### Forecast Horizon Logic

For each 30-minute target time slot `T`:
1. Collect all forecast records where `target_time == T`
2. Filter to those with `publish_time ≤ T − horizon_hours`
3. Select the one with the **latest** `publish_time` (most up-to-date forecast that still respects the horizon)

This matches the spec: "the latest forecast created at least N hours before each target time."

### Data Filtering
- Only data from **January 2025 onwards**
- Only forecasts with **horizon 0–48 hours**
- `fuelType = WIND` only for actuals

---

## Analysis Summary

### Notebook 1: Forecast Error Characterisation
Analyses error characteristics of the WINDFOR model:
- Overall MAE, RMSE, median, P95, P99 absolute error
- Signed error distribution and bias
- Error vs forecast horizon (0–48h) — shows monotonic increase
- Error by time of day — identifies diurnal patterns
- Error vs generation level — MAPE higher at low wind
- Joint heatmap (horizon × time of day)

### Notebook 2: Reliable Wind Capacity
Answers: *how many MW of wind can we reliably count on?*
- Full distribution analysis with exceedance curves
- Stratified by peak demand periods (winter weekday evenings)
- Rolling 24h minimum — identifies cold dark doldrum events
- **Recommendation**: Peak-period P10 as the "firm" reliable capacity figure, aligned with NESO's Equivalent Firm Capacity methodology

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Data source | Elexon BMRS public API |
| Deployment | Vercel |
| Analysis | Python, Pandas, NumPy, Matplotlib, Jupyter |
