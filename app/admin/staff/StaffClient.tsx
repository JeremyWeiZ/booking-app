'use client'

import { useState, useEffect } from 'react'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

interface StaffMember {
  id: string
  name: string
  avatarUrl: string | null
  isActive: boolean
}

export default function StaffClient() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [form, setForm] = useState({ name: '', avatarUrl: '' })
  const [isSaving, setIsSaving] = useState(false)
  const { toasts, addToast, dismiss } = useToast()

  const loadStaff = () => {
    fetch('/api/admin/staff', { credentials: 'include' })
      .then((r) => r.json())
      .then(setStaff)
      .catch(console.error)
  }

  useEffect(() => {
    loadStaff()
  }, [])

  const openCreate = () => {
    setEditingStaff(null)
    setForm({ name: '', avatarUrl: '' })
    setShowForm(true)
  }

  const openEdit = (s: StaffMember) => {
    setEditingStaff(s)
    setForm({ name: s.name, avatarUrl: s.avatarUrl ?? '' })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('请填写姓名', 'error')
      return
    }
    setIsSaving(true)

    if (editingStaff) {
      const res = await fetch(`/api/admin/staff/${editingStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: form.name, avatarUrl: form.avatarUrl || null }),
      })
      if (res.ok) {
        addToast('已保存', 'success')
        setShowForm(false)
        loadStaff()
      } else addToast('保存失败', 'error')
    } else {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: form.name, avatarUrl: form.avatarUrl || undefined }),
      })
      if (res.ok) {
        addToast('已创建', 'success')
        setShowForm(false)
        loadStaff()
      } else addToast('创建失败', 'error')
    }
    setIsSaving(false)
  }

  const handleDeactivate = async (s: StaffMember) => {
    if (!confirm(`确认${s.isActive ? '停用' : '启用'} ${s.name}？`)) return
    const res = await fetch(`/api/admin/staff/${s.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isActive: !s.isActive }),
    })
    if (res.ok) {
      addToast(s.isActive ? '已停用' : '已启用', 'success')
      loadStaff()
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">员工列表</h2>
          <button
            onClick={openCreate}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            ＋ 新增员工
          </button>
        </div>

        {staff.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">暂无员工</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
                  {s.avatarUrl ? (
                    <img src={s.avatarUrl} alt={s.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    s.name.charAt(0)
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{s.name}</p>
                  <span className={cn(
                    'text-xs',
                    s.isActive ? 'text-green-600' : 'text-gray-400'
                  )}>
                    {s.isActive ? '在职' : '停用'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openEdit(s)} className="text-indigo-600 text-sm font-medium">编辑</button>
                  <button onClick={() => handleDeactivate(s)} className="text-gray-400 text-sm">
                    {s.isActive ? '停用' : '启用'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingStaff ? '编辑员工' : '新增员工'}
          </h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="员工姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">头像URL（可选）</label>
              <input
                type="url"
                value={form.avatarUrl}
                onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
