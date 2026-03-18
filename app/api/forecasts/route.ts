import { NextRequest, NextResponse } from 'next/server'
import { fetchForecasts, applyForecastHorizon } from '@/lib/elexon'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const horizon = searchParams.get('horizon') // hours

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to params required' }, { status: 400 })
  }

  if (new Date(from) >= new Date(to)) {
    return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 })
  }

  const horizonHours = horizon ? parseFloat(horizon) : 4

  try {
    const forecasts = await fetchForecasts(new Date(from), new Date(to))
    const forecastMap = applyForecastHorizon(forecasts, horizonHours)

    // Return as array of {startTime, publishTime, generation}
    const result = Array.from(forecastMap.values())
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
