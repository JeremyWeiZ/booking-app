import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { format, addMinutes, parseISO, addDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { SlotType } from '@prisma/client'
import { makeCellId } from '@/lib/calendarConstants'

export interface SlotQuarter {
  date: string     // YYYY-MM-DD in staff timezone
  hour: number     // 0-23
  quarter: number  // 0-3 (representing :00, :15, :30, :45)
  slotType: SlotType | 'BOOKED'
  cellId: string   // makeCellId(date, hour, quarter)
}

function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Compute 15-minute slot cells for a staff member's week.
 * weekStart: YYYY-MM-DD (Monday of the displayed week, local interpretation)
 */
export async function computeWeekSlots(
  staffId: string,
  weekStart: string
): Promise<SlotQuarter[]> {
  const [settings, scheduleRules, appointments] = await Promise.all([
    prisma.staffSettings.findUnique({ where: { staffId } }),
    prisma.scheduleRule.findMany({ where: { staffId } }),
    prisma.appointment.findMany({
      where: { staffId, status: { not: 'CANCELLED' } },
      select: { startTime: true, endTime: true },
    }),
  ])

  const timezone = settings?.timezone ?? 'Asia/Shanghai'
  const bufferMinutes = settings?.bufferMinutes ?? 0
  const calendarStartHour = settings?.calendarStartHour ?? 8
  const calendarEndHour = settings?.calendarEndHour ?? 22
  const openUntil = settings?.openUntil ?? null

  const weekStartLocal = parseISO(weekStart)
  const cells: SlotQuarter[] = []

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dayDate = addDays(weekStartLocal, dayOffset)
    const dateStr = format(dayDate, 'yyyy-MM-dd')
    // weekStart is Monday (offset 0 = Mon = dayOfWeek 1)
    const dayOfWeek = (dayOffset + 1) % 7
    const dayRules = scheduleRules.filter((r) => r.dayOfWeek === dayOfWeek)

    for (let hour = calendarStartHour; hour < calendarEndHour; hour++) {
      for (let quarter = 0; quarter < 4; quarter++) {
        const slotMinutes = hour * 60 + quarter * 15
        const slotTimeStr = minutesToTimeString(slotMinutes)

        // 1. Determine base slot type from schedule rules
        let baseSlotType: SlotType = SlotType.UNAVAILABLE
        for (const rule of dayRules) {
          const ruleStart = timeStringToMinutes(rule.startTime)
          const ruleEnd = timeStringToMinutes(rule.endTime)
          if (slotMinutes >= ruleStart && slotMinutes < ruleEnd) {
            if (rule.slotType === SlotType.AVAILABLE) {
              baseSlotType = SlotType.AVAILABLE
              break
            } else if (
              rule.slotType === SlotType.PENDING_CONFIRM &&
              baseSlotType === SlotType.UNAVAILABLE
            ) {
              baseSlotType = SlotType.PENDING_CONFIRM
            }
          }
        }

        // 2. Check openUntil
        if (openUntil && baseSlotType !== SlotType.UNAVAILABLE) {
          const slotUtc = fromZonedTime(
            new Date(`${dateStr}T${slotTimeStr}:00`),
            timezone
          )
          if (slotUtc >= openUntil) baseSlotType = SlotType.UNAVAILABLE
        }

        // 3. Check if this 15-min slot is occupied by an appointment (including buffer)
        let finalSlotType: SlotType | 'BOOKED' = baseSlotType
        if (baseSlotType !== SlotType.UNAVAILABLE) {
          const slotStartUtc = fromZonedTime(
            new Date(`${dateStr}T${slotTimeStr}:00`),
            timezone
          )
          const slotEndUtc = addMinutes(slotStartUtc, 15)

          const blocked = appointments.some((appt) => {
            const apptEndWithBuffer = addMinutes(appt.endTime, bufferMinutes)
            return slotStartUtc < apptEndWithBuffer && slotEndUtc > appt.startTime
          })

          if (blocked) finalSlotType = 'BOOKED'
        }

        cells.push({
          date: dateStr,
          hour,
          quarter,
          slotType: finalSlotType,
          cellId: makeCellId(dateStr, hour, quarter),
        })
      }
    }
  }

  return cells
}

/**
 * Validate that the entire appointment window [startTime, endTime] is covered
 * by AVAILABLE or PENDING_CONFIRM schedule rules in the staff's timezone.
 */
export async function validateAppointmentWindow(
  staffId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const [settings, scheduleRules] = await Promise.all([
    prisma.staffSettings.findUnique({ where: { staffId } }),
    prisma.scheduleRule.findMany({ where: { staffId } }),
  ])

  const timezone = settings?.timezone ?? 'Asia/Shanghai'

  const startZoned = toZonedTime(startTime, timezone)
  const endZoned = toZonedTime(endTime, timezone)

  const startDateStr = format(startZoned, 'yyyy-MM-dd')
  const endDateStr = format(endZoned, 'yyyy-MM-dd')

  // For simplicity, we only support same-day appointments
  if (startDateStr !== endDateStr) return false

  const dayOfWeek = startZoned.getDay()
  const dayRules = scheduleRules.filter((r) => r.dayOfWeek === dayOfWeek)

  const startMinutes = startZoned.getHours() * 60 + startZoned.getMinutes()
  const endMinutes = endZoned.getHours() * 60 + endZoned.getMinutes()

  // Check every 15-min slice within the appointment window
  for (let m = startMinutes; m < endMinutes; m += 15) {
    const inRule = dayRules.some((rule) => {
      const ruleStart = timeStringToMinutes(rule.startTime)
      const ruleEnd = timeStringToMinutes(rule.endTime)
      return (
        m >= ruleStart &&
        m < ruleEnd &&
        (rule.slotType === SlotType.AVAILABLE ||
          rule.slotType === SlotType.PENDING_CONFIRM)
      )
    })
    if (!inRule) return false
  }

  return true
}
