import AdminNav from '@/components/admin/AdminNav'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <SettingsClient />
    </div>
  )
}
