import AdminNav from '@/components/admin/AdminNav'
import LinksClient from './LinksClient'

export const dynamic = 'force-dynamic'

export default function LinksPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <LinksClient />
    </div>
  )
}
