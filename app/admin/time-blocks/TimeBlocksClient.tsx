'use client'

import { useState, useEffect } from 'react'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import ColorPicker from '@/components/ui/ColorPicker'
import { cn } from '@/lib/utils'

interface TimeBlock {
  id: string
  name: string
  durationMins: number
  color: string
  isActive: boolean
}

interface Staff {
  id: string
  name: string
  isDefault?: boolean
}

const DEFAULT_FORM = { name: '', durationMins: 60, color: '#818cf8', isActive: true }

export default function TimeBlocksClient() {
  const [allStaff, setAllStaff] = useState<Staff[]>([])
  const staffList = allStaff.filter((s) => !s.isDefault)
  const defaultStaff = allStaff.find((s) => s.isDefault)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toasts, addToast, dismiss } = useToast()

  useEffect(() => {
    fetch('/api/admin/staff', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: Staff[]) => {
        setAllStaff(data)
        const firstReal = data.find((s) => !s.isDefault)
        if (firstReal) setSelectedStaffId(firstReal.id)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedStaffId) return
    fetch(`/api/admin/time-blocks?staffId=${selectedStaffId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setBlocks)
      .catch(console.error)
  }, [selectedStaffId])

  const openCreate = () => {
    setEditingBlock(null)
    setForm(DEFAULT_FORM)
    setShowForm(true)
  }

  const openEdit = (block: TimeBlock) => {
    setEditingBlock(block)
    setForm({ name: block.name, durationMins: block.durationMins, color: block.color, isActive: block.isActive })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('请填写名称', 'error')
      return
    }
    setIsSaving(true)

    if (editingBlock) {
      const res = await fetch(`/api/admin/time-blocks/${editingBlock.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const updated = await res.json()
        setBlocks((prev) => prev.map((b) => (b.id === editingBlock.id ? updated : b)))
        addToast('已保存', 'success')
        setShowForm(false)
      } else {
        addToast('保存失败', 'error')
      }
    } else {
      const res = await fetch('/api/admin/time-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, staffId: selectedStaffId }),
      })
      if (res.ok) {
        const created = await res.json()
        setBlocks((prev) => [...prev, created])
        addToast('已创建', 'success')
        setShowForm(false)
      } else {
        addToast('创建失败', 'error')
      }
    }
    setIsSaving(false)
  }

  const handleDelete = async (block: TimeBlock) => {
    if (!confirm(`确认删除「${block.name}」？`)) return
    const res = await fetch(`/api/admin/time-blocks/${block.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json()
    if (data.warning) {
      addToast(data.warning, 'warning')
      setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, isActive: false } : b)))
    } else if (data.success) {
      setBlocks((prev) => prev.filter((b) => b.id !== block.id))
      addToast('已删除', 'success')
    } else {
      addToast('删除失败', 'error')
    }
  }

  const handleRestoreDefaults = async () => {
    if (!selectedStaffId) return
    if (!confirm('将用默认服务项目覆盖当前员工，确认继续？')) return

    const res = await fetch(`/api/admin/staff/${selectedStaffId}/restore-time-blocks`, {
      method: 'POST',
      credentials: 'include',
    })

    if (!res.ok) {
      addToast('恢复默认失败', 'error')
      return
    }

    const refreshed = await fetch(`/api/admin/time-blocks?staffId=${selectedStaffId}`, { credentials: 'include' })
    const data = await refreshed.json()
    setBlocks(data)
    addToast('已恢复默认服务项目', 'success')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Staff tabs */}
      {staffList.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
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
      )}

      {!allStaff.find((s) => s.id === selectedStaffId)?.isDefault && defaultStaff && (
        <div className="flex justify-end mb-3">
          <button
            onClick={handleRestoreDefaults}
            className="text-sm text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50"
          >
            ↺ 恢复默认服务项目
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">服务项目</h2>
          <button
            onClick={openCreate}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            ＋ 新增
          </button>
        </div>

        {blocks.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">暂无服务项目</p>
            <button onClick={openCreate} className="mt-3 text-indigo-600 text-sm font-medium">
              添加第一个服务项目
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-gray-500 font-medium">名称</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">时长</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">颜色</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">状态</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr key={block.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{block.name}</td>
                  <td className="px-4 py-3 text-gray-600">{block.durationMins} min</td>
                  <td className="px-4 py-3">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: block.color }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      block.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {block.isActive ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEdit(block)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(block)}
                        className="text-red-400 hover:text-red-600"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form panel */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingBlock ? '编辑服务项目' : '新增服务项目'}
          </h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="例：基础护理"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">时长（分钟）</label>
              <input
                type="number"
                min={5}
                step={5}
                value={form.durationMins}
                onChange={(e) => setForm((f) => ({ ...f, durationMins: Number(e.target.value) }))}
                className="w-32 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">颜色</label>
              <ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="accent-indigo-600"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">启用此服务项目</label>
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
