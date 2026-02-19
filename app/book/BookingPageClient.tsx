'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core'
import { format, addDays, startOfWeek, addMinutes } from 'date-fns'
import CalendarHeader from '@/components/calendar/CalendarHeader'
import BookingForm from '@/components/booking/BookingForm'
import StaffToggle from '@/components/booking/StaffToggle'
import Legend from '@/components/ui/Legend'
import BottomSheet from '@/components/ui/BottomSheet'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { TimeBlockData } from '@/components/booking/DraggableTimeBlock'
import GameTile from '@/components/booking/GameTile'
import GameTileTray from '@/components/booking/GameTileTray'
import TimeColumn from '@/components/calendar/TimeColumn'
import {
  SLOT_HEIGHT,
  makeCellId,
  parseCellId,
  minutesToTimeString,
  getTrayTileHeightPx,
} from '@/lib/calendarConstants'

interface StaffData {
  id: string
  name: string
  avatarUrl: string | null
  settings: {
    timezone: string
    bufferMinutes: number
    calendarStartHour: number
    calendarEndHour: number
  } | null
}

interface SlotQuarter {
  date: string
  hour: number
  quarter: number
  slotType: 'AVAILABLE' | 'PENDING_CONFIRM' | 'UNAVAILABLE' | 'BOOKED'
  cellId: string
}

interface BookingState {
  staffId: string
  staffName: string
  block: TimeBlockData
  date: string
  hour: number
  quarter: number
  startTimeStr: string // "HH:mm"
}

interface StudioData {
  name: string
  logoUrl: string | null
  brandColor: string | null
}

type BookingStep = 'calendar' | 'form' | 'success' | 'pending'

// ---------- Quarter drop cell ----------
function QuarterCell({
  cellId,
  slotType,
  canDrop,
  isHighlighted,
  isHighlightValid,
  isHourStart,
  isHalfHour,
  isBookedStart,
  isBookedEnd,
  showBookedLabel,
  bookedLabel,
}: {
  cellId: string
  slotType: SlotQuarter['slotType']
  canDrop: boolean
  isHighlighted: boolean
  isHighlightValid: boolean
  isHourStart: boolean
  isHalfHour: boolean
  isBookedStart: boolean
  isBookedEnd: boolean
  showBookedLabel: boolean
  bookedLabel: string
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: { cellId },
    disabled: !canDrop,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ height: SLOT_HEIGHT }}
      className={cn(
        'relative transition-colors duration-75',
        isHourStart && 'border-t border-gray-200',
        !isHourStart && isHalfHour && 'border-t border-gray-100',
        !isHourStart && !isHalfHour && 'border-t border-gray-50',
        slotType === 'AVAILABLE' && !isHighlighted && 'bg-white',
        slotType === 'PENDING_CONFIRM' && !isHighlighted && 'bg-yellow-50',
        slotType === 'UNAVAILABLE' && 'bg-gray-100',
        slotType === 'BOOKED' && !isHighlighted && 'bg-gray-200/60',
        slotType === 'BOOKED' && isBookedStart && 'rounded-t-md',
        slotType === 'BOOKED' && isBookedEnd && 'rounded-b-md',
        isHighlighted && isHighlightValid && 'bg-green-50',
        isHighlighted && !isHighlightValid && 'bg-red-50',
        isOver && canDrop && isHighlightValid && 'ring-1 ring-green-400',
        isOver && (!canDrop || !isHighlightValid) && 'ring-1 ring-red-400',
      )}
    >
      {isHighlighted && (
        <div
          className={cn(
            'absolute inset-0 border-2 border-dashed pointer-events-none',
            isHighlightValid ? 'border-green-400' : 'border-red-400'
          )}
        />
      )}
      {slotType === 'BOOKED' && showBookedLabel && (
        <span className="absolute left-1 top-0.5 text-[10px] text-gray-600 font-medium">
          {bookedLabel}
        </span>
      )}
    </div>
  )
}

export default function BookingPageClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tokenParam = searchParams.get('token')
  const langParam = searchParams.get('lang')
  const lang = langParam === 'en' ? 'en' : 'zh'
  const isEn = lang === 'en'

  const [studio, setStudio] = useState<StudioData | null>(null)
  const [staffList, setStaffList] = useState<StaffData[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockData[]>([])
  const [slots, setSlots] = useState<SlotQuarter[]>([])
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [draggingBlock, setDraggingBlock] = useState<TimeBlockData | null>(null)
  const [activeCellId, setActiveCellId] = useState<string | null>(null)
  const [bookingState, setBookingState] = useState<BookingState | null>(null)
  const [step, setStep] = useState<BookingStep>('calendar')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [prefillData, setPrefillData] = useState<Record<string, string>>({})
  const [prefillTimeBlockId, setPrefillTimeBlockId] = useState<string | null>(null)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const { toasts, addToast, dismiss } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  )

  useEffect(() => {
    fetch('/api/studio', { cache: 'no-store' }).then((r) => r.json()).then(setStudio).catch(console.error)
  }, [])

  useEffect(() => {
    fetch('/api/staff', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: StaffData[]) => {
        setStaffList(data)
        if (data.length > 0) setSelectedStaffId(data[0].id)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!tokenParam) return
    fetch(`/api/booking-token/${tokenParam}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setPrefillData(data)
          if (data.staffId) setSelectedStaffId(data.staffId)
          if (data.timeBlockId) setPrefillTimeBlockId(data.timeBlockId)
        }
      })
      .catch(console.error)
  }, [tokenParam])

  useEffect(() => {
    if (!selectedStaffId) return
    fetch(`/api/time-blocks?staffId=${selectedStaffId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setTimeBlocks)
      .catch(console.error)
  }, [selectedStaffId])

  useEffect(() => {
    if (!selectedStaffId) return
    setIsLoadingSlots(true)
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    fetch(`/api/slots?staffId=${selectedStaffId}&weekStart=${weekStartStr}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => { setSlots(data); setIsLoadingSlots(false) })
      .catch(() => setIsLoadingSlots(false))
  }, [selectedStaffId, weekStart])

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId)
  const calendarStartHour = selectedStaff?.settings?.calendarStartHour ?? 8
  const calendarEndHour = selectedStaff?.settings?.calendarEndHour ?? 22
  const timezone = selectedStaff?.settings?.timezone ?? 'Asia/Shanghai'

  // Build slot lookup map
  const slotMap = useMemo(
    () => new Map(slots.map((s) => [s.cellId, s])),
    [slots]
  )

  // Determine which cells are valid drop targets given a block's duration
  const validDropCells = useMemo(() => {
    if (!draggingBlock) return new Set<string>()
    const durationSlots = Math.ceil(draggingBlock.durationMins / 15)
    const valid = new Set<string>()
    for (const [cellId, cell] of Array.from(slotMap)) {
      if (cell.slotType === 'UNAVAILABLE' || cell.slotType === 'BOOKED') continue
      let ok = true
      const { date, hour, quarter } = parseCellId(cellId)
      for (let i = 0; i < durationSlots; i++) {
        const totalQ = hour * 4 + quarter + i
        const h = Math.floor(totalQ / 4)
        const q = totalQ % 4
        const futureCell = slotMap.get(makeCellId(date, h, q))
        if (!futureCell || futureCell.slotType === 'UNAVAILABLE' || futureCell.slotType === 'BOOKED') {
          ok = false; break
        }
      }
      if (ok) valid.add(cellId)
    }
    return valid
  }, [draggingBlock, slotMap])

  // Highlighted cells during drag (the range the appointment would occupy)
  const highlightInfo = useMemo(() => {
    if (!activeCellId || !draggingBlock) return { cells: new Set<string>(), valid: false }
    const { date, hour, quarter } = parseCellId(activeCellId)
    const durationSlots = Math.ceil(draggingBlock.durationMins / 15)
    const cells = new Set<string>()
    let valid = validDropCells.has(activeCellId)
    for (let i = 0; i < durationSlots; i++) {
      const totalQ = hour * 4 + quarter + i
      const h = Math.floor(totalQ / 4)
      const q = totalQ % 4
      cells.add(makeCellId(date, h, q))
    }
    return { cells, valid }
  }, [activeCellId, draggingBlock, validDropCells])

  // The time to display on the drag overlay
  const overlayTimeLabel = useMemo(() => {
    if (!activeCellId || !draggingBlock) return null
    const { hour, quarter } = parseCellId(activeCellId)
    const startMins = hour * 60 + quarter * 15
    const endMins = startMins + draggingBlock.durationMins
    return `${minutesToTimeString(startMins)} – ${minutesToTimeString(endMins)}`
  }, [activeCellId, draggingBlock])

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const handleDragStart = (event: DragStartEvent) => {
    const block = event.active.data.current?.block as TimeBlockData
    setDraggingBlock(block ?? null)
    setActiveCellId(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const over = event.over
    if (over?.data.current?.cellId) {
      setActiveCellId(over.data.current.cellId as string)
    } else {
      setActiveCellId(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event
    const block = active.data.current?.block as TimeBlockData

    setDraggingBlock(null)
    setActiveCellId(null)

    if (!over || !block) return

    const cellId = over.data.current?.cellId as string
    if (!cellId || !validDropCells.has(cellId)) return

    const { date, hour, quarter } = parseCellId(cellId)
    const startMins = hour * 60 + quarter * 15
    const startTimeStr = minutesToTimeString(startMins)
    const staff = staffList.find((s) => s.id === selectedStaffId)

    setBookingState({
      staffId: selectedStaffId,
      staffName: staff?.name ?? '',
      block,
      date,
      hour,
      quarter,
      startTimeStr,
    })
    setStep('form')
  }

  const handleFormSubmit = async (formData: {
    clientName: string; phone: string; email: string; wechat: string
  }) => {
    if (!bookingState) return
    setIsSubmitting(true)

    const staff = staffList.find((s) => s.id === bookingState.staffId)
    const tz = staff?.settings?.timezone ?? 'Asia/Shanghai'
    const { fromZonedTime } = await import('date-fns-tz')
    const localDt = new Date(`${bookingState.date}T${bookingState.startTimeStr}:00`)
    const utcDt = fromZonedTime(localDt, tz)

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffId: bookingState.staffId,
        timeBlockId: bookingState.block.id,
        startTime: utcDt.toISOString(),
        clientName: formData.clientName,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        wechat: formData.wechat || undefined,
        bookingToken: tokenParam || undefined,
      }),
    })

    setIsSubmitting(false)

    if (res.status === 409) {
      const data = await res.json()
      addToast(
        isEn
          ? `⚠️ Time conflict: this slot is occupied (${data.conflicting?.clientName})`
          : `⚠️ 时间冲突：该时段已被占用（${data.conflicting?.clientName}）`,
        'error'
      )
      return
    }

    if (res.status === 422) {
      const data = await res.json()
      addToast(data.error ?? (isEn ? 'Selected time is outside working hours' : '预约时间超出工作时间'), 'error')
      return
    }

    if (!res.ok) {
      const data = await res.json()
      addToast(data.error ?? (isEn ? 'Booking failed, please try again' : '预约失败，请重试'), 'error')
      return
    }

    const data = await res.json()
    setStep(data.status === 'CONFIRMED' ? 'success' : 'pending')

    // Refresh slots
    fetch(`/api/slots?staffId=${selectedStaffId}&weekStart=${format(weekStart, 'yyyy-MM-dd')}`, { cache: 'no-store' })
      .then((r) => r.json()).then(setSlots).catch(console.error)
  }

  // Filtered time blocks: if token specifies a block, show only that one
  const displayedBlocks = useMemo(() => {
    if (prefillTimeBlockId) {
      const found = timeBlocks.find((b) => b.id === prefillTimeBlockId)
      return found ? [found] : timeBlocks
    }
    return timeBlocks
  }, [timeBlocks, prefillTimeBlockId])

  const getStartISO = () =>
    bookingState ? `${bookingState.date}T${bookingState.startTimeStr}:00` : ''

  const getEndISO = () => {
    if (!bookingState) return ''
    const start = new Date(`${bookingState.date}T${bookingState.startTimeStr}:00`)
    return addMinutes(start, bookingState.block.durationMins).toISOString()
  }

  if (staffList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-8">
        {studio?.logoUrl ? (
          <img src={studio.logoUrl} alt="Store Logo" className="w-16 h-16 rounded-2xl object-cover border border-gray-200" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-500">
            Store Logo
          </div>
        )}
        <h1 className="text-lg font-semibold text-gray-800">{studio?.name ?? 'Store Name'}</h1>
        <p className="text-sm text-gray-600">
          {isEn
            ? 'You shine; we tailor your glow. A refined life starts with a manicure made for you.'
            : '你负责闪耀，我负责为你定制光芒。精致生活，从一副为你而做的美甲开始。'}
        </p>
        <p className="text-sm text-gray-500">{isEn ? 'Loading, please wait' : '加载中，请稍后'}</p>
      </div>
    )
  }

  const trayHeight = displayedBlocks.length > 0
    ? Math.max(...displayedBlocks.map((b) => getTrayTileHeightPx(b.durationMins))) + 56
    : 80

  const handleLangChange = (nextLang: 'zh' | 'en') => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('lang', nextLang)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div
      className="flex flex-col h-dvh overflow-hidden"
      style={{ '--brand-color': studio?.brandColor ?? '#6366f1' } as React.CSSProperties}
    >
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {studio?.logoUrl && (
            <img src={studio.logoUrl} alt="logo" className="h-8 w-8 rounded-lg object-cover" />
          )}
          <h1 className="font-semibold text-gray-900 truncate">{studio?.name ?? '预约平台'}</h1>
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px] whitespace-nowrap">
          <span className="text-gray-500">
            {isEn ? 'Powered by ' : '由 '}
            <a
              href="https://www.jwsoft.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
            >
              JW Soft
            </a>
            {isEn ? '' : ' 提供服务'}
          </span>
          <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => handleLangChange('zh')}
              className={cn(
                'px-2 py-0.5 text-[11px]',
                !isEn ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'
              )}
            >
              中
            </button>
            <button
              type="button"
              onClick={() => handleLangChange('en')}
              className={cn(
                'px-2 py-0.5 text-[11px] border-l border-gray-200',
                isEn ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'
              )}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Staff selector */}
      <div className="bg-white border-b border-gray-100 py-2 flex-shrink-0">
        <StaffToggle
          staffList={staffList}
          selectedId={selectedStaffId}
          onChange={(id) => { setSelectedStaffId(id); setStep('calendar') }}
        />
      </div>

      {/* Legend */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex-shrink-0">
        <Legend />
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Calendar */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <CalendarHeader
            weekStart={weekStart}
            onPrevWeek={() => setWeekStart((w) => addDays(w, -7))}
            onNextWeek={() => setWeekStart((w) => addDays(w, 7))}
            onSelectDate={(date) => setWeekStart(startOfWeek(date, { weekStartsOn: 1 }))}
          />

          {/* Grid body */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden relative"
            style={{ paddingBottom: `min(${trayHeight + 8}px, 29dvh)` }}
          >
            {isLoadingSlots && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
              </div>
            )}

            {draggingBlock && (
              <div className="sticky top-0 z-20 bg-indigo-600 text-white text-sm text-center py-2 font-medium">
                {isEn ? 'Drag onto the calendar to choose time' : '拖入日历格子以选择时间段'}
              </div>
            )}

            <div className="flex">
              <TimeColumn
                startHour={calendarStartHour}
                endHour={calendarEndHour}
                timezone={timezone}
              />

              {/* Day columns */}
              <div className="flex-1 grid grid-cols-7">
                {days.map((day, dayIdx) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  return (
                    <div
                      key={dayIdx}
                      className={cn(
                        'flex flex-col',
                        dayIdx < 6 && 'border-r border-dashed border-gray-300'
                      )}
                    >
                      {Array.from(
                        { length: (calendarEndHour - calendarStartHour) * 4 },
                        (_, idx) => {
                          const hour = calendarStartHour + Math.floor(idx / 4)
                          const quarter = idx % 4
                          const cellId = makeCellId(dateStr, hour, quarter)
                          const slot = slotMap.get(cellId)
                          const slotType = slot?.slotType ?? 'UNAVAILABLE'
                          const prevCellId = idx > 0
                            ? makeCellId(
                                dateStr,
                                calendarStartHour + Math.floor((idx - 1) / 4),
                                (idx - 1) % 4
                              )
                            : null
                          const nextCellId = idx < (calendarEndHour - calendarStartHour) * 4 - 1
                            ? makeCellId(
                                dateStr,
                                calendarStartHour + Math.floor((idx + 1) / 4),
                                (idx + 1) % 4
                              )
                            : null
                          const prevIsBooked = prevCellId ? slotMap.get(prevCellId)?.slotType === 'BOOKED' : false
                          const nextIsBooked = nextCellId ? slotMap.get(nextCellId)?.slotType === 'BOOKED' : false
                          const isBookedStart = slotType === 'BOOKED' && !prevIsBooked
                          const isBookedEnd = slotType === 'BOOKED' && !nextIsBooked
                          const canDrop =
                            !!draggingBlock && validDropCells.has(cellId)
                          return (
                            <QuarterCell
                              key={cellId}
                              cellId={cellId}
                              slotType={slotType}
                              canDrop={canDrop}
                              isHighlighted={highlightInfo.cells.has(cellId)}
                              isHighlightValid={highlightInfo.valid}
                              isHourStart={quarter === 0}
                              isHalfHour={quarter === 2}
                              isBookedStart={isBookedStart}
                              isBookedEnd={isBookedEnd}
                              showBookedLabel={isBookedStart}
                              bookedLabel={isEn ? 'Booked' : '已约'}
                            />
                          )
                        }
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {draggingBlock && (
            <div className="flex flex-col items-center gap-1 pointer-events-none">
              {overlayTimeLabel && (
                <div className="bg-indigo-700 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg -translate-y-2">
                  {overlayTimeLabel}
                </div>
              )}
              <GameTile block={draggingBlock} isOverlay />
            </div>
          )}
        </DragOverlay>

        {/* Time block tray */}
        <GameTileTray
          blocks={displayedBlocks}
          draggingBlockId={draggingBlock ? `block-${draggingBlock.id}` : null}
          isCollapsed={!!draggingBlock}
        />
      </DndContext>

      {/* Booking form sheet */}
      {bookingState && step === 'form' && (
        <BottomSheet isOpen onClose={() => setStep('calendar')} title={isEn ? 'Booking Confirmation' : '预约确认'}>
          <div className="px-4 py-2">
            <BookingForm
              staffName={bookingState.staffName}
              serviceName={bookingState.block.name}
              startTime={getStartISO()}
              endTime={getEndISO()}
              durationMins={bookingState.block.durationMins}
              initialData={prefillData}
              onSubmit={handleFormSubmit}
              onBack={() => setStep('calendar')}
              isSubmitting={isSubmitting}
            />
          </div>
        </BottomSheet>
      )}

      {/* Success */}
      <BottomSheet isOpen={step === 'success'} onClose={() => setStep('calendar')} title="">
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{isEn ? 'Booking Confirmed!' : '预约成功！'}</h2>
          <p className="text-sm text-gray-500 mb-6">
            {isEn ? 'Your booking is confirmed. We look forward to seeing you.' : '您的预约已确认，期待您的到来'}
          </p>
          <button onClick={() => setStep('calendar')} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium">
            {isEn ? 'Done' : '完成'}
          </button>
        </div>
      </BottomSheet>

      {/* Pending */}
      <BottomSheet isOpen={step === 'pending'} onClose={() => setStep('calendar')} title="">
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <div className="text-5xl mb-4">🕐</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{isEn ? 'Request Submitted' : '预约申请已提交'}</h2>
          <p className="text-sm text-gray-500 mb-6">
            {isEn ? 'Waiting for confirmation. Please keep your contact available.' : '等待商家确认，请保持联系方式畅通'}
          </p>
          <button onClick={() => setStep('calendar')} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium">
            {isEn ? 'Done' : '完成'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
