import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkConflict } from '@/lib/conflict'
import { validateAppointmentWindow } from '@/lib/slots'
import { notifyBookingCreated } from '@/lib/notifications'
import { addMinutes } from 'date-fns'

const bodySchema = z.object({
  staffId: z.string().min(1),
  timeBlockId: z.string().min(1),
  startTime: z.string().datetime(),
  clientName: z.string().min(1, '姓名必填'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  wechat: z.string().optional(),
  bookingToken: z.string().optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { staffId, timeBlockId, startTime, clientName, phone, email, wechat, bookingToken } = parsed.data

  // Validate at least one contact field
  if (!phone && !email && !wechat) {
    return NextResponse.json({ error: '请至少填写一种联系方式' }, { status: 400 })
  }

  const [timeBlock, settings] = await Promise.all([
    prisma.timeBlock.findUnique({ where: { id: timeBlockId } }),
    prisma.staffSettings.findUnique({ where: { staffId } }),
  ])

  if (!timeBlock) {
    return NextResponse.json({ error: '服务项目不存在' }, { status: 404 })
  }

  const startDate = new Date(startTime)
  const endDate = addMinutes(startDate, timeBlock.durationMins)
  const bufferMinutes = settings?.bufferMinutes ?? 0
  const endWithBuffer = addMinutes(endDate, bufferMinutes)

  // Validate appointment window is within working hours
  const windowValid = await validateAppointmentWindow(staffId, startDate, endDate)
  if (!windowValid) {
    return NextResponse.json(
      { error: '预约时间段超出工作时间范围，请选择其他时间' },
      { status: 422 }
    )
  }

  // Conflict check
  const conflict = await checkConflict(staffId, startDate, endWithBuffer)
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

  // Determine appointment status based on schedule rule slot type
  // We'll check the slot type for the given time to decide CONFIRMED vs PENDING
  const scheduleRule = await prisma.scheduleRule.findFirst({
    where: {
      staffId,
      dayOfWeek: startDate.getDay(),
    },
  })

  const appointmentStatus =
    scheduleRule?.slotType === 'PENDING_CONFIRM' ? 'PENDING' : 'CONFIRMED'

  // Mark booking token as used
  if (bookingToken) {
    await prisma.bookingToken.updateMany({
      where: { token: bookingToken, usedAt: null },
      data: { usedAt: new Date() },
    })
  }

  const appointment = await prisma.appointment.create({
    data: {
      staffId,
      timeBlockId,
      clientName,
      phone: phone || null,
      email: email || null,
      wechat: wechat || null,
      startTime: startDate,
      endTime: endDate,
      status: appointmentStatus,
      bookingToken: bookingToken || null,
    },
  })

  await notifyBookingCreated(appointment)

  return NextResponse.json(appointment, { status: 201 })
}
