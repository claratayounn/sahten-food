import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool, db } from '@/lib/db'
import { menuItems, orderItems } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { requireAdmin } from '@/lib/require-admin'
import { validateMenuPatch } from '@/lib/menu-validation'
import { logApiError } from '@/lib/log'



export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json(JSON.parse(await check.response.text()), { status: check.response.status })
  const { id } = await params
  const body = await request.json()
  const validationError = validateMenuPatch(body)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
  if (body.services !== undefined && (!Array.isArray(body.services) || body.services.some((service: any) => typeof service?.name !== 'string' || !service.name.trim() || !Number.isFinite(Number(service.fee)) || Number(service.fee) < 0))) return NextResponse.json({ error: 'Service fees must be numbers greater than or equal to zero.' }, { status: 400 })
  const fields = ['name_en','name_ar','description_en','description_ar','category','price','prep_hours','available','image_url','sort_order','unit']
  const updates = Object.entries(body).filter(([key, value]) => fields.includes(key) && value !== undefined)
  const services = Array.isArray(body.services) ? body.services : null
  if (!updates.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  const values = updates.map(([, value]) => value)
  const set = updates.map(([key], index) => `"${key}" = $${index + 1}`).join(', ')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = updates.length ? await client.query(`UPDATE public.menu_items SET ${set}, updated_at = now() WHERE id = $${values.length + 1} RETURNING *`, [...values, id]) : await client.query('SELECT * FROM public.menu_items WHERE id = $1', [id])
    if (!result.rows[0]) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Menu item not found' }, { status: 404 }) }
    if (services) {
      await client.query('DELETE FROM public.menu_item_services WHERE menu_item_id = $1', [id])
      for (const service of services || []) {
        if (service?.name && Number.isFinite(Number(service.fee))) await client.query('INSERT INTO public.menu_item_services (id, menu_item_id, name, name_ar, fee) VALUES (gen_random_uuid(), $1, $2, $3, $4)', [id, String(service.name).trim(), service.nameAr ? String(service.nameAr).trim() : null, Number(service.fee)])
      }
    }
    await client.query('COMMIT')
    return NextResponse.json(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    logApiError('PATCH /api/menu/[id]', error)
    return NextResponse.json({ error: 'Could not update menu item' }, { status: 500 })
  } finally { client.release() }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAdmin()
  if (!check.ok) return NextResponse.json(JSON.parse(await check.response.text()), { status: check.response.status })
  const { id } = await params
  const refs = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.menuItemId, id)).limit(1)
  if (refs.length) {
    await db.update(menuItems).set({ available: false, updatedAt: new Date() }).where(eq(menuItems.id, id))
    return NextResponse.json({ disabled: true, message: 'This item has order history, so it was disabled instead of deleted.' })
  }
  await db.delete(menuItems).where(eq(menuItems.id, id))
  return NextResponse.json({ deleted: true })
}
