import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/machines
// Returns all laundry machines
export async function GET() {
  const machines = await prisma.laundryMachine.findMany({
    orderBy: { machineNumber: "asc" },
  })
  return NextResponse.json(machines)
}
