'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface DataPoint {
  targetTime: string
  actual: number | null
  forecast: number | null
}

interface Props {
  data: DataPoint[]
  loading: boolean
  error: string | null
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ color: string; name: string; value: number | null }>
  label?: string
}) => {
  if (!active || !payload || !payload.length) return null

  let formattedTime = label ?? ''
  try {
    formattedTime = format(parseISO(label ?? ''), 'dd MMM yyyy HH:mm')
  } catch {}

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl text-sm">
      <p className="text-gray-300 mb-2 font-medium">{formattedTime} UTC</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: p.color }}
          />
          <span className="text-gray-400">{p.name}:</span>
          <span className="text-white font-mono font-medium">
            {p.value !== null && p.value !== undefined
              ? `${Math.round(p.value).toLocaleString()} MW`
              : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

const tickFormatter = (val: string) => {
  try {
    return format(parseISO(val), 'HH:mm\ndd/MM')
  } catch {
    return val
  }
}

const yTickFormatter = (val: number) => {
  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`
  return String(val)
}

export default function WindChart({ data, loading, error }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1 bg-blue-400 rounded-full animate-pulse"
              style={{
                height: `${20 + Math.sin((i / 4) * Math.PI) * 24}px`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
        <p className="text-gray-400 text-sm">Loading wind data…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <p className="text-red-400 font-medium mb-1">Failed to load data</p>
          <p className="text-gray-500 text-sm max-w-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-80">
        <p className="text-gray-500">No data for the selected range.</p>
      </div>
    )
  }

  const validActuals = data.filter((d) => d.actual !== null)
  const validForecasts = data.filter((d) => d.forecast !== null)
  const hasActual = validActuals.length > 0
  const hasForecasts = validForecasts.length > 0

  return (
    <div className="w-full">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 mb-5 px-1">
        {hasActual && (
          <>
            <Stat
              label="Avg actual"
              value={`${Math.round(avg(validActuals.map((d) => d.actual!))).toLocaleString()} MW`}
              color="text-blue-400"
            />
            <Stat
              label="Peak actual"
              value={`${Math.round(Math.max(...validActuals.map((d) => d.actual!))).toLocaleString()} MW`}
              color="text-blue-300"
            />
          </>
        )}
        {hasForecasts && (
          <Stat
            label="Avg forecast"
            value={`${Math.round(avg(validForecasts.map((d) => d.forecast!))).toLocaleString()} MW`}
            color="text-emerald-400"
          />
        )}
        {hasActual && hasForecasts && (
          <Stat
            label="MAE"
            value={`${Math.round(mae(data)).toLocaleString()} MW`}
            color="text-amber-400"
          />
        )}
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="targetTime"
            tickFormatter={tickFormatter}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={60}
            label={{
              value: 'Target Time End (UTC)',
              position: 'insideBottom',
              offset: -44,
              fill: '#6b7280',
              fontSize: 12,
            }}
          />
          <YAxis
            tickFormatter={yTickFormatter}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'Power (MW)',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fill: '#6b7280',
              fontSize: 12,
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={32}
            formatter={(value) => (
              <span style={{ color: '#d1d5db', fontSize: 13 }}>{value}</span>
            )}
          />
          {hasActual && (
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual generation"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls={false}
            />
          )}
          {hasForecasts && (
            <Line
              type="monotone"
              dataKey="forecast"
              name="Forecasted generation"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              strokeDasharray="0"
              connectNulls={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function Stat({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-mono font-medium ${color}`}>{value}</span>
    </div>
  )
}

function avg(vals: number[]): number {
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function mae(data: DataPoint[]): number {
  const pairs = data.filter((d) => d.actual !== null && d.forecast !== null)
  if (!pairs.length) return 0
  return avg(pairs.map((d) => Math.abs(d.actual! - d.forecast!)))
}
