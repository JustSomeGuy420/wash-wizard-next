import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { User } from "@/generated/prisma/client"

export async function getCurrentUser(req: NextRequest): Promise<User> {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid authorization header")
  }

  const token = authHeader.slice(7)

  let userId: number
  try {
    const payload = verifyToken(token)
    userId = payload.sub
  } catch {
    throw new AuthError("Invalid or expired token")
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AuthError("User not found")

  return user
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthError"
  }
}

export function unauthorizedResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 401 })
}