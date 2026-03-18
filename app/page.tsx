'use client'

import { useState, useEffect, useCallback } from 'react'
import { subDays, addHours, formatISO } from 'date-fns'
import dynamic from 'next/dynamic'
import DateTimePicker from '@/components/DateTimePicker'
import HorizonSlider from '@/components/HorizonSlider'
import ErrorBoundary from '@/components/ErrorBoundary'

const WindChart = dynamic(() => import('@/components/WindChart'), { ssr: false })

interface DataPoint {
  targetTime: string
  actual: number | null
  forecast: number | null
}

interface ActualRecord {
  startTime: string
  generation: number
}

interface ForecastRecord {
  startTime: string
  publishTime: string
  generation: number
}

export default function Dashboard() {
  const now = new Date('2025-03-18T00:00:00Z')
  const [startTime, setStartTime] = useState<Date>(subDays(now, 1))
  const [endTime, setEndTime] = useState<Date>(now)
  const [horizon, setHorizon] = useState(4)
  const [pendingHorizon, setPendingHorizon] = useState(4)

  const [chartData, setChartData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const from = formatISO(startTime)
      const to = formatISO(endTime)

      const [actualsRes, forecastsRes] = await Promise.all([
        fetch(`/api/actuals?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
        fetch(
          `/api/forecasts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&horizon=${horizon}`
        ),
      ])

      if (!actualsRes.ok || !forecastsRes.ok) {
        const errText = await (actualsRes.ok ? forecastsRes : actualsRes).text()
        throw new Error(errText)
      }

      const actuals: ActualRecord[] = await actualsRes.json()
      const forecasts: ForecastRecord[] = await forecastsRes.json()

      // Merge by target time
      const actualMap = new Map(actuals.map((a) => [a.startTime, a.generation]))
      const forecastMap = new Map(forecasts.map((f) => [f.startTime, f.generation]))

      const allTimes = new Set([...actualMap.keys(), ...forecastMap.keys()])
      const merged: DataPoint[] = Array.from(allTimes)
        .sort()
        .map((t) => ({
          targetTime: t,
          actual: actualMap.get(t) ?? null,
          forecast: forecastMap.get(t) ?? null,
        }))

      setChartData(merged)
      setLastFetched(new Date().toLocaleTimeString())
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [startTime, endTime, horizon])

  // Fetch on mount and when horizon is applied
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizon])

  function handleApply() {
    setHorizon(pendingHorizon)
  }

  const diffHours = Math.round((endTime.getTime() - startTime.getTime()) / 3_600_000)
  const pointCount = chartData.filter((d) => d.actual !== null || d.forecast !== null).length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5">
              {[5, 8, 6, 9, 7, 10, 8].map((h, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-blue-400 rounded-sm opacity-80"
                  style={{ height: `${h * 2}px`, marginTop: `${(10 - h) * 2}px` }}
                />
              ))}
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">WindCast Monitor</h1>
              <p className="text-xs text-gray-500">UK National Wind Generation</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {lastFetched && (
              <>
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span>Updated {lastFetched}</span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Controls */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <DateTimePicker
              label="Start Time"
              value={startTime}
              onChange={(d) => { setStartTime(d); }}
              max={endTime}
            />
            <DateTimePicker
              label="End Time"
              value={endTime}
              onChange={(d) => { setEndTime(d); }}
              min={startTime}
              max={new Date()}
            />
            <div className="lg:col-span-1">
              <HorizonSlider
                value={pendingHorizon}
                onChange={setPendingHorizon}
                min={0}
                max={48}
                step={1}
              />
            </div>
            <button
              onClick={handleApply}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 
                         disabled:text-gray-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg 
                         transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 7h12M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Apply
                </>
              )}
            </button>
          </div>

          {/* Info strip */}
          <div className="flex flex-wrap gap-4 pt-1 border-t border-gray-800 text-xs text-gray-500">
            <span>
              Range:{' '}
              <span className="text-gray-300">
                {diffHours >= 24
                  ? `${Math.round(diffHours / 24)} day${Math.round(diffHours / 24) !== 1 ? 's' : ''}`
                  : `${diffHours}h`}
              </span>
            </span>
            <span>
              Data points: <span className="text-gray-300">{pointCount.toLocaleString()}</span>
            </span>
            <span>
              Horizon: forecast published ≥{' '}
              <span className="text-blue-300">{horizon}h</span> before target time
            </span>
          </div>
        </div>

        {/* Chart panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-300">Generation vs Forecast</h2>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-0.5 bg-blue-500 inline-block rounded" />
                <span className="text-gray-400">Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-0.5 bg-emerald-500 inline-block rounded" />
                <span className="text-gray-400">Forecast</span>
              </div>
            </div>
          </div>
          <ErrorBoundary>
            <WindChart data={chartData} loading={loading} error={error} />
          </ErrorBoundary>
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-600 text-center pb-4">
          Data sourced from{' '}
          <a
            href="https://bmrs.elexon.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-300 underline underline-offset-2"
          >
            Elexon BMRS
          </a>
          {' · '}January 2025 onwards · Forecast horizons 0–48h
        </p>
      </main>
    </div>
  )
}
