import { PrismaClient, SlotType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
    },
  })
  console.log('Admin user created:', adminUser.username)

  // Create studio
  const studio = await prisma.studio.upsert({
    where: { id: 'studio-main' },
    update: {},
    create: {
      id: 'studio-main',
      name: '美丽时光美容工作室',
      brandColor: '#6366f1',
    },
  })
  console.log('Studio created:', studio.name)

  // Create default staff (template, hidden from users)
  const defaultStaff = await prisma.staff.upsert({
    where: { id: 'staff-default' },
    update: {},
    create: {
      id: 'staff-default',
      studioId: studio.id,
      name: '默认设置',
      isActive: true,
      isDefault: true,
    },
  })

  // Create staff member 1
  const staff1 = await prisma.staff.upsert({
    where: { id: 'staff-zhang' },
    update: {},
    create: {
      id: 'staff-zhang',
      studioId: studio.id,
      name: '张技师',
      isActive: true,
    },
  })

  // Create staff member 2
  const staff2 = await prisma.staff.upsert({
    where: { id: 'staff-li' },
    update: {},
    create: {
      id: 'staff-li',
      studioId: studio.id,
      name: '李技师',
      isActive: true,
    },
  })
  console.log('Staff created:', defaultStaff.name, staff1.name, staff2.name)

  // Create default staff settings
  await prisma.staffSettings.upsert({
    where: { staffId: defaultStaff.id },
    update: {},
    create: {
      staffId: defaultStaff.id,
      timezone: 'Asia/Shanghai',
      bookingInterval: 15,
      bufferMinutes: 10,
      calendarStartHour: 9,
      calendarEndHour: 20,
    },
  })

  // Default staff schedule: Mon-Sat 10:00-19:00
  for (const day of [1, 2, 3, 4, 5, 6]) {
    await prisma.scheduleRule.upsert({
      where: { id: `rule-default-day${day}` },
      update: {},
      create: {
        id: `rule-default-day${day}`,
        staffId: defaultStaff.id,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '19:00',
        slotType: SlotType.AVAILABLE,
      },
    })
  }

  // Default time blocks
  const defaultTimeBlocks = [
    { id: 'tb-default-basic', staffId: defaultStaff.id, name: '基础护理', durationMins: 60, color: '#818cf8' },
    { id: 'tb-default-deep', staffId: defaultStaff.id, name: '深度疗程', durationMins: 90, color: '#34d399' },
    { id: 'tb-default-express', staffId: defaultStaff.id, name: '快速护理', durationMins: 30, color: '#fb923c' },
  ]
  for (const tb of defaultTimeBlocks) {
    await prisma.timeBlock.upsert({ where: { id: tb.id }, update: {}, create: tb })
  }
  console.log('Default staff settings and template blocks created')

  // Create staff settings
  await prisma.staffSettings.upsert({
    where: { staffId: staff1.id },
    update: {},
    create: {
      staffId: staff1.id,
      timezone: 'Asia/Shanghai',
      bookingInterval: 15,
      bufferMinutes: 10,
      calendarStartHour: 8,
      calendarEndHour: 22,
    },
  })

  await prisma.staffSettings.upsert({
    where: { staffId: staff2.id },
    update: {},
    create: {
      staffId: staff2.id,
      timezone: 'Asia/Shanghai',
      bookingInterval: 30,
      bufferMinutes: 0,
      calendarStartHour: 9,
      calendarEndHour: 20,
    },
  })
  console.log('Staff settings created')

  // Create schedule rules for staff1 (Mon-Fri 9:00-17:00 available)
  const daysOfWeek = [1, 2, 3, 4, 5] // Mon-Fri
  for (const day of daysOfWeek) {
    await prisma.scheduleRule.upsert({
      where: { id: `rule-staff1-day${day}` },
      update: {},
      create: {
        id: `rule-staff1-day${day}`,
        staffId: staff1.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        slotType: SlotType.AVAILABLE,
      },
    })
  }

  // Staff2: Mon, Wed, Fri 10:00-18:00 available; Tue, Thu 10:00-18:00 pending confirm
  const staff2Rules = [
    { day: 1, start: '10:00', end: '18:00', type: SlotType.AVAILABLE },
    { day: 2, start: '10:00', end: '18:00', type: SlotType.PENDING_CONFIRM },
    { day: 3, start: '10:00', end: '18:00', type: SlotType.AVAILABLE },
    { day: 4, start: '10:00', end: '18:00', type: SlotType.PENDING_CONFIRM },
    { day: 5, start: '10:00', end: '18:00', type: SlotType.AVAILABLE },
  ]
  for (const rule of staff2Rules) {
    await prisma.scheduleRule.upsert({
      where: { id: `rule-staff2-day${rule.day}` },
      update: {},
      create: {
        id: `rule-staff2-day${rule.day}`,
        staffId: staff2.id,
        dayOfWeek: rule.day,
        startTime: rule.start,
        endTime: rule.end,
        slotType: rule.type,
      },
    })
  }
  console.log('Schedule rules created')

  // Create time blocks
  const timeBlocks = [
    { id: 'tb-basic', staffId: staff1.id, name: '基础护理', durationMins: 60, color: '#818cf8' },
    { id: 'tb-deep', staffId: staff1.id, name: '深度疗程', durationMins: 90, color: '#34d399' },
    { id: 'tb-express', staffId: staff1.id, name: '快速护理', durationMins: 30, color: '#fb923c' },
    { id: 'tb2-basic', staffId: staff2.id, name: '基础护理', durationMins: 60, color: '#818cf8' },
    { id: 'tb2-full', staffId: staff2.id, name: '全套疗程', durationMins: 120, color: '#f472b6' },
  ]
  for (const tb of timeBlocks) {
    await prisma.timeBlock.upsert({
      where: { id: tb.id },
      update: {},
      create: tb,
    })
  }
  console.log('Time blocks created')

  console.log('Seed completed!')
  console.log('\n=== Login Credentials ===')
  console.log('Username: admin')
  console.log('Password: admin123')
  console.log('=========================')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
