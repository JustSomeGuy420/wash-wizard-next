import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, AuthError, unauthorizedResponse } from "@/lib/getCurrentUser"

// POST /api/appointments/[id]/start
// Student marks their laundry as loaded and started
export async function POST(
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

  if (appointment.status !== "PENDING_START") {
    return NextResponse.json(
      { error: "Appointment is not in a startable state" },
      { status: 400 }
    )
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "IN_USE" },
    include: { machine: true },
  })

  // Update machine status to IN_USE
  await prisma.laundryMachine.update({
    where: { id: appointment.machineId },
    data: { status: "IN_USE" },
  })

  return NextResponse.json(updated)
}