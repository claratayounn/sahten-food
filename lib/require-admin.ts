import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

export type AdminCheck =
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>> }
  | { ok: false; response: Response }

export async function requireAdmin(): Promise<AdminCheck> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false, response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) }
  const [adminUser] = await db.select({ role: user.role }).from(user).where(eq(user.id, session.user.id)).limit(1)
  if (adminUser?.role?.trim().toLowerCase() !== 'admin') return { ok: false, response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } }) }
  return { ok: true, session }
}
