'use client'

import DraggableTimeBlock, { TimeBlockData } from './DraggableTimeBlock'
import { cn } from '@/lib/utils'

interface TimeBlockTrayProps {
  blocks: TimeBlockData[]
  draggingBlockId: string | null
  isCollapsed: boolean
}

export default function TimeBlockTray({ blocks, draggingBlockId, isCollapsed }: TimeBlockTrayProps) {
  if (blocks.length === 0) {
    return (
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3',
          'transition-transform duration-200',
          isCollapsed ? 'translate-y-full' : 'translate-y-0'
        )}
      >
        <p className="text-sm text-gray-400 text-center">暂无可用服务项目</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200',
        'transition-transform duration-200 z-10',
        isCollapsed ? 'translate-y-full' : 'translate-y-0'
      )}
    >
      <div className="px-3 pt-2 pb-1">
        <p className="text-xs text-gray-500 font-medium mb-2">选择服务（长按拖拽到日历）</p>
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
          {blocks.map((block) => (
            <DraggableTimeBlock
              key={block.id}
              block={block}
              isDragging={draggingBlockId === `block-${block.id}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
