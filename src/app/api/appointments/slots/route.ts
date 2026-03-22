import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
 
// GET /api/appointments/slots
// Returns all machines with their booked time slots for today
export async function GET() {
  const now = new Date()
 
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
 
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)
 
  const machines = await prisma.laundryMachine.findMany({
    orderBy: { machineNumber: "asc" },
    include: {
      appointments: {
        where: {
          status: "BOOKED",
          startTime: { gte: startOfDay },
          endTime: { lte: endOfDay },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  })
 
  return NextResponse.json(machines)
}