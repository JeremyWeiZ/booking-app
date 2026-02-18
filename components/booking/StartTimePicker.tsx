'use client'

import { useState } from 'react'
import BottomSheet from '@/components/ui/BottomSheet'
import { cn } from '@/lib/utils'

interface StartTimePickerProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (time: string) => void
  date: string // YYYY-MM-DD
  hour: number
  availableStartTimes: string[]
}

export default function StartTimePicker({
  isOpen,
  onClose,
  onConfirm,
  date,
  hour,
  availableStartTimes,
}: StartTimePickerProps) {
  const [selected, setSelected] = useState<string | null>(
    availableStartTimes[0] ?? null
  )

  const handleConfirm = () => {
    if (selected) {
      onConfirm(selected)
    }
  }

  const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('zh-CN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="选择开始时间">
      <div className="px-4 py-2">
        <p className="text-sm text-gray-500 mb-4">
          {dayLabel} · {hour}:00 时段
        </p>

        {availableStartTimes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">该时段暂无可用时间</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 mb-6">
            {availableStartTimes.map((time) => (
              <button
                key={time}
                onClick={() => setSelected(time)}
                className={cn(
                  'py-3 rounded-xl text-sm font-medium border transition-colors min-h-[44px]',
                  selected === time
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                )}
              >
                {time}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 pb-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium min-h-[44px]"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || availableStartTimes.length === 0}
            className={cn(
              'flex-1 py-3 rounded-xl font-medium min-h-[44px]',
              selected && availableStartTimes.length > 0
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            确认 →
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
