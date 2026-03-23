import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, AuthError, unauthorizedResponse } from "@/lib/getCurrentUser"

// POST /api/debug/test-appointment
// Creates a short appointment for testing the timer flow:
// - starts in 10 seconds
// - lasts 3 minutes total
// - grace period is still 10 min but slot is only 3 min so expiry kicks in fast
// DELETE THIS ROUTE BEFORE PRODUCTION

export async function POST(req: NextRequest) {
  let user
  try {
    user = await getCurrentUser(req)
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse(e.message)
    throw e
  }

  const now = new Date()
  const startTime = new Date(now.getTime() + 10 * 1000)       // starts in 10 seconds
  const endTime = new Date(now.getTime() + 3 * 60 * 1000)     // ends in 3 minutes

  // Use machine 1
  const machine = await prisma.laundryMachine.findFirst({
    where: { status: "AVAILABLE" },
  })
  if (!machine) {
    return NextResponse.json({ error: "No available machines" }, { status: 409 })
  }

  const appointment = await prisma.appointment.create({
    data: {
      userId: user.id,
      machineId: machine.id,
      startTime,
      endTime,
    },
    include: { machine: true },
  })

  return NextResponse.json({
    message: "Test appointment created. Starts in 10 seconds, ends in 3 minutes.",
    appointment,
  }, { status: 201 })
}