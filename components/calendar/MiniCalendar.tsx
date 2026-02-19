'use client'

import { useState } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameWeek, isToday } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface MiniCalendarProps {
  selectedWeekStart: Date
  onSelectDate: (date: Date) => void
  onClose: () => void
  lang?: 'zh' | 'en'
}

export default function MiniCalendar({ selectedWeekStart, onSelectDate, onClose, lang = 'zh' }: MiniCalendarProps) {
  const isEn = lang === 'en'
  const locale = isEn ? enUS : zhCN
  const [viewMonth, setViewMonth] = useState(selectedWeekStart)

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  return (
    <div className="absolute top-full left-0 right-0 bg-white shadow-xl border border-gray-200 z-30">
      {/* Backdrop */}
      <div className="fixed inset-0 z-[-1]" onClick={onClose} />

      <div className="p-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setViewMonth(subMonths(viewMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-gray-800">
            {isEn
              ? format(viewMonth, 'MMMM yyyy', { locale })
              : format(viewMonth, 'yyyy年 MM月', { locale })}
          </span>
          <button
            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            ›
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {(isEn ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['一', '二', '三', '四', '五', '六', '日']).map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((day) => {
            const inCurrentWeek = isSameWeek(day, selectedWeekStart, { weekStartsOn: 1 })
            const inCurrentMonth = isSameMonth(day, viewMonth)
            const isCurrentDay = isToday(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelectDate(day)}
                className={cn(
                  'h-8 w-full text-xs rounded transition-colors',
                  inCurrentMonth ? 'text-gray-800' : 'text-gray-300',
                  inCurrentWeek && inCurrentMonth ? 'bg-indigo-50' : '',
                  isCurrentDay ? 'font-bold text-indigo-600' : '',
                  'hover:bg-indigo-100'
                )}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
