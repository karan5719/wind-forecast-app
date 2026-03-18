'use client'

interface Props {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}

export default function HorizonSlider({
  value,
  onChange,
  min = 0,
  max = 48,
  step = 1,
}: Props) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Forecast Horizon
        </label>
        <span className="text-sm font-mono font-semibold text-blue-300 bg-blue-950/60 px-2.5 py-0.5 rounded-md border border-blue-800/50">
          {value}h
        </span>
      </div>
      <div className="relative flex items-center h-8">
        <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {/* Thumb indicator */}
        <div
          className="absolute w-4 h-4 bg-blue-400 rounded-full border-2 border-gray-900 shadow-lg pointer-events-none transition-all"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>0h</span>
        <span>24h</span>
        <span>48h</span>
      </div>
    </div>
  )
}
