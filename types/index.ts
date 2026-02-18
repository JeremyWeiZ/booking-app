import { SlotType, AppointmentStatus } from '@prisma/client'

// Extended session user type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

// API Types

export interface SlotCell {
  date: string // YYYY-MM-DD
  hour: number // 0-23
  slotType: SlotType | 'BOOKED'
  availableStartTimes: string[] // "HH:mm"
}

export interface CreateAppointmentBody {
  staffId: string
  timeBlockId: string
  startTime: string // ISO datetime
  clientName: string
  phone?: string
  email?: string
  wechat?: string
  bookingToken?: string
}

export interface AppointmentResponse {
  id: string
  staffId: string
  timeBlockId: string
  clientName: string
  phone: string | null
  email: string | null
  wechat: string | null
  startTime: string
  endTime: string
  status: AppointmentStatus
  notes: string | null
  bookingToken: string | null
  createdAt: string
  updatedAt: string
}

export interface TimeBlockResponse {
  id: string
  staffId: string
  name: string
  durationMins: number
  color: string
  isActive: boolean
}

export interface StaffResponse {
  id: string
  studioId: string
  name: string
  avatarUrl: string | null
  isActive: boolean
  settings: StaffSettingsResponse | null
}

export interface StaffSettingsResponse {
  id: string
  staffId: string
  timezone: string
  bookingInterval: number
  bufferMinutes: number
  openUntil: string | null
  calendarStartHour: number
  calendarEndHour: number
}

export interface ScheduleRuleResponse {
  id: string
  staffId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  slotType: SlotType
}

export interface BookingTokenResponse {
  id: string
  token: string
  staffId: string | null
  clientName: string | null
  phone: string | null
  email: string | null
  wechat: string | null
  expiresAt: string | null
  usedAt: string | null
  createdAt: string
}

export interface ConflictError {
  error: 'TIME_CONFLICT'
  conflicting: {
    startTime: string
    endTime: string
    clientName: string
  }
}

export interface StudioResponse {
  id: string
  name: string
  logoUrl: string | null
  brandColor: string | null
}
