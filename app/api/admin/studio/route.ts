import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().nullable().optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studio = await prisma.studio.findFirst()
  if (!studio) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(studio)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  let studio = await prisma.studio.findFirst()
  if (!studio) {
    studio = await prisma.studio.create({
      data: { name: parsed.data.name ?? '工作室', brandColor: parsed.data.brandColor ?? '#6366f1' },
    })
  } else {
    studio = await prisma.studio.update({
      where: { id: studio.id },
      data: parsed.data,
    })
  }

  return NextResponse.json(studio)
}
