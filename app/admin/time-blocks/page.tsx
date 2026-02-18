import AdminNav from '@/components/admin/AdminNav'
import TimeBlocksClient from './TimeBlocksClient'

export const dynamic = 'force-dynamic'

export default function TimeBlocksPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <TimeBlocksClient />
    </div>
  )
}
