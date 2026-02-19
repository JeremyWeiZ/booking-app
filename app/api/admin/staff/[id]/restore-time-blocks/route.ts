import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/staff/:id/restore-time-blocks
 * Restores only time blocks from default staff for the target staff.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const defaultStaff = await prisma.staff.findFirst({
    where: { isDefault: true },
    include: { timeBlocks: true },
  })

  if (!defaultStaff) {
    return NextResponse.json({ error: '未找到默认设置' }, { status: 404 })
  }

  const targetStaff = await prisma.staff.findUnique({ where: { id: params.id } })
  if (!targetStaff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })

  await prisma.timeBlock.updateMany({
    where: { staffId: params.id },
    data: { isActive: false },
  })

  for (const tb of defaultStaff.timeBlocks.filter((t) => t.isActive)) {
    await prisma.timeBlock.create({
      data: {
        staffId: params.id,
        name: tb.name,
        nameEn: tb.nameEn,
        durationMins: tb.durationMins,
        color: tb.color,
        isActive: true,
      },
    })
  }

  return NextResponse.json({ success: true })
}
