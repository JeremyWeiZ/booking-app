import { prisma } from '@/lib/prisma'

export interface ConflictResult {
  conflictingAppointment: {
    id: string
    startTime: Date
    endTime: Date
    clientName: string
  }
}

/**
 * Returns null if no conflict, or { conflictingAppointment } if conflict found.
 * endTime should already include buffer: appointment.endTime + bufferMinutes
 */
export async function checkConflict(
  staffId: string,
  startTime: Date,
  endTime: Date,
  excludeAppointmentId?: string
): Promise<ConflictResult | null> {
  const conflict = await prisma.appointment.findFirst({
    where: {
      staffId,
      status: { not: 'CANCELLED' },
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      OR: [
        // New appointment starts during existing appointment
        { startTime: { lt: endTime }, endTime: { gt: startTime } },
      ],
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      clientName: true,
    },
  })

  if (!conflict) return null

  return { conflictingAppointment: conflict }
}
