import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkConflict } from '@/lib/conflict'
import { notifyBookingCancelled, notifyBookingConfirmed } from '@/lib/notifications'
import { addMinutes } from 'date-fns'
import { z } from 'zod'

const updateSchema = z.object({
  startTime: z.string().datetime().optional(),
  timeBlockId: z.string().optional(),
  status: z.enum(['CONFIRMED', 'PENDING', 'CANCELLED']).optional(),
  notes: z.string().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.appointment.findUnique({
    where: { id: params.id },
    include: { timeBlock: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { startTime, timeBlockId, status, notes } = parsed.data

  // If rescheduling, check conflict
  if (startTime) {
    const timeBlock = timeBlockId
      ? await prisma.timeBlock.findUnique({ where: { id: timeBlockId } })
      : existing.timeBlock

    if (!timeBlock) return NextResponse.json({ error: 'Time block not found' }, { status: 404 })

    const settings = await prisma.staffSettings.findUnique({
      where: { staffId: existing.staffId },
    })

    const newStart = new Date(startTime)
    const newEnd = addMinutes(newStart, timeBlock.durationMins)
    const bufferMinutes = settings?.bufferMinutes ?? 0
    const endWithBuffer = addMinutes(newEnd, bufferMinutes)

    const conflict = await checkConflict(existing.staffId, newStart, endWithBuffer, params.id)
    if (conflict) {
      return NextResponse.json(
        {
          error: 'TIME_CONFLICT',
          conflicting: {
            startTime: conflict.conflictingAppointment.startTime.toISOString(),
            endTime: conflict.conflictingAppointment.endTime.toISOString(),
            clientName: conflict.conflictingAppointment.clientName,
          },
        },
        { status: 409 }
      )
    }

    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        startTime: newStart,
        endTime: newEnd,
        timeBlockId: timeBlockId ?? existing.timeBlockId,
        status: status ?? existing.status,
        notes: notes ?? existing.notes,
      },
    })

    if (status === 'CONFIRMED' && existing.status !== 'CONFIRMED') {
      await notifyBookingConfirmed(updated)
    }
    if (status === 'CANCELLED' && existing.status !== 'CANCELLED') {
      await notifyBookingCancelled(updated)
    }

    return NextResponse.json(updated)
  }

  const updated = await prisma.appointment.update({
    where: { id: params.id },
    data: {
      timeBlockId: timeBlockId ?? existing.timeBlockId,
      status: status ?? existing.status,
      notes: notes ?? existing.notes,
    },
  })

  if (status === 'CONFIRMED' && existing.status !== 'CONFIRMED') {
    await notifyBookingConfirmed(updated)
  }
  if (status === 'CANCELLED' && existing.status !== 'CANCELLED') {
    await notifyBookingCancelled(updated)
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.appointment.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.appointment.update({
    where: { id: params.id },
    data: { status: 'CANCELLED' },
  })

  await notifyBookingCancelled(existing)

  return NextResponse.json({ success: true })
}
