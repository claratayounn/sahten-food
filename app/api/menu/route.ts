import { NextResponse } from 'next/server'
import { pool, db } from '@/lib/db'
import { menuItems } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { requireAdmin } from '@/lib/require-admin'
import { validateMenuFields } from '@/lib/menu-validation'

export async function POST(request: Request) {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json(JSON.parse(await check.response.text()), { status: check.response.status })
  const body = await request.json()
  const validationError = validateMenuFields(body)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
  if (body.services !== undefined && (!Array.isArray(body.services) || body.services.some((service: any) => typeof service?.name !== 'string' || !service.name.trim() || !Number.isFinite(Number(service.fee)) || Number(service.fee) < 0))) return NextResponse.json({ error: 'Service fees must be numbers greater than or equal to zero.' }, { status: 400 })
  const [item] = await db.insert(menuItems).values({ id: crypto.randomUUID(), nameEn: body.name_en.trim(), nameAr: body.name_ar.trim(), descriptionEn: body.description_en || null, descriptionAr: body.description_ar || null, category: body.category.trim(), price: String(Number(body.price)), prepHours: Number(body.prep_hours), unit: ['piece', 'dozen', 'kilo'].includes(body.unit) ? body.unit : 'piece', available: body.available !== false, imageUrl: body.image_url || null }).returning()
  return NextResponse.json(item, { status: 201 })
}

export async function GET(request: Request) {
  const includeDisabled = new URL(request.url).searchParams.get('includeDisabled') === 'true'
  let includeAll = false
  if (includeDisabled) {
    const check = await requireAdmin()
    includeAll = check.ok
  }
  const filter = includeAll ? '' : 'WHERE m.available = true'
  const { rows } = await pool.query(`SELECT m.id, m.name_en AS "nameEn", m.name_ar AS "nameAr", m.description_en AS "descriptionEn", m.description_ar AS "descriptionAr", m.category, m.price::text, m.prep_hours AS "prepHours", m.available, m.image_url AS "imageUrl", m.unit, COALESCE(json_agg(json_build_object('name', s.name, 'nameAr', s.name_ar, 'fee', s.fee::text)) FILTER (WHERE s.id IS NOT NULL), '[]') AS services FROM public.menu_items m LEFT JOIN public.menu_item_services s ON s.menu_item_id = m.id ${filter} GROUP BY m.id ORDER BY m.sort_order, m.name_en`)
  return NextResponse.json(rows || [])
}
