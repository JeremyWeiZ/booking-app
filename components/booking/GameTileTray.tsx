'use client'

import GameTile, { TimeBlockData } from './GameTile'
import { cn } from '@/lib/utils'

interface GameTileTrayProps {
  blocks: TimeBlockData[]
  draggingBlockId: string | null
  isCollapsed: boolean
  lang?: 'zh' | 'en'
}

export default function GameTileTray({ blocks, draggingBlockId, isCollapsed, lang = 'zh' }: GameTileTrayProps) {
  const isEn = lang === 'en'
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10 max-h-[28dvh]',
        'transition-transform duration-200',
        isCollapsed ? 'translate-y-full' : 'translate-y-0'
      )}
    >
      <div className="px-4 pt-2 pb-3 max-h-[28dvh] overflow-y-auto">
        <p className="text-xs text-gray-500 font-medium mb-2">
          {isEn
            ? 'Please place the service you need to book into your desired time slot'
            : '请将需要预约的项目放入您需要预约的时间段内'}
        </p>
        {blocks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">暂无可用服务项目</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none items-end">
            {blocks.map((block) => (
              <GameTile
                key={block.id}
                block={block}
                isDimmed={draggingBlockId === `block-${block.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
