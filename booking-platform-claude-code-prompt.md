# Booking Platform — Claude Code Prompt

> 将本文件直接粘贴给 Claude Code 作为项目初始化 prompt。  
> 所有括号内的 `[可配置]` 标注表示可在开始前告知 Claude Code 你的偏好。

---

## 🎯 Project Overview

Build a **mobile-first appointment booking platform** for single-location service studios (e.g. beauty, massage, fitness). The core UX metaphor is **drag-and-drop time blocks onto a weekly calendar grid** — similar to placing puzzle pieces. No multi-tenant support needed; this is a single-studio deployment with one admin account.

**Tech stack to use:**
- **Frontend + Backend:** Next.js 14 (App Router) with TypeScript
- **Styling:** Tailwind CSS (mobile-first, responsive)
- **Drag and Drop:** `@dnd-kit/core` + `@dnd-kit/sortable` (supports touch/mobile)
- **Database:** PostgreSQL via **Prisma ORM**
- **Auth:** NextAuth.js (single admin user, credentials provider)
- **Date/Time:** `date-fns` + `date-fns-tz` for timezone-safe operations
- **iCal Export:** `ical-generator`
- **Deployment target:** Vercel (frontend) + Supabase or Railway (PostgreSQL)

---

## 📁 Project Structure

```
/app
  /page.tsx                  → redirects to /book
  /book/page.tsx             → public booking page (user-facing)
  /admin
    /page.tsx                → admin dashboard (redirect to /admin/calendar)
    /calendar/page.tsx       → admin calendar view
    /settings/page.tsx       → schedule rules + global settings
    /time-blocks/page.tsx    → manage time block types
    /staff/page.tsx          → manage staff members
    /links/page.tsx          → generate booking tokens/links
  /api
    /auth/[...nextauth]/     → NextAuth
    /slots/route.ts          → GET available slots for a week
    /appointments/route.ts   → POST create appointment
    /admin/appointments/     → GET list, PUT update, DELETE cancel
    /admin/schedule-rules/   → CRUD for weekly schedule rules
    /admin/settings/         → GET/PUT staff settings
    /admin/time-blocks/      → CRUD time block types
    /admin/staff/            → CRUD staff members
    /admin/tokens/           → POST generate booking token
    /admin/export/ics/       → GET export iCalendar file
    /booking-token/[token]/  → GET prefill data from token
/components
  /calendar/
    WeeklyCalendar.tsx       → shared calendar grid component
    CalendarHeader.tsx       → week navigation + month picker toggle
    TimeColumn.tsx           → left-side hour labels (every 2hrs)
    CalendarCell.tsx         → individual hour×day cell
    AppointmentBlock.tsx     → rendered appointment in admin view
    MiniCalendar.tsx         → full month/year picker overlay
  /booking/
    TimeBlockTray.tsx        → bottom tray with draggable time blocks
    DraggableTimeBlock.tsx   → individual draggable block
    StartTimePicker.tsx      → bottom sheet modal for exact time selection
    BookingForm.tsx          → client info form
    StaffToggle.tsx          → horizontal staff selector
  /admin/
    AppointmentModal.tsx     → click-to-edit appointment details
    ScheduleRuleEditor.tsx   → per-day time range editor (like 3CX hours)
    TimeBlockEditor.tsx      → create/edit time block types
    StaffLinkGenerator.tsx   → booking token generator
  /ui/
    BottomSheet.tsx          → mobile-friendly modal from bottom
    ColorPicker.tsx          → color label selector
    Legend.tsx               → calendar color legend
/lib
  /prisma.ts                 → Prisma client singleton
  /slots.ts                  → slot availability computation logic
  /conflict.ts               → conflict detection utilities
  /ical.ts                   → iCal export builder
  /auth.ts                   → NextAuth config
/prisma
  schema.prisma
```

---

## 🗄️ Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Studio {
  id         String  @id @default(cuid())
  name       String
  logoUrl    String?
  brandColor String? @default("#6366f1")
  staffs     Staff[]
}

model Staff {
  id           String        @id @default(cuid())
  studioId     String
  name         String
  avatarUrl    String?
  isActive     Boolean       @default(true)
  studio       Studio        @relation(fields: [studioId], references: [id])
  settings     StaffSettings?
  scheduleRules ScheduleRule[]
  appointments  Appointment[]
  timeBlocks   TimeBlock[]
  bookingTokens BookingToken[]
}

model StaffSettings {
  id              String    @id @default(cuid())
  staffId         String    @unique
  timezone        String    @default("Asia/Shanghai")
  bookingInterval Int       @default(15)   // minutes: 10 | 15 | 30
  bufferMinutes   Int       @default(0)    // buffer after each appointment
  openUntil           DateTime?               // bookings disabled after this date
  calendarStartHour   Int       @default(8)   // visible calendar range start (0-23)
  calendarEndHour     Int       @default(22)  // visible calendar range end (0-23)
  staff               Staff     @relation(fields: [staffId], references: [id])
}

// Weekly recurring schedule rule
model ScheduleRule {
  id        String   @id @default(cuid())
  staffId   String
  dayOfWeek Int      // 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  startTime String   // "HH:mm" e.g. "09:00"
  endTime   String   // "HH:mm" e.g. "17:00"
  slotType  SlotType
  staff     Staff    @relation(fields: [staffId], references: [id])
}

model TimeBlock {
  id           String        @id @default(cuid())
  staffId      String
  name         String        // e.g. "基础护理"
  durationMins Int           // e.g. 60
  color        String        @default("#818cf8") // hex color
  isActive     Boolean       @default(true)
  staff        Staff         @relation(fields: [staffId], references: [id])
  appointments Appointment[]
}

model Appointment {
  id           String            @id @default(cuid())
  staffId      String
  timeBlockId  String
  clientName   String
  phone        String?
  email        String?
  wechat       String?
  startTime    DateTime          // UTC stored
  endTime      DateTime          // UTC stored (startTime + durationMins)
  status       AppointmentStatus @default(PENDING)
  notes        String?
  bookingToken String?           // token used to prefill
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
  staff        Staff             @relation(fields: [staffId], references: [id])
  timeBlock    TimeBlock         @relation(fields: [timeBlockId], references: [id])
}

model BookingToken {
  id          String    @id @default(cuid())
  token       String    @unique @default(cuid())
  staffId     String?   // optional: pre-select a staff member
  clientName  String?
  phone       String?
  email       String?
  wechat      String?
  expiresAt   DateTime?
  usedAt      DateTime?
  staff       Staff?    @relation(fields: [staffId], references: [id])
  createdAt   DateTime  @default(now())
}

// Single admin user (no registration needed)
model AdminUser {
  id           String @id @default(cuid())
  username     String @unique
  passwordHash String
}

enum SlotType {
  AVAILABLE
  PENDING_CONFIRM
  UNAVAILABLE
}

enum AppointmentStatus {
  CONFIRMED   // for AVAILABLE slots: auto-confirmed
  PENDING     // for PENDING_CONFIRM slots: awaiting admin
  CANCELLED
}
```

---

## 🔌 API Specification

### Public APIs (no auth)

```
GET  /api/slots?staffId=&weekStart=2026-02-16
     → Returns array of { date, hour, slotType, availableStartTimes[] }
     weekStart must be a Monday in ISO format (YYYY-MM-DD)

POST /api/appointments
     Body: { staffId, timeBlockId, startTime (ISO), clientName, phone?, email?, wechat?, bookingToken? }
     → Runs conflict check → 201 created | 409 conflict

GET  /api/booking-token/:token
     → { staffId?, clientName?, phone?, email?, wechat? } or 404
```

### Admin APIs (require session)

```
GET    /api/admin/appointments?staffId=&start=&end=
PUT    /api/admin/appointments/:id   body: { startTime?, timeBlockId?, status?, notes? }
DELETE /api/admin/appointments/:id

GET    /api/admin/schedule-rules?staffId=
POST   /api/admin/schedule-rules     body: { staffId, dayOfWeek, startTime, endTime, slotType }
PUT    /api/admin/schedule-rules/:id
DELETE /api/admin/schedule-rules/:id

GET    /api/admin/settings/:staffId
PUT    /api/admin/settings/:staffId  body: { timezone?, bookingInterval?, bufferMinutes?, openUntil? }

GET    /api/admin/time-blocks?staffId=
POST   /api/admin/time-blocks        body: { staffId, name, durationMins, color }
PUT    /api/admin/time-blocks/:id
DELETE /api/admin/time-blocks/:id

GET    /api/admin/staff
POST   /api/admin/staff              body: { name, avatarUrl? }
PUT    /api/admin/staff/:id
DELETE /api/admin/staff/:id

POST   /api/admin/tokens             body: { staffId?, clientName?, phone?, email?, wechat?, expiresAt? }
       → { token, bookingUrl }

GET    /api/admin/export/ics?staffId=&start=&end=
       → .ics file download
```

### Conflict Detection Logic (implement in `/lib/conflict.ts`)

Every write operation that touches appointment times must call `checkConflict()` before committing:

```typescript
// Returns null if no conflict, or { conflictingAppointment } if conflict found
async function checkConflict(
  staffId: string,
  startTime: Date,
  endTime: Date,           // endTime includes buffer: appointment.endTime + bufferMinutes
  excludeAppointmentId?: string
): Promise<ConflictResult>
```

Return HTTP `409 Conflict` with body `{ error: "TIME_CONFLICT", conflicting: { startTime, endTime, clientName } }` if conflict detected.

---

## 📅 Calendar Grid — Detailed Spec

### Layout Rules

- **Display range:** Admin-configurable per staff in `StaffSettings`: `calendarStartHour` (default `8`) and `calendarEndHour` (default `22`). Stored as integers (0–23). Shown as dropdowns in the settings page ("日历显示开始时间" / "日历显示结束时间"). The calendar renders only rows within this range; time outside it is not visible to users.
- **Grid:** 7 columns (Mon–Sun) × N rows (one row per hour in the display range)
- **Time labels:** Show on the left column every **2 hours** (e.g., 8:00 AM, 10:00 AM, 12:00 PM…). Each hour row is equal height.
- **Week navigation:** `[<]` and `[>]` buttons change the displayed week by 7 days. The header shows `2026 Feb 16–22`.
- **Mini calendar toggle:** Clicking the date header expands a full month calendar overlay. Selecting a date navigates to that week. The week containing the selected date gets highlighted as a row.
- **Today's date** is highlighted in the calendar header.

### Cell Visual States (User-facing)

| State | Visual |
|-------|--------|
| UNAVAILABLE | Gray background, not droppable |
| AVAILABLE | White background, droppable (green dashed border on hover/drag-over) |
| PENDING_CONFIRM | Light yellow `#fef9c3` background, droppable |
| BOOKED (past appointments) | Gray, shows client initials, not droppable |
| Drag-over invalid | Red dashed border |
| Drag-over valid | Green dashed border + subtle scale animation |

### Slot Computation Algorithm

For a given `staffId` and week, compute each cell's state:

1. Start with all cells as `UNAVAILABLE`
2. Apply `ScheduleRule` entries: set cells within rule time ranges to the rule's `slotType`
3. If `openUntil` is set and cell date is after `openUntil`, override to `UNAVAILABLE`
4. For each existing `Appointment` (status ≠ CANCELLED): mark occupied cells as `UNAVAILABLE`, also mark buffer window after each appointment as `UNAVAILABLE`
5. For each cell, compute `availableStartTimes[]` based on `bookingInterval`: all multiples of `bookingInterval` within that hour that fall within an AVAILABLE or PENDING_CONFIRM schedule rule window and are not blocked by appointments/buffers

---

## 🖱️ Drag-and-Drop — Detailed Interaction Spec

### User Booking Flow

**Setup:**
- Bottom of screen shows a horizontal scrollable **Time Block Tray** with all active `TimeBlock` items for the selected staff
- Each tray item shows: color swatch + name + duration (e.g., `● 基础护理 60min`)
- Tray is fixed at bottom; calendar scrolls above it

**Drag Start:**
- User touches/clicks a time block in the tray
- A **floating banner** appears at the top of the screen: `"请将时间块拖入想要预约的小时内"`
- The dragged item follows the finger as a semi-transparent clone
- The tray dims slightly

**Drag Over Calendar:**
- When hovering over an AVAILABLE or PENDING_CONFIRM cell: show **green dashed border** on that cell
- When hovering over an UNAVAILABLE/BOOKED cell: show **red dashed border**, no drop allowed
- Use `@dnd-kit` droppable zones = one per calendar cell (identified by `date+hour` key)

**Drop (valid cell):**
- Time block snaps back to tray
- A **Bottom Sheet modal** slides up from the bottom:
  ```
  选择开始时间
  ─────────────────────────
  周一 Feb 16 · 8:00 时段
  
  ○ 8:00    ○ 8:15
  ○ 8:30    ○ 8:45
  
  (Only show times from availableStartTimes[] for that cell)
  ─────────────────────────
  [取消]           [确认 →]
  ```
- Tapping **取消**: modal closes, no state change, block returns to tray
- Tapping **确认**: proceed to `BookingForm`

**Drop (invalid cell):**
- Block snaps back to tray with a brief shake animation
- No modal shown

### Admin Calendar Drag (Rescheduling)

- Existing appointment blocks on admin calendar are also draggable
- Admin can drag an appointment block to a new cell
- On drop: run conflict check via `PUT /api/admin/appointments/:id` with new `startTime`
- If conflict: show toast error, block snaps back
- If success: calendar refreshes optimistically

---

## 📱 Mobile UX Requirements

- **Touch targets:** Minimum 44×44px for all interactive elements
- **Bottom Sheet:** Use for all modals/dialogs on mobile (slide up from bottom). Implement with a reusable `<BottomSheet>` component using CSS `transform: translateY` + backdrop blur.
- **Calendar scroll:** Vertical scroll for time axis. Horizontal axis is fixed (all 7 days visible). Use `position: sticky` for the day headers and the time label column.
- **Drag activation:** Use `@dnd-kit` `PointerSensor` with `activationConstraint: { delay: 150, tolerance: 5 }` to prevent accidental drags during page scroll.
- **Time block tray:** When a block is being dragged, collapse the tray (translate it down) so maximum calendar area is visible.
- **Font sizes:** Minimum 14px for all body text. Calendar cell text can be 11–12px.

---

## 👤 User-Facing Booking Page (`/book`)

### Page Structure

```
┌────────────────────────────────┐
│  [Studio Logo]  Studio Name    │
├────────────────────────────────┤
│  Staff: [张技师] [李技师] ...   │  ← horizontal chip toggle
├────────────────────────────────┤
│  Legend: ⬜Available 🟨Confirm ⬛Unavailable  │
├──────┬─────────────────────────┤
│      │ Mon  Tue  Wed  Thu  Fri  Sat  Sun │
│ 8AM  │ [  ] [  ] [  ] [  ] [  ] [  ] [  ]│
│      │ [  ] [  ] ...                      │
│10AM  │                                    │
│      │                                    │
│      │  (Booked cells show as gray)       │
├────────────────────────────────┤
│  TIME BLOCK TRAY (sticky bottom)│
│  [● 60min 基础护理] [● 90min 深度] │
└────────────────────────────────┘
```

### Booking Form Fields

After selecting a start time, show `BookingForm`:

```
预约确认
─────────────────────────
技师: 张技师
时间: 2026-02-16 08:15 – 09:15
服务: 基础护理 60min
─────────────────────────
姓名 *        [input]
手机号         [input]
Email          [input]  
微信名          [input]
─────────────────────────
(Validation: clientName required + at least one contact field)
─────────────────────────
[← 返回]          [确认预约]
```

- On submit: `POST /api/appointments`
- On `409 Conflict`: show error toast "该时间段已被预约，请选择其他时间"
- On success:
  - `CONFIRMED` status: show "预约成功！" confirmation screen
  - `PENDING` status: show "预约申请已提交，等待确认"
- **Note:** After booking is confirmed, users cannot reschedule via the app. Show a note: "如需改期或取消，请联系店铺"

### Booking Token Prefill

If URL has `?token=abc123`, call `GET /api/booking-token/abc123` and prefill the form fields. Token is transparent to the user.

---

## 🔧 Admin Panel

### Authentication

- Single admin account stored in `AdminUser` table
- `POST /api/auth/[...nextauth]` using `CredentialsProvider`
- Password stored as bcrypt hash
- On first run (no AdminUser exists), show a setup page to create the admin account
- All `/admin/*` routes are protected; redirect to `/admin/login` if not authenticated

### Admin Calendar View (`/admin/calendar`)

- Same weekly calendar grid as user view
- Staff selector tabs at top
- Each booked cell shows: client name (truncated) in the block's color
- **Clicking a cell with an appointment** opens `AppointmentModal`:

```
预约详情
─────────────────────────
客户: 李小明
联系: 📱 138xxxx  ✉ li@email.com  💬 wxlxm
─────────────────────────
开始时间: [datetime picker, editable]
结束时间: 09:15 (auto-calculated, read-only)
服务: [TimeBlock dropdown, changeable]
状态: 待确认 / 已确认
备注: [textarea]
─────────────────────────
[取消预约]  [保存更改]  [✕ 关闭]
```

- "取消预约" requires confirmation: "确认取消该预约？" `[确认取消] [返回]`
- Admin can also drag appointment blocks to new cells (reschedule)
- Conflict check runs on every save/drag

### Schedule Settings (`/admin/settings`)

**Global Settings section:**
- Studio name (text input)
- Studio logo (file upload, stored as base64 or URL)
- Brand color (color picker)

**Per-Staff Settings section** (one settings panel per selected staff):
- Timezone (searchable dropdown of IANA timezones)
- Booking interval: radio buttons `10分钟 | 15分钟 | 30分钟`
- Buffer time after appointment: input in minutes
- Booking open until: date picker (optional; leave empty = no limit)
- **Calendar display range:** "日历开始时间" dropdown (hourly options 0:00–23:00) + "日历结束时间" dropdown. Validates that end > start. Default 8:00–22:00.

**Weekly Schedule Rules** (3CX-style, per selected staff):

```
Monday
  ＋ 添加时段
  [09:00 – 12:00]  [Available ▼]  [🗑]
  [14:00 – 18:00]  [Available ▼]  [🗑]

Tuesday
  ＋ 添加时段
  [10:00 – 17:00]  [Pending Confirm ▼]  [🗑]

Wednesday  (no rules = full day Unavailable)
  ＋ 添加时段

...
```

- Each rule row: start time picker + end time picker + status dropdown (Available / Pending Confirm / Unavailable) + delete button
- Rules with overlapping time ranges on the same day should show a validation warning (do not save)

### Time Block Management (`/admin/time-blocks`)

Table of time blocks for selected staff:

| Name | Duration | Color | Active | Actions |
|------|----------|-------|--------|---------|
| 基础护理 | 60 min | 🟣 | ✓ | Edit / Delete |
| 深度疗程 | 90 min | 🟦 | ✓ | Edit / Delete |

- Create new: name + duration (number input, minutes) + color picker + active toggle
- Deleting a time block that has existing appointments: show warning and prevent deletion (or soft-deactivate only)

### Booking Link Generator (`/admin/links`)

```
生成专属预约链接
─────────────────────────
指定技师:    [All ▼ / 张技师 ▼]
客户姓名:    [input]
手机号:      [input]
Email:       [input]
微信名:      [input]
链接有效期:  [无限期 ▼ / 7天 / 30天]
─────────────────────────
[生成链接]

─── 已生成链接 ───
https://yourdomain.com/book?token=xyz123
[📋 复制]  [生效: 永久]
```

- List of previously generated tokens below (token, created date, used status)

### iCal Export (`/admin/calendar` → export button)

- Button: "导出日历 (.ics)"
- Options modal: staff selector + date range picker
- Calls `GET /api/admin/export/ics?staffId=&start=&end=`
- Returns `.ics` file with one VEVENT per CONFIRMED/PENDING appointment
- VEVENT fields: SUMMARY (client name + service), DTSTART, DTEND, DESCRIPTION (contact info + service name), STATUS

---

## ⚠️ Conflict Detection — Frontend UX

When any of these actions are attempted, run a conflict check (either client-side pre-validation or by checking the API response):

1. **User drops a time block and confirms a start time** → `POST /api/appointments` returns 409
2. **Admin saves appointment modal with modified time** → `PUT /api/admin/appointments/:id` returns 409
3. **Admin drags appointment to new cell** → `PUT /api/admin/appointments/:id` returns 409
4. **Admin saves schedule rule changes** → validate no overlapping rules on the same day+staff client-side before saving

On conflict (409 response from API):
- Show a toast/snackbar: "⚠️ 时间冲突：该时段已被占用（[clientName] [startTime]–[endTime]）"
- Revert any optimistic UI updates
- Do NOT dismiss the current modal/form so user can adjust

---

## 🌍 Timezone Handling

- All `DateTime` values stored in **UTC** in the database
- All display and input uses the **staff's configured timezone** (from `StaffSettings.timezone`)
- Use `date-fns-tz` functions: `toZonedTime`, `fromZonedTime`, `format` with timezone
- Slot computation in `/lib/slots.ts` must convert all times to the staff's timezone before applying schedule rules
- The API `weekStart` parameter is interpreted as a **local date** in the staff's timezone

---

## 🎨 Design Guidelines

- **Primary color:** Configurable per studio (default `#6366f1` indigo). Use CSS custom properties `--brand-color`.
- **Available cells:** `bg-white border border-gray-200`
- **Pending confirm cells:** `bg-yellow-50 border border-yellow-200`
- **Unavailable/booked cells:** `bg-gray-100 text-gray-400`
- **Drag-over valid:** `border-2 border-dashed border-green-400 bg-green-50`
- **Drag-over invalid:** `border-2 border-dashed border-red-400 bg-red-50`
- **Time block tray items:** Pill shape, left color dot, name + duration text, minimum height 48px
- **Appointment blocks in admin:** Colored left border (block's color) on cell, small text with client name
- **Animations:** Use `transition-all duration-150` for smooth hover states. Drop confirmation uses a brief scale bounce.
- **Bottom Sheet:** backdrop `bg-black/40`, sheet `rounded-t-2xl bg-white`, drag handle bar at top

---

## 🏗️ Implementation Order (for Claude Code)

Build in this sequence to keep each phase independently testable:

1. **Database + Prisma setup** — schema, migrations, seed script (creates 1 admin user + 1 staff + sample time blocks + schedule rules)
2. **Auth** — NextAuth credentials provider, admin login page, middleware protecting `/admin`
3. **Slot computation engine** (`/lib/slots.ts` + `/api/slots`) — unit-testable pure functions
4. **User calendar page** — static calendar grid display, week navigation, mini calendar, legend
5. **Drag-and-drop booking** — time block tray, drag interaction, start time picker bottom sheet
6. **Booking form + submission** — form validation, API call, success/error states
7. **Admin calendar view** — appointment blocks display, appointment modal (view + edit)
8. **Admin drag-to-reschedule** — drag existing appointments in admin view
9. **Admin settings page** — schedule rules editor, global settings
10. **Time block management page**
11. **Booking token / link generator page**
12. **iCal export**
13. **Studio branding** (logo upload, name, color)
14. **Polish** — loading states, error boundaries, empty states, toast notifications

---

## 📝 Environment Variables

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 Deployment — Vercel + Supabase

- **Frontend + API routes:** Deploy to Vercel. Use `next build` output. All `/api/*` routes run as Vercel Serverless Functions.
- **Database:** Supabase PostgreSQL. Use the **connection pooler URL** (port 6543, `?pgbouncer=true`) as `DATABASE_URL` for serverless compatibility. Use the direct connection URL (port 5432) as `DIRECT_URL` for Prisma migrations.

```prisma
// Add to datasource in schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")       // pooler URL for runtime
  directUrl = env("DIRECT_URL")         // direct URL for migrations
}
```

- **File uploads (logo):** Use Supabase Storage. Create a public bucket `studio-assets`. Upload via `/api/admin/upload` which returns a public URL stored in `Studio.logoUrl`.
- **Environment variables on Vercel:** Set `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (production domain), `NEXT_PUBLIC_APP_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 🔔 Notifications (Future Feature — Do Not Implement Now)

Reserve these API hooks for later integration:

```typescript
// /lib/notifications.ts — stub only, not wired up
export async function notifyBookingCreated(appointment: Appointment) {
  // TODO: integrate Resend or SendGrid
}
export async function notifyBookingConfirmed(appointment: Appointment) {}
export async function notifyBookingCancelled(appointment: Appointment) {}
```

Call these stubs from the appointment creation/update logic so wiring up real email later requires only filling in the function bodies.

---

All public-facing booking APIs are stateless REST with clear JSON schemas, designed to be consumed by AI agents:

- `GET /api/slots` can be used as a tool by an AI assistant to check availability
- `POST /api/appointments` can be used to complete a booking programmatically
- `POST /api/admin/tokens` can generate a pre-filled booking link to send to a customer
- Keep all request/response schemas documented with TypeScript types (not just inferred) so they can be converted to OpenAI Function Calling or Anthropic Tool Use definitions later
- Add `X-API-Key` header support (optional) to admin endpoints so future AI agents can authenticate without a session cookie

---

## ✅ Definition of Done Checklist

- [ ] Mobile layout works on 375px width (iPhone SE) and 390px (iPhone 14)
- [ ] Drag-and-drop works on iOS Safari and Android Chrome touch
- [ ] Conflict detection prevents double-booking (verified by test)
- [ ] Timezone: a staff in Asia/Tokyo and one in America/New_York show correct local times
- [ ] iCal export opens correctly in Apple Calendar / Google Calendar
- [ ] Admin session expires after browser close (no persistent session)
- [ ] All API write operations validate input with Zod
- [ ] Booking token prefill works and marks token as used
- [ ] Empty states for: no staff, no time blocks, no appointments, week with no availability
