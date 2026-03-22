
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, AuthError, unauthorizedResponse } from "@/lib/getCurrentUser"
 
// GET /api/appointments
// Returns the current user's appointments
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
    orderBy: { startTime: "asc" },
  })
 
  return NextResponse.json(appointments)
}
 
// POST /api/appointments
// Books a new appointment
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
 
  const machine = await prisma.laundryMachine.findUnique({ where: { id: machineId } })
  if (!machine) {
    return NextResponse.json({ error: "Machine not found" }, { status: 404 })
  }
  if (machine.status !== "AVAILABLE") {
    return NextResponse.json({ error: "Machine is not available" }, { status: 409 })
  }
 
  // Check for conflicting bookings on this machine
  const conflict = await prisma.appointment.findFirst({
    where: {
      machineId,
      status: "BOOKED",
      startTime: { lt: new Date(endTime) },
      endTime: { gt: new Date(startTime) },
    },
  })
  if (conflict) {
    return NextResponse.json({ error: "Time slot already booked" }, { status: 409 })
  }
 
  const appointment = await prisma.appointment.create({
    data: {
      userId: user.id,
      machineId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    },
    include: { machine: true },
  })
 
  return NextResponse.json(appointment, { status: 201 })
}