import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  timezone: z.string().optional(),
  bookingInterval: z.number().int().refine((v) => [10, 15, 30].includes(v)).optional(),
  bufferMinutes: z.number().int().min(0).optional(),
  openUntil: z.string().datetime().nullable().optional(),
  calendarStartHour: z.number().int().min(0).max(23).optional(),
  calendarEndHour: z.number().int().min(1).max(24).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { staffId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.staffSettings.findUnique({
    where: { staffId: params.staffId },
  })

  if (!settings) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(settings)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { staffId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { calendarStartHour, calendarEndHour } = parsed.data
  if (calendarStartHour !== undefined && calendarEndHour !== undefined) {
    if (calendarEndHour <= calendarStartHour) {
      return NextResponse.json({ error: '结束时间必须晚于开始时间' }, { status: 400 })
    }
  }

  const data: Record<string, unknown> = { ...parsed.data }
  if ('openUntil' in parsed.data) {
    data.openUntil = parsed.data.openUntil ? new Date(parsed.data.openUntil) : null
  }

  const settings = await prisma.staffSettings.upsert({
    where: { staffId: params.staffId },
    update: data,
    create: { staffId: params.staffId, ...data },
  })

  return NextResponse.json(settings)
}
