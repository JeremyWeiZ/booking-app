export function formatHourLabelInTimezone(hour: number, timezone: string): string {
  const normalizedHour = ((hour % 24) + 24) % 24
  // Labels represent configured calendar hours, independent from browser locale.
  // The timezone argument is kept so callers always pass explicit timezone context.
  void timezone
  if (normalizedHour === 0) return '12am'
  if (normalizedHour < 12) return `${normalizedHour}am`
  if (normalizedHour === 12) return '12pm'
  return `${normalizedHour - 12}pm`
}
