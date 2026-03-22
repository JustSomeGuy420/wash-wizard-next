import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
 
const JWT_SECRET = process.env.JWT_SECRET ?? "change-this-in-production"
const SALT_ROUNDS = 10
 
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}
 
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
 
export function signToken(userId: number): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "24h" })
}
 
export function verifyToken(token: string): { sub: number } {
  const payload = jwt.verify(token, JWT_SECRET) as unknown as { sub: string }
  return { sub: parseInt(payload.sub, 10) }
}
 