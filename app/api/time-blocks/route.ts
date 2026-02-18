import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const staffId = new URL(req.url).searchParams.get('staffId')
  if (!staffId) return NextResponse.json({ error: 'staffId required' }, { status: 400 })

  const blocks = await prisma.timeBlock.findMany({
    where: { staffId, isActive: true },
    orderBy: [{ durationMins: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(blocks, { headers: { 'Cache-Control': 'no-store' } })
}
