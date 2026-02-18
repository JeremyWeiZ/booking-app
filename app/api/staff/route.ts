import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const studio = await prisma.studio.findFirst()
  if (!studio) return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } })

  const staffs = await prisma.staff.findMany({
    where: { studioId: studio.id, isActive: true, isDefault: false },
    include: { settings: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(staffs, { headers: { 'Cache-Control': 'no-store' } })
}
