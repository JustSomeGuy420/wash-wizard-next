
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, AuthError, unauthorizedResponse } from "@/lib/getCurrentUser"
 
const GRACE_PERIOD_MS = process.env.TEST_GRACE_SECONDS
  ? parseInt(process.env.TEST_GRACE_SECONDS) * 1000
  : 10 * 60 * 1000  // 10 min in production
const FIVE_MIN_MS = 5 * 60 * 1000
 
// GET /api/appointments/[id]/status
// Called by the client every 30s to drive status transitions
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let user
  try {
    user = await getCurrentUser(req)
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse(e.message)
    throw e
  }
 
  const appointmentId = parseInt(params.id, 10)
  if (isNaN(appointmentId)) {
    return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 })
  }
 
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { machine: true },
  })
 
  if (!appointment || appointment.userId !== user.id) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
  }
 
  const now = new Date()
 
  // ── BOOKED → PENDING_START ───────────────────────────────
  // Start time has arrived, student has 10 min to start
  if (appointment.status === "BOOKED" && now >= appointment.startTime) {
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "PENDING_START" },
      include: { machine: true },
    })
    return NextResponse.json(updated)
  }
 
  // ── PENDING_START → EXPIRED ──────────────────────────────
  // 10 min grace period has passed without starting
  if (appointment.status === "PENDING_START") {
    const graceDeadline = new Date(appointment.startTime.getTime() + GRACE_PERIOD_MS)
    if (now > graceDeadline) {
      const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "EXPIRED", expiredAt: now },
        include: { machine: true },
      })
      // Free the machine
      await prisma.laundryMachine.update({
        where: { id: appointment.machineId },
        data: { status: "AVAILABLE" },
      })
      return NextResponse.json(updated)
    }
  }
 
  // ── IN_USE → COMPLETED ───────────────────────────────────
  // End time has passed
  if (appointment.status === "IN_USE" && now >= appointment.endTime) {
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "COMPLETED" },
      include: { machine: true },
    })
    // Free the machine
    await prisma.laundryMachine.update({
      where: { id: appointment.machineId },
      data: { status: "AVAILABLE" },
    })
    // Create completion notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        message: `Your laundry on Machine #${appointment.machine.machineNumber} is done! Please collect your clothes.`,
      },
    })
    return NextResponse.json(updated)
  }
 
  // ── IN_USE — 5 min warning ───────────────────────────────
  if (appointment.status === "IN_USE" && !appointment.notifiedFiveMin) {
    const fiveMinWarning = new Date(appointment.endTime.getTime() - FIVE_MIN_MS)
    if (now >= fiveMinWarning) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { notifiedFiveMin: true },
      })
      await prisma.notification.create({
        data: {
          userId: user.id,
          message: `5 minutes left on Machine #${appointment.machine.machineNumber}. Please prepare to collect your laundry.`,
        },
      })
    }
  }
 
  // Re-fetch to return latest state
  const latest = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { machine: true },
  })
 
  return NextResponse.json(latest)
}