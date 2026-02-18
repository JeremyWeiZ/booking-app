import { SessionProvider } from '@/components/admin/SessionProvider'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
