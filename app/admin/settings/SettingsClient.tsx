'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import ColorPicker from '@/components/ui/ColorPicker'
import { isMultipleOf15 } from '@/lib/calendarConstants'

const TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Taipei',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
]

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}))

interface Staff {
  id: string
  name: string
  isDefault: boolean
  settings: {
    timezone: string
    bufferMinutes: number
    openUntil: string | null
    calendarStartHour: number
    calendarEndHour: number
  } | null
}

interface StudioData {
  name: string
  logoUrl: string | null
  brandColor: string | null
}

interface ScheduleRule {
  id: string
  staffId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  slotType: 'AVAILABLE' | 'PENDING_CONFIRM' | 'UNAVAILABLE'
}

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export default function SettingsClient() {
  const [allStaff, setAllStaff] = useState<Staff[]>([])
  const staffList = allStaff.filter((s) => !s.isDefault)
  const defaultStaff = allStaff.find((s) => s.isDefault)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [studio, setStudio] = useState<StudioData>({ name: '', logoUrl: null, brandColor: '#6366f1' })
  const [settings, setSettings] = useState({
    timezone: 'Asia/Shanghai',
    bufferMinutes: 0,
    openUntil: '',
    calendarStartHour: 8,
    calendarEndHour: 22,
  })
  const [rules, setRules] = useState<ScheduleRule[]>([])
  const [isSavingStudio, setIsSavingStudio] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const { toasts, addToast, dismiss } = useToast()

  // Load staff (including default)
  useEffect(() => {
    fetch('/api/admin/staff', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: Staff[]) => {
        setAllStaff(data)
        const real = data.filter((s) => !s.isDefault)
        // Default to the first non-default staff, or the default staff if no real staff
        const first = real[0] ?? data.find((s) => s.isDefault)
        if (first) setSelectedStaffId(first.id)
      })
      .catch(console.error)
  }, [])

  // Load studio
  useEffect(() => {
    fetch('/api/admin/studio', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setStudio({ name: data.name, logoUrl: data.logoUrl, brandColor: data.brandColor })
        }
      })
      .catch(console.error)
  }, [])

  // Load staff settings
  useEffect(() => {
    if (!selectedStaffId) return
    const staff = allStaff.find((s) => s.id === selectedStaffId)
    if (staff?.settings) {
      setSettings({
        timezone: staff.settings.timezone,
        bufferMinutes: staff.settings.bufferMinutes,
        openUntil: staff.settings.openUntil
          ? new Date(staff.settings.openUntil).toISOString().slice(0, 10)
          : '',
        calendarStartHour: staff.settings.calendarStartHour,
        calendarEndHour: staff.settings.calendarEndHour,
      })
    }

    const controller = new AbortController()
    fetch(`/api/admin/schedule-rules?staffId=${selectedStaffId}`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then(setRules)
      .catch((err) => {
        if (err?.name !== 'AbortError') console.error(err)
      })

    return () => controller.abort()
  }, [selectedStaffId, allStaff])

  const handleSaveStudio = async () => {
    setIsSavingStudio(true)
    const res = await fetch('/api/admin/studio', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(studio),
    })
    setIsSavingStudio(false)
    if (res.ok) addToast('工作室信息已保存', 'success')
    else addToast('保存失败', 'error')
  }

  const handleSaveSettings = async () => {
    if (settings.calendarEndHour <= settings.calendarStartHour) {
      addToast('结束时间必须晚于开始时间', 'error')
      return
    }
    setIsSavingSettings(true)
    const res = await fetch(`/api/admin/settings/${selectedStaffId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ...settings,
        openUntil: settings.openUntil ? new Date(settings.openUntil).toISOString() : null,
      }),
    })
    setIsSavingSettings(false)
    if (res.ok) addToast('设置已保存', 'success')
    else addToast('保存失败', 'error')
  }

  const addRule = (dayOfWeek: number) => {
    const newRule: Omit<ScheduleRule, 'id'> = {
      staffId: selectedStaffId,
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      slotType: 'AVAILABLE',
    }
    fetch('/api/admin/schedule-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newRule),
    })
      .then((r) => r.json())
      .then((rule) => setRules((prev) => [...prev, rule]))
      .catch(() => addToast('添加失败', 'error'))
  }

  const updateRule = async (id: string, field: string, value: string) => {
    if ((field === 'startTime' || field === 'endTime') && !isMultipleOf15(value)) {
      addToast('时间输入应为15的倍数', 'error')
      return
    }
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))

    const rule = rules.find((r) => r.id === id)
    if (!rule) return

    await fetch(`/api/admin/schedule-rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...rule, [field]: value }),
    })
  }

  const deleteRule = async (id: string) => {
    await fetch(`/api/admin/schedule-rules/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const handleRestoreDefaults = async () => {
    if (!confirm('将从"默认设置"恢复该员工的时区/缓冲/截止日期/日历时间与排班规则，确认继续？')) return
    const res = await fetch(`/api/admin/staff/${selectedStaffId}/restore-defaults`, {
      method: 'POST',
      credentials: 'include',
    })
    if (res.ok) {
      addToast('已恢复默认设置', 'success')
      // Reload page to refresh all data
      window.location.reload()
    } else {
      addToast('恢复失败', 'error')
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      addToast('图片大小不超过 500KB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setStudio((s) => ({ ...s, logoUrl: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  const dayRules = (day: number) => rules.filter((r) => r.dayOfWeek === day)

  const hasOverlap = (day: number) => {
    const dr = dayRules(day).sort((a, b) => a.startTime.localeCompare(b.startTime))
    for (let i = 0; i < dr.length - 1; i++) {
      if (dr[i].endTime > dr[i + 1].startTime) return true
    }
    return false
  }

  const section = (title: string, children: React.ReactNode) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Global studio settings */}
      {section('工作室设置', (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">工作室名称</label>
            <input
              type="text"
              value={studio.name}
              onChange={(e) => setStudio((s) => ({ ...s, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">工作室 Logo</label>
            <div className="flex items-center gap-4">
              {studio.logoUrl ? (
                <img src={studio.logoUrl} alt="logo" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs border border-gray-200">
                  无图
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer bg-white border border-gray-200 text-gray-700 text-sm px-3 py-2 rounded-xl hover:border-indigo-300 inline-block">
                  上传图片
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {studio.logoUrl && (
                  <button
                    onClick={() => setStudio((s) => ({ ...s, logoUrl: null }))}
                    className="text-xs text-red-400 hover:text-red-600 text-left"
                  >
                    移除
                  </button>
                )}
                <p className="text-xs text-gray-400">最大 500KB，JPG/PNG</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">品牌色</label>
            <ColorPicker
              value={studio.brandColor ?? '#6366f1'}
              onChange={(color) => setStudio((s) => ({ ...s, brandColor: color }))}
            />
          </div>
          <button
            onClick={handleSaveStudio}
            disabled={isSavingStudio}
            className="self-start bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isSavingStudio ? '保存中...' : '保存工作室信息'}
          </button>
        </div>
      ))}

      {/* Staff selector — default staff first, then real staff */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none flex-wrap">
        {defaultStaff && (
          <button
            onClick={() => setSelectedStaffId(defaultStaff.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border-2 border-dashed',
              selectedStaffId === defaultStaff.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white border-indigo-200 text-indigo-700'
            )}
          >
            ⚙ 默认设置
          </button>
        )}
        {staffList.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStaffId(s.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap',
              selectedStaffId === s.id
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700'
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      {selectedStaffId && (
        <>
          {/* Restore defaults button — only for real staff */}
          {!allStaff.find((s) => s.id === selectedStaffId)?.isDefault && defaultStaff && (
            <div className="flex justify-end mb-2">
              <button
                onClick={handleRestoreDefaults}
                className="text-sm text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50"
              >
                ↺ 恢复默认
              </button>
            </div>
          )}
          {/* Per-staff settings */}
          {section('员工设置', (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">时区</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  预约后缓冲时间（分钟）
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.bufferMinutes}
                  onChange={(e) => setSettings((s) => ({ ...s, bufferMinutes: Number(e.target.value) }))}
                  className="w-32 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  预约截止日期（留空=不限）
                </label>
                <input
                  type="date"
                  value={settings.openUntil}
                  onChange={(e) => setSettings((s) => ({ ...s, openUntil: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">日历开始时间</label>
                  <select
                    value={settings.calendarStartHour}
                    onChange={(e) => setSettings((s) => ({ ...s, calendarStartHour: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {HOUR_OPTIONS.slice(0, 23).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">日历结束时间</label>
                  <select
                    value={settings.calendarEndHour}
                    onChange={(e) => setSettings((s) => ({ ...s, calendarEndHour: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {HOUR_OPTIONS.slice(1).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="self-start bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isSavingSettings ? '保存中...' : '保存员工设置'}
              </button>
            </div>
          ))}

          {/* Schedule rules */}
          {section('每周排班规则', (
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <div key={day}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{DAY_NAMES[day]}</span>
                    {hasOverlap(day) && (
                      <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">时段重叠</span>
                    )}
                    <button
                      onClick={() => addRule(day)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      ＋ 添加时段
                    </button>
                  </div>

                  {dayRules(day).length === 0 ? (
                    <p className="text-xs text-gray-400 pl-2">（全天不可用）</p>
                  ) : (
                    dayRules(day).map((rule) => (
                      <div key={rule.id} className="flex items-center gap-2 mb-2">
                        <input
                          type="time"
                          value={rule.startTime}
                          onChange={(e) => updateRule(rule.id, 'startTime', e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 w-24"
                        />
                        <span className="text-gray-400 text-xs">–</span>
                        <input
                          type="time"
                          value={rule.endTime}
                          onChange={(e) => updateRule(rule.id, 'endTime', e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 w-24"
                        />
                        <select
                          value={rule.slotType}
                          onChange={(e) => updateRule(rule.id, 'slotType', e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                          <option value="AVAILABLE">可预约</option>
                          <option value="PENDING_CONFIRM">待确认</option>
                          <option value="UNAVAILABLE">不可用</option>
                        </select>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="text-red-400 hover:text-red-600 text-lg leading-none p-1"
                        >
                          🗑
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
