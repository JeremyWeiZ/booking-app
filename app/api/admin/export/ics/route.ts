import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildICalForStaff } from '@/lib/ical'
import { z } from 'zod'

const querySchema = z.object({
  staffId: z.string().min(1),
  start: z.string(),
  end: z.string(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const parsed = querySchema.safeParse({
    staffId: searchParams.get('staffId'),
    start: searchParams.get('start'),
    end: searchParams.get('end'),
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  const icsContent = await buildICalForStaff(
    parsed.data.staffId,
    new Date(parsed.data.start),
    new Date(parsed.data.end)
  )

  return new NextResponse(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="appointments.ics"`,
    },
  })
}
