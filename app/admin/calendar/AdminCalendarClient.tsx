'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { format, addDays, startOfWeek } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import CalendarHeader from '@/components/calendar/CalendarHeader'
import TimeColumn from '@/components/calendar/TimeColumn'
import AppointmentModal from '@/components/admin/AppointmentModal'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import {
  SLOT_HEIGHT,
  HOUR_HEIGHT,
  makeCellId,
  getAppointmentHeightPx,
  getAppointmentTopPx,
} from '@/lib/calendarConstants'

interface StaffData {
  id: string
  name: string
  settings: {
    calendarStartHour: number
    calendarEndHour: number
    timezone: string
  } | null
}

interface TimeBlock {
  id: string
  name: string
  durationMins: number
  color: string
}

interface Appointment {
  id: string
  clientName: string
  phone: string | null
  email: string | null
  wechat: string | null
  startTime: string
  endTime: string
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED'
  notes: string | null
  timeBlock: TimeBlock
  staffId: string
}

interface SlotQuarter {
  date: string
  hour: number
  quarter: number
  slotType: 'AVAILABLE' | 'PENDING_CONFIRM' | 'UNAVAILABLE' | 'BOOKED'
  cellId: string
}

// ---------- Appointment block (draggable) ----------
function AppointmentBlock({
  appointment,
  topPx,
  heightPx,
  timezone,
  onClick,
}: {
  appointment: Appointment
  topPx: number
  heightPx: number
  timezone: string
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `appt-${appointment.id}`,
    data: { appointment },
  })

  const style = {
    top: topPx,
    height: heightPx,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    borderLeftColor: appointment.timeBlock.color,
    touchAction: 'none' as const,
  }
  const startZoned = toZonedTime(new Date(appointment.startTime), timezone)
  const endZoned = toZonedTime(new Date(appointment.endTime), timezone)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={cn(
        'absolute inset-x-0.5 border-l-4 rounded-md cursor-pointer select-none',
        'px-1.5 py-0.5 overflow-hidden shadow-sm hover:shadow-md transition-shadow',
        appointment.status === 'PENDING' ? 'bg-yellow-50 border border-yellow-200' : 'bg-white border border-gray-100',
        isDragging ? 'opacity-40 z-50' : 'z-10'
      )}
    >
      <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight">
        {appointment.clientName}
      </p>
      {heightPx >= 32 && (
        <p className="text-[10px] text-gray-500 truncate">{appointment.timeBlock.name}</p>
      )}
      {heightPx >= 48 && (
        <p className="text-[10px] text-gray-400 truncate">
          {format(startZoned, 'HH:mm')} – {format(endZoned, 'HH:mm')}
        </p>
      )}
    </div>
  )
}

// ---------- Drop zone cell (per hour) ----------
function DropCell({ date, hour }: { date: string; hour: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: makeCellId(date, hour, 0),
    data: { date, hour },
  })
  return (
    <div
      ref={setNodeRef}
      style={{ height: HOUR_HEIGHT }}
      className={cn(
        'border-b border-gray-100',
        isOver && 'bg-indigo-50'
      )}
    />
  )
}

// ---------- Day column with absolute appointment blocks ----------
function DayColumn({
  date,
  slots,
  appointments,
  calendarStartHour,
  calendarEndHour,
  timezone,
  onAppointmentClick,
  isDraggingAppt,
}: {
  date: string
  slots: SlotQuarter[]
  appointments: Appointment[]
  calendarStartHour: number
  calendarEndHour: number
  timezone: string
  onAppointmentClick: (appt: Appointment) => void
  isDraggingAppt: boolean
}) {
  const totalHeight = (calendarEndHour - calendarStartHour) * HOUR_HEIGHT
  const hours = Array.from(
    { length: calendarEndHour - calendarStartHour },
    (_, i) => calendarStartHour + i
  )
  const totalQuarters = (calendarEndHour - calendarStartHour) * 4
  const slotMap = new Map(slots.map((s) => [s.cellId, s]))

  return (
    <div className="relative border-r border-gray-100" style={{ height: totalHeight }}>
      {/* 15-min availability background */}
      {Array.from({ length: totalQuarters }, (_, idx) => {
        const hour = calendarStartHour + Math.floor(idx / 4)
        const quarter = idx % 4
        const cellId = makeCellId(date, hour, quarter)
        const slotType = slotMap.get(cellId)?.slotType ?? 'UNAVAILABLE'
        return (
          <div
            key={cellId}
            className={cn(
              'absolute inset-x-0',
              quarter === 0 ? 'border-t border-gray-200' : quarter === 2 ? 'border-t border-gray-100' : 'border-t border-gray-50',
              slotType === 'UNAVAILABLE' ? 'bg-gray-100' : 'bg-white'
            )}
            style={{ top: idx * SLOT_HEIGHT, height: SLOT_HEIGHT }}
          />
        )
      })}

      {/* Hour grid rows (droppable) */}
      {isDraggingAppt &&
        hours.map((hour) => (
          <div key={hour} className="absolute inset-x-0" style={{ top: (hour - calendarStartHour) * HOUR_HEIGHT }}>
            <DropCell date={date} hour={hour} />
          </div>
        ))}

      {/* Appointment blocks */}
      {appointments
        .filter((a) => a.status !== 'CANCELLED')
        .map((appt) => {
          const startZoned = toZonedTime(new Date(appt.startTime), timezone)
          const topPx = getAppointmentTopPx(
            startZoned.getHours(),
            startZoned.getMinutes(),
            calendarStartHour
          )
          const heightPx = getAppointmentHeightPx(appt.timeBlock.durationMins)
          return (
            <AppointmentBlock
              key={appt.id}
              appointment={appt}
              topPx={topPx}
              heightPx={heightPx}
              timezone={timezone}
              onClick={() => onAppointmentClick(appt)}
            />
          )
        })}
    </div>
  )
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

export default function AdminCalendarClient() {
  const [staffList, setStaffList] = useState<StaffData[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [slots, setSlots] = useState<SlotQuarter[]>([])
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDraggingAppt, setIsDraggingAppt] = useState(false)
  const { toasts, addToast, dismiss } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  useEffect(() => {
    fetch('/api/admin/staff', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: StaffData[]) => {
        // Filter out default staff from calendar
        const real = data.filter((s: any) => !s.isDefault)
        setStaffList(real)
        if (real.length > 0) setSelectedStaffId(real[0].id)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedStaffId) return
    fetch(`/api/admin/time-blocks?staffId=${selectedStaffId}`, { credentials: 'include' })
      .then((r) => r.json()).then(setTimeBlocks).catch(console.error)
  }, [selectedStaffId])

  useEffect(() => {
    if (!selectedStaffId) return
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    fetch(`/api/slots?staffId=${selectedStaffId}&weekStart=${weekStartStr}`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setSlots)
      .catch(console.error)
  }, [selectedStaffId, weekStart])

  const loadAppointments = useCallback(async () => {
    if (!selectedStaffId) return
    const start = weekStart.toISOString()
    const end = addDays(weekStart, 7).toISOString()
    const res = await fetch(
      `/api/admin/appointments?staffId=${selectedStaffId}&start=${start}&end=${end}`,
      { credentials: 'include' }
    )
    const data = await res.json()
    setAppointments(data)
  }, [selectedStaffId, weekStart])

  useEffect(() => { loadAppointments() }, [loadAppointments])

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId)
  const calendarStartHour = selectedStaff?.settings?.calendarStartHour ?? 8
  const calendarEndHour = selectedStaff?.settings?.calendarEndHour ?? 22
  const timezone = selectedStaff?.settings?.timezone ?? 'Asia/Shanghai'

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const totalHeight = (calendarEndHour - calendarStartHour) * HOUR_HEIGHT
  const getApptsByDate = (dateStr: string) =>
    appointments.filter(
      (a) => format(toZonedTime(new Date(a.startTime), timezone), 'yyyy-MM-dd') === dateStr
    )
  const getSlotsByDate = (dateStr: string) => slots.filter((s) => s.date === dateStr)

  const handleDragStart = (_e: DragStartEvent) => setIsDraggingAppt(true)

  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDraggingAppt(false)
    const { over, active } = event
    if (!over) return

    const appt = active.data.current?.appointment as Appointment
    if (!appt) return

    const { date, hour } = over.data.current as { date: string; hour: number }
    const localStart = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`)
    const newStart = fromZonedTime(localStart, timezone)

    // Optimistic update
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appt.id
          ? {
              ...a,
              startTime: newStart.toISOString(),
              endTime: new Date(newStart.getTime() + appt.timeBlock.durationMins * 60000).toISOString(),
            }
          : a
      )
    )

    const res = await fetch(`/api/admin/appointments/${appt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ startTime: newStart.toISOString() }),
    })

    if (res.status === 409) {
      const data = await res.json()
      addToast(`⚠️ 时间冲突：${data.conflicting?.clientName}`, 'error')
      await loadAppointments()
    } else if (!res.ok) {
      addToast('更新失败，请重试', 'error')
      await loadAppointments()
    }
  }

  const handleUpdate = async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    if (res.status === 409) {
      const err = await res.json()
      addToast(`⚠️ 时间冲突：${err.conflicting?.clientName}`, 'error')
      return
    }
    if (!res.ok) { addToast('保存失败，请重试', 'error'); return }
    addToast('已保存', 'success')
    setIsModalOpen(false)
    await loadAppointments()
  }

  const handleCancelAppt = async (id: string) => {
    const res = await fetch(`/api/admin/appointments/${id}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) { addToast('取消失败', 'error'); return }
    addToast('预约已取消', 'success')
    setIsModalOpen(false)
    await loadAppointments()
  }

  const handleExportICS = () => {
    if (!selectedStaffId) return
    const start = weekStart.toISOString()
    const end = addDays(weekStart, 7).toISOString()
    window.location.href = `/api/admin/export/ics?staffId=${selectedStaffId}&start=${start}&end=${end}`
  }

  return (
    <div className="max-w-6xl mx-auto">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Staff tabs + export */}
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 flex-1 overflow-x-auto scrollbar-none">
          {staffList.map((staff) => (
            <button
              key={staff.id}
              onClick={() => setSelectedStaffId(staff.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                selectedStaffId === staff.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300'
              )}
            >
              {staff.name}
            </button>
          ))}
        </div>
        <button
          onClick={handleExportICS}
          className="px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 whitespace-nowrap"
        >
          导出 .ics
        </button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="bg-white shadow-sm">
          {/* Calendar header */}
          <div className="sticky top-14 z-20 bg-white border-b border-gray-100">
            <CalendarHeader
              weekStart={weekStart}
              onPrevWeek={() => setWeekStart((w) => addDays(w, -7))}
              onNextWeek={() => setWeekStart((w) => addDays(w, 7))}
              onSelectDate={(date) => setWeekStart(startOfWeek(date, { weekStartsOn: 1 }))}
            />
          </div>

          <div className="overflow-y-auto overflow-x-hidden">
            <div className="flex w-full min-w-0">
              {/* Time column */}
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
                    <DayColumn
                      key={dayIdx}
                      date={dateStr}
                      slots={getSlotsByDate(dateStr)}
                      appointments={getApptsByDate(dateStr)}
                      calendarStartHour={calendarStartHour}
                      calendarEndHour={calendarEndHour}
                      timezone={timezone}
                      onAppointmentClick={(appt) => {
                        setSelectedAppt(appt)
                        setIsModalOpen(true)
                      }}
                      isDraggingAppt={isDraggingAppt}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        <DragOverlay />
      </DndContext>

      <AppointmentModal
        appointment={selectedAppt}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={handleUpdate}
        onCancel={handleCancelAppt}
        timeBlocks={timeBlocks}
      />
    </div>
  )
}
