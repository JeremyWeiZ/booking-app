// Shared constants for calendar grid and tile sizing
export const SLOT_HEIGHT = 20   // px per 15-min slot in the calendar grid
export const HOUR_HEIGHT = SLOT_HEIGHT * 4  // 80px per hour

// Full-size tile sizing (used while dragging over calendar)
export const TILE_MIN_SLOT_HEIGHT = SLOT_HEIGHT  // px per 15-min unit
export const TILE_BASE_HEIGHT = TILE_MIN_SLOT_HEIGHT * 4  // 80px for a 60-min tile

// Compact tray tile sizing
export const TRAY_TILE_SLOT_HEIGHT = 14  // roughly half of full-size
export const TRAY_TILE_MIN_HEIGHT = 32
export const TRAY_TILE_MAX_HEIGHT = (120 / 15) * TRAY_TILE_SLOT_HEIGHT // cap tray tiles at 2h visual height

export function getTileHeightPx(durationMins: number): number {
  return Math.max(SLOT_HEIGHT, (durationMins / 15) * TILE_MIN_SLOT_HEIGHT)
}

export function getTrayTileHeightPx(durationMins: number): number {
  const raw = (durationMins / 15) * TRAY_TILE_SLOT_HEIGHT
  return Math.min(TRAY_TILE_MAX_HEIGHT, Math.max(TRAY_TILE_MIN_HEIGHT, raw))
}

export function getAppointmentHeightPx(durationMins: number): number {
  return Math.max(SLOT_HEIGHT, (durationMins / 15) * SLOT_HEIGHT)
}

export function getAppointmentTopPx(
  startHour: number,
  startMinute: number,
  calendarStartHour: number
): number {
  const offsetMins = (startHour - calendarStartHour) * 60 + startMinute
  return (offsetMins / 15) * SLOT_HEIGHT
}

// Cell ID encoding — use pipe to avoid collision with date dashes
export function makeCellId(date: string, hour: number, quarter: number): string {
  return `${date}|${hour}|${quarter}`
}

export function parseCellId(cellId: string): { date: string; hour: number; quarter: number } {
  const parts = cellId.split('|')
  return {
    date: parts[0],
    hour: parseInt(parts[1]),
    quarter: parseInt(parts[2]),
  }
}

export function quarterToMinutes(hour: number, quarter: number): number {
  return hour * 60 + quarter * 15
}

export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function isMultipleOf15(timeStr: string): boolean {
  const parts = timeStr.split(':')
  const minutes = parseInt(parts[1] ?? '0')
  return minutes % 15 === 0
}
