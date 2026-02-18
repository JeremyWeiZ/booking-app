import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { computeWeekSlots } from '@/lib/slots'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const querySchema = z.object({
  staffId: z.string().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parsed = querySchema.safeParse({
    staffId: searchParams.get('staffId'),
    weekStart: searchParams.get('weekStart'),
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const slots = await computeWeekSlots(parsed.data.staffId, parsed.data.weekStart)
    return NextResponse.json(slots, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('Slots error:', err)
    return NextResponse.json({ error: 'Failed to compute slots' }, { status: 500 })
  }
}
