import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  durationMins: z.number().int().min(1).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const block = await prisma.timeBlock.update({
    where: { id: params.id },
    data: parsed.data,
  })
  return NextResponse.json(block)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if time block has appointments
  const apptCount = await prisma.appointment.count({
    where: { timeBlockId: params.id, status: { not: 'CANCELLED' } },
  })

  if (apptCount > 0) {
    // Soft-deactivate only
    const block = await prisma.timeBlock.update({
      where: { id: params.id },
      data: { isActive: false },
    })
    return NextResponse.json({ ...block, warning: '该服务项目有未完成的预约，已设为不可用' })
  }

  await prisma.timeBlock.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
