import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  avatarUrl: z.string().url().optional().or(z.literal('')),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get the first studio (single-studio deployment)
  const studio = await prisma.studio.findFirst()
  if (!studio) return NextResponse.json([])

  const staffs = await prisma.staff.findMany({
    where: { studioId: studio.id },
    include: { settings: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(staffs)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  // Get or create default studio
  let studio = await prisma.studio.findFirst()
  if (!studio) {
    studio = await prisma.studio.create({
      data: { name: '美丽时光美容工作室', brandColor: '#6366f1' },
    })
  }

  const staff = await prisma.staff.create({
    data: {
      studioId: studio.id,
      name: parsed.data.name,
      avatarUrl: parsed.data.avatarUrl || null,
    },
    include: { settings: true },
  })

  // Auto-apply default settings & time blocks if a default staff exists
  const defaultStaff = await prisma.staff.findFirst({
    where: { isDefault: true },
    include: { settings: true, timeBlocks: true },
  })

  if (defaultStaff?.settings) {
    const { id: _id, staffId: _staffId, ...settingsData } = defaultStaff.settings
    await prisma.staffSettings.create({ data: { staffId: staff.id, ...settingsData } })
  }

  if (defaultStaff) {
    for (const tb of defaultStaff.timeBlocks.filter((t) => t.isActive)) {
      await prisma.timeBlock.create({
        data: {
          staffId: staff.id,
          name: tb.name,
          nameEn: tb.nameEn,
          durationMins: tb.durationMins,
          color: tb.color,
        },
      })
    }
  }

  return NextResponse.json(staff, { status: 201 })
}
