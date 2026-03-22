import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaClient } from "../src/generated/prisma/client"
 
const adapter = new PrismaBetterSQLite3({ url: process.env.DATABASE_URL ?? "file:./prisma/wash_wizard.db" })
const prisma = new PrismaClient({ adapter })
 
async function main() {
  for (let i = 1; i <= 5; i++) {
    await prisma.laundryMachine.upsert({
      where: { machineNumber: i },
      update: {},
      create: { machineNumber: i },
    })
  }
  console.log("Seeded 5 laundry machines.")
}
 
main()
  .catch((e) => { throw e })
  .finally(() => prisma.$disconnect())
