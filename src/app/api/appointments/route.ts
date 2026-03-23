import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, AuthError, unauthorizedResponse } from "@/lib/getCurrentUser"

const GRACE_PERIOD_MS = 10 * 60 * 1000 // 10 minutes

// GET /api/appointments
export async function GET(req: NextRequest) {
  let user
  try {
    user = await getCurrentUser(req)
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse(e.message)
    throw e
  }

  const appointments = await prisma.appointment.findMany({
    where: { userId: user.id },
    include: { machine: true },
    orderBy: { startTime: "desc" },
  })

  return NextResponse.json(appointments)
}

// POST /api/appointments
export async function POST(req: NextRequest) {
  let user
  try {
    user = await getCurrentUser(req)
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse(e.message)
    throw e
  }

  const { machineId, startTime, endTime } = await req.json()

  if (!machineId || !startTime || !endTime) {
    return NextResponse.json(
      { error: "machineId, startTime and endTime are required" },
      { status: 400 }
    )
  }

  const now = new Date()
  const start = new Date(startTime)
  const end = new Date(endTime)

  const machine = await prisma.laundryMachine.findUnique({ where: { id: machineId } })
  if (!machine) {
    return NextResponse.json({ error: "Machine not found" }, { status: 404 })
  }
  if (machine.status === "OUT_OF_ORDER") {
    return NextResponse.json({ error: "Machine is out of order" }, { status: 409 })
  }

  // Check for conflicts on this machine - any active status blocks the slot
  const machineConflict = await prisma.appointment.findFirst({
    where: {
      machineId,
      status: { in: ["BOOKED", "PENDING_START", "IN_USE"] },
      startTime: { lt: end },
      endTime: { gt: start },
    },
  })
  if (machineConflict) {
    return NextResponse.json({ error: "Time slot already booked" }, { status: 409 })
  }

  // Check if slot was recently expired - only allow rebooking within 10 min of expiry
  const recentlyExpired = await prisma.appointment.findFirst({
    where: {
      machineId,
      status: "EXPIRED",
      startTime: { lt: end },
      endTime: { gt: start },
    },
  })
  if (recentlyExpired) {
    const expiredAt = recentlyExpired.expiredAt
    if (!expiredAt || now.getTime() > expiredAt.getTime() + GRACE_PERIOD_MS) {
      return NextResponse.json(
        { error: "The rebooking window for this slot has passed" },
        { status: 409 }
      )
    }
  }

  const appointment = await prisma.appointment.create({
    data: {
      userId: user.id,
      machineId,
      startTime: start,
      endTime: end,
    },
    include: { machine: true },
  })

  return NextResponse.json(appointment, { status: 201 })
}