'use client'

import { useState, useEffect } from 'react'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'

interface Staff {
  id: string
  name: string
}

interface TimeBlockOption {
  id: string
  name: string
  durationMins: number
  isActive: boolean
}

interface TokenRecord {
  id: string
  token: string
  clientName: string | null
  phone: string | null
  email: string | null
  wechat: string | null
  expiresAt: string | null
  usedAt: string | null
  createdAt: string
  staff: Staff | null
}

const EXPIRY_OPTIONS = [
  { label: '无限期', days: null },
  { label: '7天', days: 7 },
  { label: '30天', days: 30 },
  { label: '90天', days: 90 },
]

export default function LinksClient() {
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockOption[]>([])
  const [tokens, setTokens] = useState<TokenRecord[]>([])
  const [form, setForm] = useState({
    staffId: '',
    timeBlockId: '',
    clientName: '',
    phone: '',
    email: '',
    wechat: '',
    expiryDays: null as number | null,
    lang: 'zh' as 'zh' | 'en',
  })
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const { toasts, addToast, dismiss } = useToast()

  useEffect(() => {
    fetch('/api/admin/staff', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: (Staff & { isDefault?: boolean })[]) => setStaffList(data.filter((s) => !s.isDefault)))
      .catch(console.error)

    fetch('/api/admin/tokens', { credentials: 'include' })
      .then((r) => r.json())
      .then(setTokens)
      .catch(console.error)
  }, [])

  // Load time blocks when staff changes
  useEffect(() => {
    if (!form.staffId) { setTimeBlocks([]); return }
    fetch(`/api/admin/time-blocks?staffId=${form.staffId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data: TimeBlockOption[]) => setTimeBlocks(data.filter((tb) => tb.isActive)))
      .catch(console.error)
  }, [form.staffId])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGeneratedUrl(null)

    let expiresAt: string | null = null
    if (form.expiryDays) {
      const d = new Date()
      d.setDate(d.getDate() + form.expiryDays)
      expiresAt = d.toISOString()
    }

    const res = await fetch('/api/admin/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        staffId: form.staffId || undefined,
        timeBlockId: form.timeBlockId || undefined,
        clientName: form.clientName || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        wechat: form.wechat || undefined,
        expiresAt,
        lang: form.lang,
      }),
    })

    setIsGenerating(false)

    if (!res.ok) {
      addToast('生成失败', 'error')
      return
    }

    const data = await res.json()
    setGeneratedUrl(data.bookingUrl)
    setTokens((prev) => [data, ...prev])
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    addToast('链接已复制', 'success')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Generator form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">生成专属预约链接</h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">指定技师</label>
            <select
              value={form.staffId}
              onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value, timeBlockId: '' }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">全部技师</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {timeBlocks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">指定服务项目</label>
              <select
                value={form.timeBlockId}
                onChange={(e) => setForm((f) => ({ ...f, timeBlockId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">全部项目</option>
                {timeBlocks.map((tb) => (
                  <option key={tb.id} value={tb.id}>{tb.name}（{tb.durationMins}分钟）</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'clientName', label: '客户姓名', type: 'text' },
              { key: 'phone', label: '手机号', type: 'tel' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'wechat', label: '微信名', type: 'text' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder={label}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">链接语言</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, lang: 'zh' }))}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  form.lang === 'zh'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-200 text-gray-700 hover:border-indigo-300'
                }`}
              >
                中文
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, lang: 'en' }))}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  form.lang === 'en'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-200 text-gray-700 hover:border-indigo-300'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">链接有效期</label>
            <div className="flex gap-2 flex-wrap">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, expiryDays: opt.days }))}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    form.expiryDays === opt.days
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 text-gray-700 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="self-start bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isGenerating ? '生成中...' : '生成链接'}
          </button>

          {generatedUrl && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <p className="text-sm text-indigo-800 break-all flex-1">{generatedUrl}</p>
                <button
                  onClick={() => copyUrl(generatedUrl)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium text-sm whitespace-nowrap"
                >
                  📋 复制
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Token history */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">已生成链接</h2>
        </div>

        {tokens.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-400 text-sm">暂无历史链接</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tokens.map((t) => {
              const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
              const url = `${appUrl}/book?token=${t.token}&lang=zh`
              return (
                <div key={t.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {t.clientName ?? '匿名'} {t.staff ? `· ${t.staff.name}` : ''}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{url}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm')}
                        {t.expiresAt ? ` · 到期: ${format(new Date(t.expiresAt), 'MM-dd')}` : ' · 永久'}
                        {t.usedAt ? ' · 已使用' : ' · 未使用'}
                      </p>
                    </div>
                    <button
                      onClick={() => copyUrl(url)}
                      className="text-indigo-600 text-xs font-medium whitespace-nowrap"
                    >
                      复制
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
