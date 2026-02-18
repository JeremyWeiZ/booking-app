'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin/calendar', label: '日历' },
  { href: '/admin/settings', label: '设置' },
  { href: '/admin/time-blocks', label: '服务项目' },
  { href: '/admin/staff', label: '员工' },
  { href: '/admin/links', label: '预约链接' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-1 h-14">
          <span className="font-bold text-indigo-600 mr-4">管理后台</span>

          <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="ml-2 text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
          >
            退出
          </button>
        </div>
      </div>
    </nav>
  )
}
