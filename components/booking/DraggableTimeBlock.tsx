'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'

export interface TimeBlockData {
  id: string
  name: string
  nameEn?: string | null
  durationMins: number
  color: string
}

interface DraggableTimeBlockProps {
  block: TimeBlockData
  isDragging?: boolean
}

export default function DraggableTimeBlock({ block, isDragging }: DraggableTimeBlockProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `block-${block.id}`,
    data: { block },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 rounded-full bg-white border border-gray-200',
        'shadow-sm cursor-grab active:cursor-grabbing select-none',
        'min-h-[44px] transition-opacity duration-150 whitespace-nowrap',
        isDragging ? 'opacity-40' : 'opacity-100 hover:shadow-md hover:border-gray-300'
      )}
    >
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: block.color }}
      />
      <span className="text-sm font-medium text-gray-800">{block.name}</span>
      <span className="text-xs text-gray-500">{block.durationMins}min</span>
    </div>
  )
}
