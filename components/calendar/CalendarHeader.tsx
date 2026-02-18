'use client'

import { format, addDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useState } from 'react'
import MiniCalendar from './MiniCalendar'
import { cn } from '@/lib/utils'

interface CalendarHeaderProps {
  weekStart: Date // Monday of the displayed week
  onPrevWeek: () => void
  onNextWeek: () => void
  onSelectDate: (date: Date) => void
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

export default function CalendarHeader({
  weekStart,
  onPrevWeek,
  onNextWeek,
  onSelectDate,
}: CalendarHeaderProps) {
  const [showMiniCal, setShowMiniCal] = useState(false)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekEnd = addDays(weekStart, 6)
  const headerLabel = `${format(weekStart, 'yyyy年 MMM dd', { locale: zhCN })} – ${format(weekEnd, 'dd日', { locale: zhCN })}`

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
      {/* Week navigation row */}
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        <button
          onClick={onPrevWeek}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="上一周"
        >
          ‹
        </button>

        <button
          onClick={() => setShowMiniCal(!showMiniCal)}
          className="text-xs sm:text-sm font-medium text-gray-800 hover:text-indigo-600 transition-colors truncate"
        >
          {headerLabel}
        </button>

        <button
          onClick={onNextWeek}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="下一周"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[32px_repeat(7,1fr)] sm:grid-cols-[48px_repeat(7,1fr)] border-t border-gray-100">
        <div /> {/* Time column spacer */}
        {days.map((day, i) => {
          const isToday = day.getTime() === today.getTime()
          return (
            <div
              key={i}
              className="flex flex-col items-center py-1.5 text-xs"
            >
              <span className="text-gray-500">{DAY_LABELS[i]}</span>
              <span
                className={cn(
                  'w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full font-medium mt-0.5',
                  isToday
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700'
                )}
              >
                {format(day, 'd')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mini calendar overlay */}
      {showMiniCal && (
        <MiniCalendar
          selectedWeekStart={weekStart}
          onSelectDate={(date) => {
            onSelectDate(date)
            setShowMiniCal(false)
          }}
          onClose={() => setShowMiniCal(false)}
        />
      )}
    </div>
  )
}
