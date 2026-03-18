// Types
export interface ActualRecord {
  startTime: string       // ISO datetime, target time
  generation: number      // MW
}

export interface ForecastRecord {
  startTime: string       // ISO datetime, target time
  publishTime: string     // ISO datetime, when forecast was created
  generation: number      // MW
}

export interface ChartDataPoint {
  targetTime: string      // ISO datetime
  actual: number | null
  forecast: number | null
  forecastPublishTime: string | null
}

// ── Elexon BMRS endpoints ──────────────────────────────────────────────────
const BMRS_BASE = 'https://data.elexon.co.uk/bmrs/api/v1'

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 19) // "2025-01-01T00:00:00"
}

// Fetch actual wind generation (FUELHH, fuelType=WIND)
export async function fetchActuals(
  from: Date,
  to: Date
): Promise<ActualRecord[]> {
  // BMRS FUELHH API - try with datetime parameters
  const url =
    `${BMRS_BASE}/datasets/FUELHH/stream` +
    `?from=${encodeURIComponent(fmtDate(from))}` +
    `&to=${encodeURIComponent(fmtDate(to))}` +
    `&fuelType=WIND`

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    let detail = ''
    try {
      const errorData = await res.json()
      detail = JSON.stringify(errorData)
    } catch (e) {
      detail = await res.text()
    }
    throw new Error(`FUELHH fetch failed: ${res.status} ${res.statusText}. Details: ${detail}. URL: ${url}`)
  }

  const data = await res.json()

  // The stream endpoint may return an array directly or wrap it
  const rows: Record<string, unknown>[] = Array.isArray(data)
    ? data
    : data.data ?? data.items ?? []

  const seen = new Map<string, number>()
  for (const row of rows) {
    if (row.fuelType !== 'WIND') continue
    const key = row.startTime as string
    const gen = Number(row.generation ?? row.quantity ?? 0)
    if (!seen.has(key) || gen > seen.get(key)!) {
      seen.set(key, gen)
    }
  }

  return Array.from(seen.entries()).map(([startTime, generation]) => ({
    startTime,
    generation,
  }))
}

// Fetch wind power forecasts (WINDFOR)
export async function fetchForecasts(
  from: Date,
  to: Date
): Promise<ForecastRecord[]> {
  // Fetch forecasts that could cover our window: published up to 48h before
  const publishFrom = new Date(from.getTime() - 48 * 60 * 60 * 1000)

  const url =
    `${BMRS_BASE}/datasets/WINDFOR/stream` +
    `?publishDateTimeFrom=${fmtDate(publishFrom)}` +
    `&publishDateTimeTo=${fmtDate(to)}` +
    `&startDateTimeFrom=${fmtDate(from)}` +
    `&startDateTimeTo=${fmtDate(to)}`

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    throw new Error(`WINDFOR fetch failed: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  const rows: Record<string, unknown>[] = Array.isArray(data)
    ? data
    : data.data ?? data.items ?? []

  // Filter: Jan 2024 onwards, horizon 0-48h
  const JAN_2024 = new Date('2024-01-01T00:00:00Z').getTime()
  const records: ForecastRecord[] = []

  for (const row of rows) {
    const publishTime = row.publishTime as string
    const startTime = row.startTime as string

    if (!publishTime || !startTime) continue

    const tPublish = new Date(publishTime).getTime()
    const tTarget = new Date(startTime).getTime()

    if (tTarget < JAN_2024) continue

    const horizonHrs = (tTarget - tPublish) / 3_600_000
    if (horizonHrs < 0 || horizonHrs > 48) continue

    records.push({
      startTime,
      publishTime,
      generation: Number(row.generation ?? row.quantity ?? 0),
    })
  }

  return records
}

// ── Core logic: pick the correct forecast per target time ─────────────────
//
// For each target time, find the LATEST forecast that was published
// at least `horizonHours` before the target time.
//
export function applyForecastHorizon(
  forecasts: ForecastRecord[],
  horizonHours: number
): Map<string, ForecastRecord> {
  const result = new Map<string, ForecastRecord>()

  for (const fc of forecasts) {
    const tTarget = new Date(fc.startTime).getTime()
    const tPublish = new Date(fc.publishTime).getTime()
    const horizonMs = horizonHours * 3_600_000

    // Must be published at least horizonHours before target
    if (tPublish > tTarget - horizonMs) continue

    const key = fc.startTime
    const existing = result.get(key)

    // Keep the one published closest to (but still before) the cutoff
    if (!existing || new Date(fc.publishTime) > new Date(existing.publishTime)) {
      result.set(key, fc)
    }
  }

  return result
}

// ── Merge actuals + selected forecasts → chart data ───────────────────────
export function buildChartData(
  actuals: ActualRecord[],
  forecastMap: Map<string, ForecastRecord>
): ChartDataPoint[] {
  // Collect all target times
  const times = new Set<string>()
  for (const a of actuals) times.add(a.startTime)
  for (const k of forecastMap.keys()) times.add(k)

  const actualMap = new Map(actuals.map((a) => [a.startTime, a.generation]))

  return Array.from(times)
    .sort()
    .map((t) => {
      const fc = forecastMap.get(t)
      return {
        targetTime: t,
        actual: actualMap.get(t) ?? null,
        forecast: fc ? fc.generation : null,
        forecastPublishTime: fc ? fc.publishTime : null,
      }
    })
}
