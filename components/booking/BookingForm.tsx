'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface BookingFormData {
  clientName: string
  phone: string
  email: string
  wechat: string
}

interface BookingFormProps {
  staffName: string
  serviceName: string
  startTime: string // ISO
  endTime: string // ISO
  durationMins: number
  initialData?: Partial<BookingFormData>
  onSubmit: (data: BookingFormData) => Promise<void>
  onBack: () => void
  isSubmitting: boolean
}

export default function BookingForm({
  staffName,
  serviceName,
  startTime,
  endTime,
  durationMins,
  initialData,
  onSubmit,
  onBack,
  isSubmitting,
}: BookingFormProps) {
  const [form, setForm] = useState<BookingFormData>({
    clientName: initialData?.clientName ?? '',
    phone: initialData?.phone ?? '',
    email: initialData?.email ?? '',
    wechat: initialData?.wechat ?? '',
  })
  const [errors, setErrors] = useState<Partial<BookingFormData>>({})

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const validate = (): boolean => {
    const errs: Partial<BookingFormData> = {}
    if (!form.clientName.trim()) errs.clientName = '姓名必填'
    if (!form.phone && !form.email && !form.wechat) {
      errs.phone = '请至少填写一种联系方式'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(form)
  }

  const field = (
    label: string,
    key: keyof BookingFormData,
    required = false,
    type = 'text'
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className={cn(
          'w-full border rounded-xl px-3 py-3 text-sm outline-none min-h-[44px]',
          'focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors',
          errors[key] ? 'border-red-400 bg-red-50' : 'border-gray-200'
        )}
        placeholder={label}
      />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Summary */}
      <div className="bg-indigo-50 rounded-xl p-4 mb-4 text-sm">
        <div className="flex justify-between mb-1">
          <span className="text-gray-500">技师</span>
          <span className="font-medium">{staffName}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-gray-500">时间</span>
          <span className="font-medium">
            {formatDateTime(startTime)} – {new Date(endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">服务</span>
          <span className="font-medium">{serviceName} {durationMins}min</span>
        </div>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4 flex-1">
        {field('姓名', 'clientName', true)}
        {field('手机号', 'phone', false, 'tel')}
        {field('Email', 'email', false, 'email')}
        {field('微信名', 'wechat')}
        {errors.phone && !form.phone && !form.email && !form.wechat && (
          <p className="text-xs text-red-500">{errors.phone}</p>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-4 mb-2">
        如需改期或取消，请联系店铺
      </p>

      {/* Actions */}
      <div className="flex gap-3 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium min-h-[44px]"
        >
          ← 返回
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'flex-1 py-3 rounded-xl font-medium min-h-[44px] text-white',
            isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
          )}
        >
          {isSubmitting ? '提交中...' : '确认预约'}
        </button>
      </div>
    </form>
  )
}
