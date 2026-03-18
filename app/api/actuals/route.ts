import { NextRequest, NextResponse } from 'next/server'
import { fetchActuals } from '@/lib/elexon'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to params required' }, { status: 400 })
  }

  if (new Date(from) >= new Date(to)) {
    return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 })
  }

  const fromDate = new Date(from).toISOString().split('T')[0]
  const toDate = new Date(to).toISOString().split('T')[0]
  if (fromDate >= toDate) {
    return NextResponse.json({ error: 'Date range must span at least one full day' }, { status: 400 })
  }

  const fromDate = new Date(from).toISOString().split('T')[0]
  const toDate = new Date(to).toISOString().split('T')[0]
  if (fromDate >= toDate) {
    return NextResponse.json({ error: 'Date range must span at least one full day' }, { status: 400 })
  }

  try {
    const data = await fetchActuals(new Date(from), new Date(to))
    return NextResponse.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
