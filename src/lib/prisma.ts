import path from "path"
import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaClient } from "../generated/prisma/client"

const rawUrl = process.env.DATABASE_URL
if (!rawUrl) throw new Error("DATABASE_URL is not set")

// Resolve relative file:// paths using process.cwd() (project root)
// so the adapter always points to the same file as prisma db push
function resolveDbUrl(url: string): string {
  if (!url.startsWith("file:")) return url
  const filePath = url.slice("file:".length)
  if (path.isAbsolute(filePath)) return url
  return `file:${path.resolve(process.cwd(), filePath)}`
}

const connectionString = resolveDbUrl(rawUrl)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaBetterSQLite3({ url: connectionString })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
