import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/staff/:id/restore-defaults
 * Copies settings and time blocks from the default staff to the given staff.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const defaultStaff = await prisma.staff.findFirst({
    where: { isDefault: true },
    include: { settings: true, timeBlocks: true },
  })

  if (!defaultStaff) {
    return NextResponse.json({ error: '未找到默认设置' }, { status: 404 })
  }

  const targetStaff = await prisma.staff.findUnique({ where: { id: params.id } })
  if (!targetStaff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })

  // Copy settings
  if (defaultStaff.settings) {
    const { id: _id, staffId: _staffId, ...settingsData } = defaultStaff.settings
    await prisma.staffSettings.upsert({
      where: { staffId: params.id },
      update: settingsData,
      create: { staffId: params.id, ...settingsData },
    })
  }

  // Copy time blocks (deactivate existing, create new ones from defaults)
  await prisma.timeBlock.updateMany({
    where: { staffId: params.id },
    data: { isActive: false },
  })

  for (const tb of defaultStaff.timeBlocks.filter((t) => t.isActive)) {
    await prisma.timeBlock.create({
      data: {
        staffId: params.id,
        name: tb.name,
        durationMins: tb.durationMins,
        color: tb.color,
        isActive: true,
      },
    })
  }

  return NextResponse.json({ success: true })
}
