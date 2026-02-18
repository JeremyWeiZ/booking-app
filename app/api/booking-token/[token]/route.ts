import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const tokenRecord = await prisma.bookingToken.findUnique({
    where: { token: params.token },
  })

  if (!tokenRecord) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 })
  }

  return NextResponse.json({
    staffId: tokenRecord.staffId,
    timeBlockId: tokenRecord.timeBlockId,
    clientName: tokenRecord.clientName,
    phone: tokenRecord.phone,
    email: tokenRecord.email,
    wechat: tokenRecord.wechat,
  })
}
