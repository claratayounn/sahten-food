import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/require-admin'
import { eq } from 'drizzle-orm'

async function getSettings() {
  const [current] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1)
  return current ?? { id: 1, serviceFee: '0', deliveryFee: '0', whatsappNumber: '', minPrepHoursNotice: 24 }
}

export async function GET() {
  return NextResponse.json(await getSettings())
}

export async function PATCH(request: Request) {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json(JSON.parse(await check.response.text()), { status: check.response.status })
  const body = await request.json()
  const serviceFee = Number(body.serviceFee)
  const deliveryFee = Number(body.deliveryFee)
  const whatsappNumber = String(body.whatsappNumber ?? '').trim()
  const minPrepHoursNotice = Number(body.minPrepHoursNotice)
  if (!Number.isFinite(serviceFee) || serviceFee < 0 || !Number.isFinite(deliveryFee) || deliveryFee < 0 || !Number.isInteger(minPrepHoursNotice) || minPrepHoursNotice < 0 || minPrepHoursNotice > 720 || !/^[0-9+\s-]{7,24}$/.test(whatsappNumber)) return NextResponse.json({ error: 'Enter non-negative fees and a valid WhatsApp number.' }, { status: 400 })
  const [updated] = await db.insert(settings).values({ id: 1, serviceFee: serviceFee.toFixed(2), deliveryFee: deliveryFee.toFixed(2), whatsappNumber, minPrepHoursNotice }).onConflictDoUpdate({ target: settings.id, set: { serviceFee: serviceFee.toFixed(2), deliveryFee: deliveryFee.toFixed(2), whatsappNumber, minPrepHoursNotice } }).returning()
  return NextResponse.json(updated)
}
