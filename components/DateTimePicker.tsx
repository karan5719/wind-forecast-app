'use client'

import { useState, useRef, useEffect } from 'react'
import { format, isValid } from 'date-fns'

interface Props {
  label: string
  value: Date
  onChange: (d: Date) => void
  min?: Date
  max?: Date
}

export default function DateTimePicker({ label, value, onChange, min, max }: Props) {
  const [inputVal, setInputVal] = useState(formatForInput(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setInputVal(formatForInput(value))
  }, [value, focused])

  function formatForInput(d: Date): string {
    try {
      return format(d, "yyyy-MM-dd'T'HH:mm")
    } catch {
      return ''
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setInputVal(v)
    const d = new Date(v)
    if (isValid(d)) {
      onChange(d)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      <div
        className={`relative flex items-center bg-gray-800 border rounded-lg transition-colors ${
          focused ? 'border-blue-500' : 'border-gray-700'
        }`}
      >
        <input
          type="datetime-local"
          value={inputVal}
          min={min ? formatForInput(min) : undefined}
          max={max ? formatForInput(max) : undefined}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent text-white text-sm px-3 py-2.5 outline-none cursor-pointer
                     [color-scheme:dark]
                     placeholder:text-gray-500"
        />
      </div>
    </div>
  )
}
