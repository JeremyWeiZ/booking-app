import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const studio = await prisma.studio.findFirst()
  if (!studio) return NextResponse.json({ name: '预约平台', brandColor: '#6366f1', logoUrl: null })
  return NextResponse.json(studio)
}
