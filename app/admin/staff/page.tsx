import AdminNav from '@/components/admin/AdminNav'
import StaffClient from './StaffClient'

export const dynamic = 'force-dynamic'

export default function StaffPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <StaffClient />
    </div>
  )
}
