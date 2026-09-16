import { auth } from '@/lib/auth'
import { db, pool } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/admin-dashboard'
import { logApiError } from '@/lib/log'

export const dynamic = 'force-dynamic'

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ offset?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const [adminUser] = await db.select({ role: user.role }).from(user).where(eq(user.id, session.user.id)).limit(1)
  const role = adminUser?.role?.trim().toLowerCase()
  if (role !== 'admin') return <main className="auth-page"><section className="auth-card"><p className="eyebrow">Sahten Food</p><h1>Admin access required</h1><p>Your account is signed in, but it has not been granted administrator access.</p></section></main>
  const offset = Math.max(0, Number.parseInt((await searchParams).offset || '0', 10) || 0)
  const pageSize = 50
  let orders: Array<{ id: string; order_number: string; customer_name: string; customer_phone: string; delivery_address: string | null; payment_method: string; payment_reference: string | null; payment_proof_url: string | null; deposit_paid: boolean; balance_paid: boolean; fulfillment: string; ready_date: string; total: string; payment_status: string; status: string; created_at: string; verified_by: string | null; verified_at: string | null; verified_by_name: string | null }> = []
  try {
    const result = await pool.query<{ id: string; order_number: string; customer_name: string; customer_phone: string; delivery_address: string | null; payment_method: string; payment_reference: string | null; payment_proof_url: string | null; deposit_paid: boolean; balance_paid: boolean; fulfillment: string; ready_date: string; total: string; payment_status: string; status: string; created_at: string; verified_by: string | null; verified_at: string | null; verified_by_name: string | null }>(
      'SELECT o.id, o.order_number, o.customer_name, o.customer_phone, o.delivery_address, o.fulfillment, o.ready_date::text, o.total::text, o.payment_method, o.payment_status, o.payment_reference, o.payment_proof_url, o.deposit_paid, o.balance_paid, o.status, o.verified_by, o.verified_at::text, o.created_at::text, COALESCE(v.name, v.email) AS verified_by_name FROM public.orders o LEFT JOIN public."user" v ON v.id = o.verified_by ORDER BY o.created_at DESC LIMIT $1 OFFSET $2', [pageSize, offset],
    )
    orders = result.rows
  } catch (error) {
    logApiError('GET /admin orders', error)
  }
  return <AdminDashboard orders={orders} offset={offset} pageSize={pageSize} />
}
