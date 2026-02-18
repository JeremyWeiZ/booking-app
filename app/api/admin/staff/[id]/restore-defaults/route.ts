import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/staff/:id/restore-defaults
 * Copies staff settings and schedule rules from the default staff
 * to the given staff (no time block changes).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const defaultStaff = await prisma.staff.findFirst({
    where: { isDefault: true },
    include: { settings: true, scheduleRules: true },
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

  // Replace schedule rules from default staff
  await prisma.scheduleRule.deleteMany({ where: { staffId: params.id } })
  if (defaultStaff.scheduleRules.length > 0) {
    await prisma.scheduleRule.createMany({
      data: defaultStaff.scheduleRules.map((rule) => ({
        staffId: params.id,
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
        slotType: rule.slotType,
      })),
    })
  }

  return NextResponse.json({ success: true })
}
