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

function getTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '')
  if (hex.length !== 6) return '#111827'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.65 ? '#111827' : '#ffffff'
}

function TileBody({
  block,
  height,
  slotHeight,
  isOverlay,
}: {
  block: TimeBlockData
  height: number
  slotHeight: number
  isOverlay: boolean
}) {
  const hourDividerCount = Math.floor(block.durationMins / 60) - 1
  const isCompactShort = !isOverlay && block.durationMins <= 30
  const textColor = getTextColor(block.color)
  const dividerPositions = Array.from(
    { length: Math.max(0, hourDividerCount) },
    (_, i) => (i + 1) * 4 * slotHeight // every 60min
  )

  return (
    <div
      className="relative rounded-xl overflow-hidden flex-shrink-0 shadow-md select-none"
      style={{ height, width: 80, backgroundColor: block.color }}
    >
      {/* Hour dividers (for 2h+ tiles) */}
      {dividerPositions.map((pos) => (
        <div
          key={pos}
          className="absolute left-0 right-0 border-t border-white/30"
          style={{ top: pos }}
        />
      ))}

      {/* Label */}
      <div
        className={cn(
          'absolute inset-0 px-2',
          isCompactShort ? 'flex flex-col items-center justify-center text-center' : 'flex flex-col justify-end pb-1.5'
        )}
      >
        <p
          className="text-[11px] font-semibold truncate leading-tight"
          style={{ color: textColor }}
        >
          {block.name}
        </p>
        <p
          className="text-[10px] leading-tight"
          style={{ color: textColor, opacity: 0.92 }}
        >
          {block.durationMins}min
        </p>
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
    return <TileBody block={block} height={height} slotHeight={slotHeight} isOverlay />
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
      <TileBody block={block} height={height} slotHeight={slotHeight} isOverlay={false} />
    </div>
  )
}
