import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { orders, orderItems } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { headers } from 'next/headers'
import { requireAdmin } from '@/lib/require-admin'
import { validateStatusTransition } from '@/lib/order-validation'

const allowedStatus = new Set(['pending', 'preparing', 'ready', 'completed', 'cancelled'])
const allowedPaymentStatus = new Set(['unpaid', 'partially_paid', 'paid', 'refunded'])


export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json(JSON.parse(await check.response.text()), { status: check.response.status })
  const { id } = await params
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  const items = await db.select({ id: orderItems.id, name: orderItems.nameSnapshot, price: orderItems.priceSnapshot, quantity: orderItems.quantity, service: orderItems.selectedService, serviceFee: orderItems.serviceFeeSnapshot }).from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.id))
  return NextResponse.json({ order, items })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json(JSON.parse(await check.response.text()), { status: check.response.status })
  const body = await request.json()
  if (body.status && !allowedStatus.has(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  if (body.paymentStatus && !allowedPaymentStatus.has(body.paymentStatus)) return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
  const { id } = await params
  const [currentOrder] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, id)).limit(1)
  if (!currentOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (body.status !== undefined && !validateStatusTransition(currentOrder.status, body.status)) return NextResponse.json({ error: `Invalid status transition: ${currentOrder.status} → ${body.status}` }, { status: 400 })
  const update: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() }
  if (body.status !== undefined) { update.status = body.status; if (body.status === 'ready' && currentOrder.status !== 'ready') update.readyAt = new Date(); update.lastVerifiedBy = (await auth.api.getSession({ headers: await headers() }))?.user?.id; update.lastVerifiedAt = new Date() }
  if (body.paymentStatus !== undefined || body.depositPaid !== undefined || body.balancePaid !== undefined || body.paymentReference !== undefined || body.paymentProofUrl !== undefined) { const actorId = (await auth.api.getSession({ headers: await headers() }))?.user?.id; update.lastVerifiedBy = actorId; update.lastVerifiedAt = new Date() }
  if (body.paymentStatus !== undefined) { update.paymentStatus = body.paymentStatus; update.verifiedBy = (await auth.api.getSession({ headers: await headers() }))?.user?.id; update.verifiedAt = new Date() }
  if (body.paymentReference !== undefined) update.paymentReference = body.paymentReference
  if (body.depositPaid !== undefined) update.depositPaid = body.depositPaid
  if (body.balancePaid !== undefined) update.balancePaid = body.balancePaid
  if (body.paymentProofUrl !== undefined) update.paymentProofUrl = body.paymentProofUrl
  const [updated] = await db.update(orders).set(update).where(eq(orders.id, id)).returning({ id: orders.id })
  if (!updated) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
