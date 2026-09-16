'use client'

import { useEffect, useMemo, useState } from 'react'

const logoUrl = '/sahten-logo.png'
const instagramUrl = 'https://www.instagram.com/sahtenfoodlb?igsi=MWZicTZrc29qeTBlbg=='
const supportPhone = '70490736'

type Service = { name: string; nameAr?: string; fee: number }
type Item = {
  name: string
  en: string
  price: number
  category: string
  prepHours: number
  unit?: 'piece' | 'dozen' | 'kilo'
  imageUrl?: string
  services?: Service[]
}
type CartLine = { quantity: number; service?: Service }

const categories = ['All', 'Manakish', 'Appetizers', 'Kibbeh', 'Large Orders']

const fulfillmentOptions = ['Delivery', 'Pickup']
const paymentOptions = ['Whish Money', 'OMT']

export default function Page() {
  const [items, setItems] = useState<Item[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState(false)
  const [settings, setSettings] = useState({
    serviceFee: 0,
    deliveryFee: 3,
    whatsappNumber: '96100000000',
  })
  const [confirmation, setConfirmation] = useState<{
    orderNumber: string
    trackingUrl: string
    whatsappLink: string
  } | null>(null)
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState<Record<string, CartLine>>({})
  const [showCart, setShowCart] = useState(false)

  useEffect(() => {
    fetch('/api/menu', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('menu')
        return response.json()
      })
      .then((records) =>
        setItems(
          (records || [])
            .filter((record: any) => record.available !== false)
            .map((record: any) => ({
              name: record.nameAr,
              en: record.nameEn,
              price: Number(record.price),
              category: record.category,
              prepHours: Number(record.prepHours),
              unit: record.unit || 'piece',
              imageUrl: record.imageUrl || undefined,
              services: (record.services || []).map((service: any) => ({
                name: String(service.name),
                nameAr: service.nameAr ? String(service.nameAr) : undefined,
                fee: Number(service.fee),
              })),
            }))
        )
      )
      .catch(() => setMenuError(true))
      .finally(() => setMenuLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((response) => response.json())
      .then((value) =>
        setSettings({
          serviceFee: Number(value.serviceFee || 0),
          deliveryFee: Number(value.deliveryFee || 0),
          whatsappNumber: String(value.whatsappNumber || '96100000000'),
        })
      )
      .catch(() => undefined)
  }, [])

  const [fulfillment, setFulfillment] = useState<'Delivery' | 'Pickup'>('Delivery')
  const [payment, setPayment] = useState<'Whish Money' | 'OMT'>('Whish Money')
  const [readyDate, setReadyDate] = useState('')
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' })
  const [checkoutError, setCheckoutError] = useState('')
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)

  useEffect(() => {
    if (checkoutError || !showCart) setCheckoutSubmitting(false)
  }, [checkoutError, showCart])

  const filtered = category === 'All' ? items : items.filter((i) => i.category === category)
  const cartItems = items.filter((i) => cart[i.name])
  const count = Object.values(cart).reduce((a, b) => a + b.quantity, 0)

  const itemsSubtotal = cartItems.reduce((s, i) => s + i.price * cart[i.name].quantity, 0)
  const servicesTotal = cartItems.reduce(
    (s, i) => s + (cart[i.name].service?.fee || 0) * cart[i.name].quantity,
    0
  )
  const deliveryFee = fulfillment === 'Delivery' ? settings.deliveryFee : 0
  const total = itemsSubtotal + servicesTotal + settings.serviceFee + deliveryFee
  const deposit = Math.min(total, Math.round(total * 0.3 * 100) / 100)
  const balance = Math.max(0, Math.round((total - deposit) * 100) / 100)

  const maxPrep = Math.max(0, ...cartItems.map((i) => i.prepHours))
  const today = new Date()
  const minDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + Math.ceil(maxPrep / 24)
  )
  const minDateString = `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, '0')}-${String(minDate.getDate()).padStart(2, '0')}`

  const add = (name: string) => {
    setCart((c) => ({
      ...c,
      [name]: { quantity: (c[name]?.quantity || 0) + 1, service: c[name]?.service },
    }))
    setShowCart(true)
  }

  const remove = (name: string) =>
    setCart((c) => {
      const n = { ...c }
      if (!n[name] || n[name].quantity <= 1) delete n[name]
      else n[name] = { ...n[name], quantity: n[name].quantity - 1 }
      return n
    })

  const setService = (name: string, service?: Service) =>
    setCart((c) => ({ ...c, [name]: { ...c[name], service } }))

  const validPhone = /^[0-9+\s-]{7,24}$/.test(customer.phone.trim()) &&
    customer.phone.replace(/\D/g, '').length >= 7
  const validDate = readyDate >= minDateString
  const canSend = Boolean(
    cartItems.length &&
    customer.name.trim() &&
    validPhone &&
    readyDate &&
    validDate &&
    (fulfillment === 'Pickup' || customer.address.trim())
  )

  const orderText = useMemo(() => {
    const lines = cartItems.map((i) => {
      const line = cart[i.name]
      const service = line.service
        ? ` (${line.service.name}: +$${line.service.fee.toFixed(2)})`
        : ''
      return `• ${i.en} — ${i.name} × ${line.quantity} — $${(i.price * line.quantity).toFixed(2)}${service}`
    })
    return [
      'Hello Sahten Food — new booking',
      '',
      `Customer: ${customer.name || 'Not provided'}`,
      `Phone: ${customer.phone || 'Not provided'}`,
      `Fulfillment: ${fulfillment}${fulfillment === 'Delivery' ? ` — ${customer.address || 'Address to follow'}` : ' — pickup location to be sent on WhatsApp'}`,
      `Ready date: ${readyDate || 'Not selected'}`,
      '',
      'ITEMS',
      ...lines,
      '',
      `Items subtotal: $${itemsSubtotal.toFixed(2)}`,
      `Preparation services: $${servicesTotal.toFixed(2)}`,
      `Service fee: $${settings.serviceFee.toFixed(2)}`,
      `${fulfillment} fee: $${deliveryFee.toFixed(2)}`,
      `TOTAL: $${total.toFixed(2)}`,
      `Deposit due now: $${deposit.toFixed(2)}`,
      `Balance remaining: $${balance.toFixed(2)}`,
      `Payment deposit method: ${payment}`,
    ].join('\n')
  }, [customer, fulfillment, readyDate, cartItems, cart, itemsSubtotal, servicesTotal, deliveryFee, total, deposit, balance, payment])

  if (confirmation) {
    return (
      <main className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <section className="bg-paper border border-border rounded-lg p-8 shadow-sm text-center">
            <div className="mb-6">
              <svg
                className="mx-auto mb-4 w-16 h-16 text-green"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h1 className="text-3xl font-normal text-charcoal mb-2">
                Order Confirmed!
              </h1>
              <p className="text-muted">
                Your order #{confirmation.orderNumber} has been received.
              </p>
            </div>

            <div className="bg-background rounded-lg p-6 mb-6 text-left">
              <h2 className="text-lg font-medium text-charcoal mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Order Number</span>
                  <span className="font-medium text-charcoal">{confirmation.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Total</span>
                  <span className="font-medium text-charcoal">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Deposit Due</span>
                  <span className="font-medium text-charcoal">${deposit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Balance Remaining</span>
                  <span className="font-medium text-charcoal">${balance.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <a
              href={confirmation.whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-green text-primary-foreground py-3 px-4 rounded-md font-medium text-sm uppercase tracking-wider hover:bg-green/90 transition-colors"
            >
              <span>💬</span>
              <span>Track via WhatsApp</span>
            </a>

            <div className="mt-6">
              <a
                href="/track"
                className="text-sm text-green hover:underline"
              >
                Track your order here →
              </a>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-background">
      {checkoutError && (
        <p role="alert" className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-100 text-red-700 px-4 py-2 rounded-md text-sm">
          {checkoutError}
        </p>
      )}

      {/* Hero Section */}
      <section className="relative min-h-[760px] bg-charcoal text-white overflow-hidden">
        <div className="absolute inset-0 bg-charcoal opacity-90" />
        <div className="relative z-10">
          <header className="h-20 flex items-center justify-between wrap">
            <a className="flex items-center gap-3 logo-lockup" href="#top">
              <img src={logoUrl} alt="Sahten logo" className="w-11 h-11 rounded-full" />
              <span className="text-xs font-bold letter-spacing-wider">SAHTEN FOOD</span>
            </a>
            <nav className="hidden md:flex gap-8 text-sm text-gray-300">
              <a href="#menu" className="hover:text-green transition-colors">Menu</a>
              <a href="#story" className="hover:text-green transition-colors">Our story</a>
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="hover:text-green transition-colors">
                Instagram ↗
              </a>
              <a href="/track" className="hover:text-green transition-colors">Track order</a>
              <a href="/admin" className="hover:text-green transition-colors">Admin</a>
            </nav>
            <button
              className="bg-transparent border border-white/45 text-white px-4 py-2 rounded-md text-sm hover:bg-white/10 transition-colors"
              onClick={() => setShowCart(true)}
            >
              Your order
              {count > 0 && (
                <span className="ml-2 bg-green text-charcoal rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {count}
                </span>
              )}
            </button>
          </header>

          <div className="wrap min-h-[600px] grid md:grid-cols-2 items-center gap-12 pt-12">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-widest text-green font-medium">
                Lebanese traditional food · Zgharta / Ehden
              </p>
              <h1 className="font-serif text-5xl md:text-7xl font-normal leading-tight">
                Made slow.<br />
                <em className="text-green not-italic">Shared gladly.</em>
              </h1>
              <p className="text-gray-300 max-w-md text-lg">
                Fresh home cooking, prepared to order. Pick your favorites, choose how you want them prepared, and book your date.
              </p>
              <a
                href="#menu"
                className="inline-flex items-center gap-4 bg-citrus text-charcoal px-6 py-3 rounded-md font-medium text-sm hover:bg-citrus/90 transition-colors"
              >
                <span>Explore the menu</span>
                <span>↓</span>
              </a>
            </div>
            <div className="relative flex justify-center items-center min-h-[530px]">
              <img
                src={logoUrl}
                className="w-[min(390px,70%)] aspect-square object-cover rounded-full z-10"
                alt="Sahten Lebanese Traditional Food"
              />
              <div className="absolute w-[280px] h-[150px] border border-green/70 rounded-full transform rotate-[-18deg]" />
              <div className="absolute w-[240px] h-[330px] border border-citrus/50 rounded-full transform rotate-[28deg]" />
              <span className="absolute top-[28%] right-0 text-xs uppercase tracking-wider text-gray-300 transform -translate-y-1/2">
                Home cooked / never rushed
              </span>
              <span className="absolute bottom-[15%] left-0 text-xs uppercase tracking-wider text-gray-300 transform translate-y-1/2">
                Freshly made · made to share
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section id="story" className="py-24 bg-citrus">
        <div className="wrap grid md:grid-cols-3 gap-12 items-start">
          <p className="text-xs uppercase tracking-wider text-green font-medium">01 — The feeling</p>
          <div className="md:col-span-2">
            <h2 className="font-serif text-5xl md:text-6xl font-normal leading-tight">
              Good food<br />
              <em className="text-green not-italic">takes its time.</em>
            </h2>
            <p className="mt-6 text-lg text-green/80 max-w-lg">
              One home kitchen, small batches, serious care. Preparation time is shown for every item so you can plan the perfect gathering.
            </p>
          </div>
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu" className="py-24">
        <div className="wrap">
          <div className="flex justify-between items-end mb-12">
            <div>
              <p className="text-xs uppercase tracking-wider text-green font-medium mb-2">
                02 — Choose your favorites
              </p>
              <h2 className="font-serif text-5xl md:text-6xl font-normal leading-tight">
                The <em className="text-green not-italic">home menu</em>
              </h2>
            </div>
          </div>

          <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
            {categories.map((c) => (
              <button
                key={c}
                className={`px-4 py-2 rounded-md text-sm font-medium uppercase tracking-wider whitespace-nowrap transition-colors ${
                  category === c
                    ? 'bg-charcoal text-white'
                    : 'bg-paper text-charcoal border border-border hover:bg-background'
                }`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {menuLoading && (
            <p className="text-center text-muted py-8">Loading the menu…</p>
          )}
          {menuError && (
            <p className="text-center text-muted py-8">We couldn't load the menu, please refresh.</p>
          )}
          {!menuLoading && !menuError && items.length === 0 && (
            <p className="text-center text-muted py-8">The menu is currently unavailable.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <article
                key={item.name}
                className="bg-paper border border-transparent rounded-lg p-6 hover:border-green transition-all group"
              >
                {item.imageUrl ? (
                  <img
                    className="w-full h-40 object-cover rounded-md mb-4"
                    src={item.imageUrl}
                    alt={item.en}
                  />
                ) : (
                  <div className="w-full h-40 bg-background rounded-md mb-4 flex items-center justify-center text-muted">
                    {item.category}
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs uppercase tracking-wider text-green font-medium">
                    {item.category}
                  </span>
                  <span className="font-bold text-charcoal text-xl">
                    ${item.price}
                    {item.unit && <small className="text-xs text-muted font-normal"> / {item.unit}</small>}
                  </span>
                </div>
                <h3 className="font-serif text-xl font-medium text-charcoal mb-1">{item.en}</h3>
                <p className="text-sm text-muted mb-3" lang="ar" dir="rtl">
                  {item.name}
                </p>
                <p className="text-xs text-green mb-3">Ready in {item.prepHours} hours</p>
                {item.services && item.services.length > 0 && (
                  <p className="text-xs text-muted mb-4">
                    Preparation available: {item.services.map((s) => `${s.name} +$${s.fee}`).join(' · ')}
                  </p>
                )}
                <button
                  className="absolute bottom-4 right-4 w-8 h-8 border border-green text-green rounded-full flex items-center justify-center text-xl hover:bg-green hover:text-primary-foreground transition-colors"
                  onClick={() => add(item.name)}
                  aria-label={`Add ${item.en}`}
                >
                  +
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Service Section */}
      <section className="py-24 bg-[#dcebc8]">
        <div className="wrap grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-wider text-green font-medium mb-2">
              03 — Made for your day
            </p>
            <h2 className="font-serif text-5xl md:text-6xl font-normal leading-tight mb-8">
              Choose how<br />
              <em className="text-green not-italic">you’ll receive it.</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-charcoal text-xl mb-2">Delivery</h3>
              <p className="text-green/80">
                Tell us where to bring your order, or finalize the details on WhatsApp.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-charcoal text-xl mb-2">Pickup</h3>
              <p className="text-green/80">
                We will send you the exact pickup location via WhatsApp once your order is confirmed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24">
        <div className="wrap">
          <p className="text-xs uppercase tracking-wider text-green font-medium mb-4">
            04 — Make it a gathering
          </p>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-12">
            <h2 className="font-serif text-5xl md:text-6xl font-normal leading-tight">
              Bring people.<br />
              <em className="text-green not-italic">We’ll bring the food.</em>
            </h2>
            <a
              href="#menu"
              className="inline-flex items-center gap-4 bg-green text-primary-foreground px-6 py-3 rounded-md font-medium text-sm hover:bg-green/90 transition-colors"
            >
              <span>Plan your order</span>
              <span>↗</span>
            </a>
          </div>
          <footer className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted">
            <a className="flex items-center gap-3 logo-lockup" href="#top">
              <img src={logoUrl} alt="Sahten logo" className="w-8 h-8 rounded-full" />
              <span className="text-xs font-bold letter-spacing-wider">SAHTEN FOOD</span>
            </a>
            <span>Delivering across Zgharta in winter & Ehden in summer.</span>
            <a href={instagramUrl} target="_blank" rel="noreferrer" className="hover:text-green transition-colors">
              @sahtenfoodlb ↗
            </a>
          </footer>
        </div>
      </section>

      {/* Cart Drawer */}
      {showCart && (
        <div
          className="fixed inset-0 bg-black/55 z-50 flex justify-end p-4"
          onClick={() => setShowCart(false)}
        >
          <aside
            className="bg-paper w-full max-w-lg h-full rounded-lg shadow-2xl overflow-auto p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-green font-medium">
                  Your order
                </p>
                <h2 id="cart-title" className="font-serif text-3xl font-normal text-charcoal mt-1">
                  Build your booking
                </h2>
              </div>
              <button
                className="text-muted hover:text-charcoal transition-colors text-2xl"
                onClick={() => setShowCart(false)}
                aria-label="Close order"
              >
                ×
              </button>
            </div>

            {!cartItems.length ? (
              <p className="text-muted text-center py-8">
                Your basket is empty.<br />
                Choose something delicious from the menu.
              </p>
            ) : (
              <div className="space-y-6">
                {/* Cart Items */}
                <div className="space-y-4 max-h-[300px] overflow-auto pr-2">
                  {cartItems.map((item) => (
                    <div
                      key={item.name}
                      className="flex justify-between items-center py-3 border-b border-border"
                    >
                      <div>
                        <strong className="font-serif text-lg text-charcoal block">
                          {item.en}
                        </strong>
                        <small className="text-sm text-muted" lang="ar" dir="rtl">
                          {item.name} · ${item.price}
                        </small>
                        {item.services && (
                          <select
                            className="mt-2 text-sm bg-background border border-border rounded px-2 py-1"
                            value={cart[item.name].service?.name || ''}
                            onChange={(e) =>
                              setService(
                                item.name,
                                item.services?.find((s) => s.name === e.target.value)
                              )
                            }
                          >
                            <option value="">Frozen / unprepared</option>
                            {item.services.map((s) => (
                              <option key={s.name} value={s.name}>
                                {s.name} +${s.fee}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => remove(item.name)}
                          aria-label="Decrease quantity"
                          className="w-8 h-8 border border-border rounded flex items-center justify-center text-muted hover:bg-background transition-colors"
                        >
                          −
                        </button>
                        <span className="min-w-[2rem] text-center">{cart[item.name].quantity}</span>
                        <button
                          onClick={() => add(item.name)}
                          aria-label="Increase quantity"
                          className="w-8 h-8 border border-border rounded flex items-center justify-center text-muted hover:bg-background transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Customer Info */}
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-charcoal uppercase tracking-wider">
                      Your name
                    </span>
                    <input
                      className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-green/50"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-charcoal uppercase tracking-wider">
                      Phone number
                    </span>
                    <input
                      className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-green/50"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-charcoal uppercase tracking-wider">
                      Ready date (Lebanon time)
                    </span>
                    <input
                      type="date"
                      min={minDateString}
                      value={readyDate}
                      onChange={(e) => setReadyDate(e.target.value)}
                      required
                      className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-green/50"
                    />
                  </label>
                  <p className="text-xs text-muted">
                    Earliest date based on the slowest item: {maxPrep || 24} hours.
                  </p>

                  {/* Fulfillment */}
                  <div>
                    <span className="text-sm font-medium text-charcoal uppercase tracking-wider">
                      Fulfillment
                    </span>
                    <div className="flex gap-2 mt-2">
                      {fulfillmentOptions.map((c) => (
                        <button
                          key={c}
                          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium uppercase tracking-wider transition-colors ${
                            fulfillment === c
                              ? 'bg-charcoal text-white'
                              : 'bg-background text-charcoal border border-border hover:bg-border'
                          }`}
                          onClick={() => setFulfillment(c as 'Delivery' | 'Pickup')}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {fulfillment === 'Delivery' ? (
                    <label className="block">
                      <span className="text-sm font-medium text-charcoal uppercase tracking-wider">
                        Delivery address
                      </span>
                      <input
                        className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-green/50"
                        value={customer.address}
                        onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                        required
                      />
                    </label>
                  ) : (
                    <p className="text-sm text-green bg-green/10 p-2 rounded">
                      Pickup location will be sent by WhatsApp after booking confirmation.
                    </p>
                  )}

                  {/* Payment Method */}
                  <div>
                    <span className="text-sm font-medium text-charcoal uppercase tracking-wider">
                      Deposit method
                    </span>
                    <div className="flex gap-2 mt-2">
                      {paymentOptions.map((p) => (
                        <button
                          key={p}
                          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium uppercase tracking-wider transition-colors ${
                            payment === p
                              ? 'bg-charcoal text-white'
                              : 'bg-background text-charcoal border border-border hover:bg-border'
                          }`}
                          onClick={() => setPayment(p as 'Whish Money' | 'OMT')}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted text-sm">Items subtotal</span>
                      <span className="font-medium text-charcoal">
                        ${itemsSubtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted text-sm">Preparation services</span>
                      <span className="font-medium text-charcoal">
                        ${servicesTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted text-sm">{fulfillment} fee</span>
                      <span className="font-medium text-charcoal">
                        ${deliveryFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between">
                      <span className="font-medium text-charcoal">Total</span>
                      <span className="font-bold text-charcoal text-xl">
                        ${total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted text-sm">Deposit due now</span>
                      <span className="font-medium text-green">
                        ${deposit.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted text-sm">Balance remaining</span>
                      <span className="font-medium text-charcoal">
                        ${balance.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    className="w-full bg-green text-primary-foreground py-3 px-4 rounded-md font-medium text-sm uppercase tracking-wider hover:bg-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={async () => {
                      if (checkoutSubmitting) return
                      setCheckoutSubmitting(true)
                      setCheckoutError('')
                      if (!readyDate || !customer.name || !customer.phone ||
                          (fulfillment === 'Delivery' && !customer.address)) {
                        setCheckoutError('Please complete your name, phone, address, and ready date.')
                        return
                      }
                      const result = await fetch('/api/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          customerName: customer.name,
                          customerPhone: customer.phone,
                          address: customer.address,
                          fulfillment: fulfillment.toLowerCase(),
                          readyDate,
                          items: cartItems.map((i) => ({
                            ...i,
                            quantity: cart[i.name].quantity,
                            service: cart[i.name].service,
                          })),
                          itemsSubtotal,
                          servicesTotal,
                          deliveryFee,
                          total,
                          depositDue: deposit,
                          balanceRemaining: balance,
                          paymentMethod: payment === 'Whish Money' ? 'whish' : 'omt',
                        }),
                      })
                      const saved = await result.json()
                      if (!result.ok) {
                        setCheckoutError('We could not save this booking. Please try again.')
                        return
                      }
                      setConfirmation({
                        orderNumber: saved.orderNumber,
                        trackingUrl: saved.trackingUrl,
                        whatsappLink: saved.whatsappLink,
                      })
                      window.open(
                        `https://wa.me/961${customer.phone.trim().replace(/^0+/, '')}?text=${encodeURIComponent(
                          `${orderText}\nOrder number: ${saved.orderNumber}`
                        )}`,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }}
                    disabled={checkoutSubmitting || !canSend}
                  >
                    {checkoutSubmitting ? 'Processing...' : 'Send booking to WhatsApp ↗'}
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  )
}
