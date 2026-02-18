import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  staffId: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = querySchema.parse({
    staffId: searchParams.get('staffId') ?? undefined,
    start: searchParams.get('start') ?? undefined,
    end: searchParams.get('end') ?? undefined,
  })

  const appointments = await prisma.appointment.findMany({
    where: {
      staffId: query.staffId,
      startTime: query.start ? { gte: new Date(query.start) } : undefined,
      endTime: query.end ? { lte: new Date(query.end) } : undefined,
    },
    include: { timeBlock: true, staff: true },
    orderBy: { startTime: 'asc' },
  })

  return NextResponse.json(appointments)
}
