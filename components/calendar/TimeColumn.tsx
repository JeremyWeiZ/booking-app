import { HOUR_HEIGHT } from '@/lib/calendarConstants'
import { formatHourLabelInTimezone } from '@/lib/timezone'

interface TimeColumnProps {
  startHour: number
  endHour: number
  timezone: string
}

export default function TimeColumn({ startHour, endHour, timezone }: TimeColumnProps) {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)

  return (
    <div className="flex flex-col w-12 flex-shrink-0">
      {hours.map((hour) => (
        <div
          key={hour}
          className="relative flex-shrink-0"
          style={{ height: HOUR_HEIGHT }}
        >
          {hour % 2 === 0 ? (
            <span className="absolute top-0 right-2 text-[10px] text-gray-400 leading-none pt-0.5">
              {formatHourLabelInTimezone(hour, timezone)}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}
