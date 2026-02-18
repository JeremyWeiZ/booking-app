import { Suspense } from 'react'
import BookingPageClient from './BookingPageClient'

export const dynamic = 'force-dynamic'

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    }>
      <BookingPageClient />
    </Suspense>
  )
}
