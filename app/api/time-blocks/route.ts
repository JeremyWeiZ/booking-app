import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const staffId = new URL(req.url).searchParams.get('staffId')
  if (!staffId) return NextResponse.json({ error: 'staffId required' }, { status: 400 })

  const blocks = await prisma.timeBlock.findMany({
    where: { staffId, isActive: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(blocks)
}
