import { NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { menuItemServices, menuItems, orderItems, orders, settings } from '@/lib/db/schema'
import { logApiError } from '@/lib/log'
import { allowRateLimitedRequest } from '@/lib/rate-limit'
import { ALLOWED_PAYMENT_METHODS, isAllowedPaymentMethod, isValidPhone, isValidReadyDate } from '@/lib/order-validation'

const recentSubmissions = new Map<string, number>()
const asMoney = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100000
const orderNumber = () => `SHT-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`

export async function POST(request: Request) {
  if (!(await allowRateLimitedRequest(request, 'orders:create', 5, 10 * 60_000))) return NextResponse.json({ error: 'Too many order attempts. Please try again shortly.' }, { status: 429 })
  try {
    const body = await request.json()
    const paymentMethod = body.paymentMethod
    if (typeof body.customerName !== 'string' || body.customerName.trim().length < 2 || !isValidPhone(body.customerPhone) || !isValidReadyDate(body.readyDate) || !Array.isArray(body.items) || body.items.length === 0) return NextResponse.json({ error: 'Please provide a valid name, phone number, future ready date, and at least one item.' }, { status: 400 })
    if (!['Delivery', 'Pickup'].includes(body.fulfillment)) return NextResponse.json({ error: 'Invalid fulfillment method' }, { status: 400 })
    if (!isAllowedPaymentMethod(paymentMethod)) return NextResponse.json({ error: `Invalid payment method. Allowed values: ${ALLOWED_PAYMENT_METHODS.join(', ')}` }, { status: 400 })
    const duplicateKey = `${body.customerPhone.trim()}|${body.items.map((item: any) => `${item.id}:${item.quantity}`).join(',')}|${body.total}`
    const previous = recentSubmissions.get(duplicateKey)
    if (previous && Date.now() - previous < 30_000) return NextResponse.json({ error: 'This booking was already submitted.' }, { status: 409 })
    recentSubmissions.set(duplicateKey, Date.now())
    if (body.items.some((item: any) => !item.id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50)) return NextResponse.json({ error: 'Invalid menu item or quantity.' }, { status: 400 })
    const ids = body.items.map((item: any) => item.id)
    const menu = await db.select().from(menuItems).where(inArray(menuItems.id, ids))
    const menuById = new Map(menu.map((item) => [item.id, item]))
    if (menu.length !== new Set(ids).size || body.items.some((item: any) => !menuById.get(item.id)?.available)) return NextResponse.json({ error: 'One or more selected menu items are unavailable.' }, { status: 400 })
    const [currentSettings] = await db.select().from(settings).limit(1)
    const minPrepHoursNotice = Number(currentSettings?.minPrepHoursNotice || 0)
    const maxPrepHours = Math.max(minPrepHoursNotice, ...menu.map((item) => item.prepHours))
    if (new Date(`${body.readyDate}T00:00:00`).getTime() < Date.now() + maxPrepHours * 60 * 60 * 1000) return NextResponse.json({ error: `The selected ready date requires at least ${maxPrepHours} hours of preparation.` }, { status: 400 })
    const serviceRows = await db.select().from(menuItemServices).where(inArray(menuItemServices.menuItemId, ids))
    const serviceByItem = new Map(serviceRows.map((service) => [`${service.menuItemId}:${service.name}`, service]))
    const authoritativeItems = body.items.map((item: any) => {
      const menuItem = menuById.get(item.id)!
      const service = item.service?.name ? serviceByItem.get(`${item.id}:${item.service.name}`) : undefined
      if (item.service?.name && !service) throw new Error('INVALID_SERVICE')
      return { ...item, menuItem, service }
    })
    const itemsSubtotal = authoritativeItems.reduce((sum: number, item: any) => sum + Number(item.menuItem.price) * item.quantity, 0)
    const servicesTotal = authoritativeItems.reduce((sum: number, item: any) => sum + Number(item.service?.fee || 0) * item.quantity, 0)
    const serviceFee = Number(currentSettings?.serviceFee || 0)
    const deliveryFee = body.fulfillment === 'Delivery' ? Number(currentSettings?.deliveryFee || 0) : 0
    const total = itemsSubtotal + servicesTotal + serviceFee + deliveryFee
    const depositDue = Math.min(total, Math.round(total * 0.3 * 100) / 100)
    const balanceRemaining = Math.max(0, Math.round((total - depositDue) * 100) / 100)
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const generatedOrderNumber = orderNumber()
        await db.transaction(async (transaction) => {
          const orderId = crypto.randomUUID()
          await transaction.insert(orders).values({ id: orderId, orderNumber: generatedOrderNumber, customerName: body.customerName.trim(), customerPhone: body.customerPhone.trim(), deliveryAddress: body.fulfillment === 'Delivery' ? body.address?.trim() || null : null, fulfillment: body.fulfillment.toLowerCase(), readyDate: body.readyDate, itemsSubtotal: itemsSubtotal.toFixed(2), servicesTotal: (servicesTotal + serviceFee).toFixed(2), deliveryFee: deliveryFee.toFixed(2), total: total.toFixed(2), depositDue: depositDue.toFixed(2), balanceRemaining: balanceRemaining.toFixed(2), paymentMethod, paymentStatus: 'unpaid', depositPaid: false, balancePaid: false, status: 'pending' })
          await transaction.insert(orderItems).values(authoritativeItems.map((item: any) => ({ id: crypto.randomUUID(), orderId, menuItemId: item.id, nameSnapshot: item.menuItem.nameEn, priceSnapshot: String(item.menuItem.price), quantity: item.quantity, selectedService: item.service?.name || null, serviceFeeSnapshot: String(item.service?.fee || 0) })))
        })
        const receipt = { orderNumber: generatedOrderNumber, customerName: body.customerName.trim(), customerPhone: body.customerPhone.trim(), fulfillment: body.fulfillment, readyDate: body.readyDate, items: authoritativeItems.map((item: any) => ({ name: item.menuItem.nameEn, quantity: item.quantity, unit: item.menuItem.unit, price: Number(item.menuItem.price), service: item.service?.name || null, serviceFee: Number(item.service?.fee || 0) })), itemsSubtotal, servicesTotal: servicesTotal + serviceFee, deliveryFee, total, depositDue, balanceRemaining, paymentMethod, status: 'pending' }
        const trackingUrl = `${new URL(request.url).origin}/track?order=${encodeURIComponent(generatedOrderNumber)}`
        const whatsappText = `Sahten Food booking ${generatedOrderNumber} for ${body.customerName.trim()} — total $${total.toFixed(2)}. Track: ${trackingUrl}`
        const whatsappLink = `https://wa.me/${String(currentSettings?.whatsappNumber || '').replace(/\D/g, '')}?text=${encodeURIComponent(whatsappText)}`
        return NextResponse.json({ orderNumber: generatedOrderNumber, receipt, trackingUrl, whatsappLink })
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('orders_order_number')) throw error
      }
    }
    return NextResponse.json({ error: 'Unable to create a unique order number. Please try again.' }, { status: 409 })
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_SERVICE') return NextResponse.json({ error: 'The selected preparation service is unavailable.' }, { status: 400 })
    logApiError('POST /api/orders', error)
    return NextResponse.json({ error: 'Unable to save order' }, { status: 500 })
  }
}
