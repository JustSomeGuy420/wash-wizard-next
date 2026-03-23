import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, AuthError, unauthorizedResponse } from "@/lib/getCurrentUser"

// GET /api/notifications
// Returns unread notifications for current user
export async function GET(req: NextRequest) {
  let user
  try {
    user = await getCurrentUser(req)
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse(e.message)
    throw e
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, read: false },
    orderBy: { timestamp: "desc" },
  })

  return NextResponse.json(notifications)
}

// PATCH /api/notifications
// Marks all notifications as read
export async function PATCH(req: NextRequest) {
  let user
  try {
    user = await getCurrentUser(req)
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse(e.message)
    throw e
  }

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  })

  return NextResponse.json({ success: true })
}