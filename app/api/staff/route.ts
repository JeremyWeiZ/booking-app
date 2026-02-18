import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const studio = await prisma.studio.findFirst()
  if (!studio) return NextResponse.json([])

  const staffs = await prisma.staff.findMany({
    where: { studioId: studio.id, isActive: true, isDefault: false },
    include: { settings: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(staffs)
}
