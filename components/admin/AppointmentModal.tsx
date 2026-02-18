'use client'

import { useState, useEffect } from 'react'
import BottomSheet from '@/components/ui/BottomSheet'
import { cn } from '@/lib/utils'
import { format, addMinutes } from 'date-fns'

interface TimeBlockOption {
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
  timeBlock: TimeBlockOption
}

interface AppointmentModalProps {
  appointment: Appointment | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<void>
  onCancel: (id: string) => Promise<void>
  timeBlocks: TimeBlockOption[]
}

export default function AppointmentModal({
  appointment,
  isOpen,
  onClose,
  onUpdate,
  onCancel,
  timeBlocks,
}: AppointmentModalProps) {
  const [startTime, setStartTime] = useState('')
  const [timeBlockId, setTimeBlockId] = useState('')
  const [status, setStatus] = useState<'CONFIRMED' | 'PENDING' | 'CANCELLED'>('PENDING')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    if (appointment) {
      setStartTime(format(new Date(appointment.startTime), "yyyy-MM-dd'T'HH:mm"))
      setTimeBlockId(appointment.timeBlock.id)
      setStatus(appointment.status)
      setNotes(appointment.notes ?? '')
      setShowCancelConfirm(false)
    }
  }, [appointment])

  if (!appointment) return null

  const selectedBlock = timeBlocks.find((b) => b.id === timeBlockId) ?? appointment.timeBlock
  const computedEndTime = startTime
    ? addMinutes(new Date(startTime), selectedBlock.durationMins)
    : new Date(appointment.endTime)

  const handleSave = async () => {
    const mins = new Date(startTime).getMinutes()
    if (mins % 15 !== 0) {
      alert('时间输入应为15的倍数')
      return
    }
    setIsSaving(true)
    await onUpdate(appointment.id, {
      startTime: new Date(startTime).toISOString(),
      timeBlockId,
      status,
      notes,
    })
    setIsSaving(false)
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    await onCancel(appointment.id)
    setIsCancelling(false)
    onClose()
  }

  const statusMap = {
    CONFIRMED: '已确认',
    PENDING: '待确认',
    CANCELLED: '已取消',
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="预约详情">
      <div className="px-4 py-2 pb-6">
        {/* Client info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="font-semibold text-gray-900 mb-2">{appointment.clientName}</p>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {appointment.phone && <span>📱 {appointment.phone}</span>}
            {appointment.email && <span>✉ {appointment.email}</span>}
            {appointment.wechat && <span>💬 {appointment.wechat}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Start time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* End time (computed, read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">结束时间（自动）</label>
            <div className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5">
              {format(computedEndTime, 'HH:mm')}
            </div>
          </div>

          {/* Service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">服务项目</label>
            <select
              value={timeBlockId}
              onChange={(e) => setTimeBlockId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {timeBlocks.map((tb) => (
                <option key={tb.id} value={tb.id}>
                  {tb.name} ({tb.durationMins}min)
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'CONFIRMED' | 'PENDING' | 'CANCELLED')}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="CONFIRMED">已确认</option>
              <option value="PENDING">待确认</option>
              <option value="CANCELLED">已取消</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              placeholder="添加备注..."
            />
          </div>
        </div>

        {/* Cancel confirm */}
        {showCancelConfirm ? (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700 font-medium mb-3">确认取消该预约？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium"
              >
                返回
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium"
              >
                {isCancelling ? '取消中...' : '确认取消'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="px-4 py-3 border border-red-200 text-red-600 rounded-xl text-sm font-medium min-h-[44px]"
            >
              取消预约
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-medium text-white min-h-[44px]',
                isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              )}
            >
              {isSaving ? '保存中...' : '保存更改'}
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
