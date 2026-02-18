import ical, { ICalEventStatus } from 'ical-generator'
import { prisma } from '@/lib/prisma'

export async function buildICalForStaff(
  staffId: string,
  start: Date,
  end: Date
): Promise<string> {
  const [staff, appointments] = await Promise.all([
    prisma.staff.findUnique({
      where: { id: staffId },
      include: { studio: true },
    }),
    prisma.appointment.findMany({
      where: {
        staffId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        startTime: { gte: start },
        endTime: { lte: end },
      },
      include: { timeBlock: true },
    }),
  ])

  const calendar = ical({
    name: staff?.studio?.name ?? 'Booking Calendar',
    timezone: 'UTC',
  })

  for (const appt of appointments) {
    const contactParts = [
      appt.phone ? `📱 ${appt.phone}` : '',
      appt.email ? `✉ ${appt.email}` : '',
      appt.wechat ? `💬 ${appt.wechat}` : '',
    ].filter(Boolean)

    calendar.createEvent({
      id: appt.id,
      start: appt.startTime,
      end: appt.endTime,
      summary: `${appt.clientName} - ${appt.timeBlock.name}`,
      description: [
        `客户: ${appt.clientName}`,
        `服务: ${appt.timeBlock.name} (${appt.timeBlock.durationMins}min)`,
        `联系: ${contactParts.join(' ')}`,
        appt.notes ? `备注: ${appt.notes}` : '',
        `状态: ${appt.status === 'CONFIRMED' ? '已确认' : '待确认'}`,
      ]
        .filter(Boolean)
        .join('\n'),
      status: appt.status === 'CONFIRMED' ? ICalEventStatus.CONFIRMED : ICalEventStatus.TENTATIVE,
    })
  }

  return calendar.toString()
}
