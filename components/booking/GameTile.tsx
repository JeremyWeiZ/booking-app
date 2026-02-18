'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { getTileHeightPx, getTrayTileHeightPx, SLOT_HEIGHT, TRAY_TILE_SLOT_HEIGHT } from '@/lib/calendarConstants'
import { cn } from '@/lib/utils'

export interface TimeBlockData {
  id: string
  name: string
  durationMins: number
  color: string
}

interface GameTileProps {
  block: TimeBlockData
  isOverlay?: boolean
  isDimmed?: boolean
}

function TileBody({
  block,
  height,
  slotHeight,
}: {
  block: TimeBlockData
  height: number
  slotHeight: number
}) {
  const hourDividerCount = Math.floor(block.durationMins / 60) - 1
  const dividerPositions = Array.from(
    { length: Math.max(0, hourDividerCount) },
    (_, i) => (i + 1) * 4 * slotHeight // every 60min
  )

  return (
    <div
      className="relative rounded-xl overflow-hidden flex-shrink-0 shadow-md select-none"
      style={{ height, width: 80, backgroundColor: block.color }}
    >
      {/* Glossy top sheen */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-white/20 rounded-t-xl" />

      {/* Hour dividers (for 2h+ tiles) */}
      {dividerPositions.map((pos) => (
        <div
          key={pos}
          className="absolute left-0 right-0 border-t-2 border-white/40"
          style={{ top: pos }}
        />
      ))}

      {/* Name at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-black/25">
        <p className="text-white text-[11px] font-semibold truncate leading-tight">{block.name}</p>
        <p className="text-white/80 text-[10px]">{block.durationMins}min</p>
      </div>
    </div>
  )
}

export default function GameTile({ block, isOverlay, isDimmed }: GameTileProps) {
  const height = isOverlay ? getTileHeightPx(block.durationMins) : getTrayTileHeightPx(block.durationMins)
  const slotHeight = isOverlay ? SLOT_HEIGHT : TRAY_TILE_SLOT_HEIGHT

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block-${block.id}`,
    data: { block },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform), touchAction: 'none' }
    : { touchAction: 'none' }

  if (isOverlay) {
    return <TileBody block={block} height={height} slotHeight={slotHeight} />
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-opacity duration-150',
        (isDragging || isDimmed) ? 'opacity-30' : 'opacity-100'
      )}
    >
      <TileBody block={block} height={height} slotHeight={slotHeight} />
    </div>
  )
}
