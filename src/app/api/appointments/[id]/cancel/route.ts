import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, AuthError, unauthorizedResponse } from "@/lib/getCurrentUser"
 
// DELETE /api/appointments/[id]/cancel
export async function DELETE(
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
  })
 
  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
  }
  if (appointment.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (appointment.status !== "BOOKED") {
    return NextResponse.json(
      { error: "Only booked appointments can be cancelled" },
      { status: 400 }
    )
  }
 
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED" },
    include: { machine: true },
  })
 
  return NextResponse.json(updated)
}