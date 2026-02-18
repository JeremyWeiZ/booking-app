import { Appointment } from '@prisma/client'

// Stub notification functions — wire up Resend/SendGrid later
export async function notifyBookingCreated(_appointment: Appointment) {
  // TODO: integrate Resend or SendGrid
}

export async function notifyBookingConfirmed(_appointment: Appointment) {
  // TODO: integrate Resend or SendGrid
}

export async function notifyBookingCancelled(_appointment: Appointment) {
  // TODO: integrate Resend or SendGrid
}
