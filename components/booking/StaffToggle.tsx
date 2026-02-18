'use client'

import { cn } from '@/lib/utils'

interface Staff {
  id: string
  name: string
  avatarUrl?: string | null
}

interface StaffToggleProps {
  staffList: Staff[]
  selectedId: string
  onChange: (staffId: string) => void
}

export default function StaffToggle({ staffList, selectedId, onChange }: StaffToggleProps) {
  if (staffList.length <= 1) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 px-4 scrollbar-none">
      {staffList.map((staff) => (
        <button
          key={staff.id}
          onClick={() => onChange(staff.id)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium',
            'border transition-colors min-h-[44px]',
            selectedId === staff.id
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
          )}
        >
          {staff.avatarUrl ? (
            <img src={staff.avatarUrl} alt={staff.name} className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
              {staff.name.charAt(0)}
            </div>
          )}
          {staff.name}
        </button>
      ))}
    </div>
  )
}
