import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  staffId: z.string().min(1),
  name: z.string().min(1),
  durationMins: z.number().int().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  isActive: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const staffId = new URL(req.url).searchParams.get('staffId')
  if (!staffId) return NextResponse.json({ error: 'staffId required' }, { status: 400 })

  const blocks = await prisma.timeBlock.findMany({
    where: { staffId },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(blocks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const block = await prisma.timeBlock.create({ data: parsed.data })
  return NextResponse.json(block, { status: 201 })
}
