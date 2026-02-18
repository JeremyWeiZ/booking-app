import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const studio = await prisma.studio.findFirst()
  if (!studio) {
    return NextResponse.json(
      { name: '预约平台', brandColor: '#6366f1', logoUrl: null },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }
  return NextResponse.json(studio, { headers: { 'Cache-Control': 'no-store' } })
}
