import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { allowRateLimitedRequest } from '@/lib/rate-limit'

export async function GET(request: Request) {
  if (!(await allowRateLimitedRequest(request, 'orders:track', 20, 10 * 60_000))) return NextResponse.json({ error: 'Too many tracking lookups. Please try again shortly.' }, { status: 429 })
  const url = new URL(request.url)
  const orderNumber = url.searchParams.get('orderNumber')?.trim()
  const phone = url.searchParams.get('phone')?.trim()
  const normalizedPhone = phone?.replace(/\D/g, '')
  if (!orderNumber || !phone) return NextResponse.json({ error: 'Order number and phone are required' }, { status: 400 })
  const [order] = await db.select({ orderNumber: orders.orderNumber, status: orders.status, paymentStatus: orders.paymentStatus, readyDate: orders.readyDate, readyAt: orders.readyAt, total: orders.total, depositDue: orders.depositDue, balanceRemaining: orders.balanceRemaining, fulfillment: orders.fulfillment }).from(orders).where(and(eq(orders.orderNumber, orderNumber), sql`regexp_replace(${orders.customerPhone}, '[^0-9]', '', 'g') = ${normalizedPhone}`)).limit(1)
  if (!order && normalizedPhone && normalizedPhone !== phone) {
    const [normalizedMatch] = await db.select({ orderNumber: orders.orderNumber, status: orders.status, paymentStatus: orders.paymentStatus, readyDate: orders.readyDate, readyAt: orders.readyAt, total: orders.total, depositDue: orders.depositDue, balanceRemaining: orders.balanceRemaining, fulfillment: orders.fulfillment }).from(orders).where(and(eq(orders.orderNumber, orderNumber), eq(orders.customerPhone, normalizedPhone))).limit(1)
    if (normalizedMatch) return NextResponse.json(normalizedMatch)
  }
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  return NextResponse.json(order)
}
