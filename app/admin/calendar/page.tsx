import { Suspense } from 'react'
import AdminCalendarClient from './AdminCalendarClient'
import AdminNav from '@/components/admin/AdminNav'

export const dynamic = 'force-dynamic'

export default function AdminCalendarPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }>
        <AdminCalendarClient />
      </Suspense>
    </div>
  )
}
