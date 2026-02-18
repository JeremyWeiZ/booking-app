import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  staffId: z.string().optional(),
  timeBlockId: z.string().optional(),
  clientName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  wechat: z.string().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tokens = await prisma.bookingToken.findMany({
    include: { staff: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(tokens)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const data = {
    staffId: parsed.data.staffId || null,
    timeBlockId: parsed.data.timeBlockId || null,
    clientName: parsed.data.clientName || null,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    wechat: parsed.data.wechat || null,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
  }

  const tokenRecord = await prisma.bookingToken.create({ data, include: { staff: true } })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const bookingUrl = `${appUrl}/book?token=${tokenRecord.token}`

  return NextResponse.json({ ...tokenRecord, bookingUrl }, { status: 201 })
}
