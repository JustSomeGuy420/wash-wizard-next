import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const { name, email, studentId, password } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email and password are required" },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    )
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      studentId: studentId ?? null,
      hashedPassword: await hashPassword(password),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      loyaltyPoints: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}