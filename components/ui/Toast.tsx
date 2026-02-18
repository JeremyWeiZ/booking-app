'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface ToastProps {
  toast: ToastMessage
  onDismiss: (id: string) => void
}

function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-amber-500',
    info: 'bg-blue-600',
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl text-white shadow-lg text-sm',
        'animate-in slide-in-from-top duration-200',
        colors[toast.type]
      )}
    >
      <span className="font-bold mt-0.5">{icons[toast.type]}</span>
      <span>{toast.message}</span>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col gap-2 px-4 items-center pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full max-w-sm">
          <Toast toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}

// Hook
let toastCounter = 0
type ToastFn = (message: string, type?: ToastMessage['type']) => void

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast: ToastFn = (message, type = 'info') => {
    const id = String(++toastCounter)
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return { toasts, addToast, dismiss }
}
