'use client'

import './admin-dashboard.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { MenuEditor, type Draft, type MenuItem } from './admin/MenuEditor'
import { OrderTable, type Order } from './admin/OrderTable'
import { PaymentQueue } from './admin/PaymentQueue'
import { OrderDetailModal, type Detail } from './admin/OrderDetailModal'
import { PaymentProofLightbox } from './admin/PaymentProofLightbox'
import { SettingsEditor } from './admin/SettingsEditor'

const statuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled']
const payments = ['unpaid', 'partially_paid', 'paid', 'refunded']
const emptyDraft: Draft = {
  name_en: '',
  name_ar: '',
  description_en: '',
  description_ar: '',
  category: 'Appetizers',
  price: '',
  prep_hours: '24',
  image_url: '',
  available: true,
}

// Status badge colors
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

// Payment status badge colors
const paymentStatusColors: Record<string, string> = {
  unpaid: 'bg-amber-100 text-amber-700',
  partially_paid: 'bg-orange-100 text-orange-700',
  paid: 'bg-green-100 text-green-700',
  refunded: 'bg-gray-100 text-gray-700',
}

export function AdminDashboard({
  orders: initialOrders = [],
  offset = 0,
  pageSize = 50,
}: {
  orders?: Order[]
  offset?: number
  pageSize?: number
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [tab, setTab] = useState<'orders' | 'menu' | 'payments' | 'settings'>('orders')
  const [status, setStatus] = useState('all')
  const [fulfillment, setFulfillment] = useState('all')
  const [payment, setPayment] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [editing, setEditing] = useState<string | null>(null)
  const [menuLoading, setMenuLoading] = useState(false)
  const noticeTimer = useRef<number | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const filtered = useMemo(
    () =>
      orders.filter(
        (order) =>
          (status === 'all' || order.status === status) &&
          (fulfillment === 'all' || order.fulfillment === fulfillment) &&
          (payment === 'all' || order.payment_status === payment) &&
          `${order.order_number} ${order.customer_name} ${order.customer_phone}
            `.toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [orders, status, fulfillment, payment, debouncedSearch]
  )

  const pendingIds = useMemo(
    () => new Set(orders.filter((order) => order.payment_status === 'unpaid' || order.payment_status === 'partially_paid').map((order) => order.id)),
    [orders]
  )

  const flash = (message: string) => {
    setNotice(message)
    setError('')
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2500)
  }

  async function patchOrder(id: string, patch: Record<string, unknown>) {
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!response.ok) throw new Error((await response.json()).error || 'Could not save order')
      setOrders((current) =>
        current.map((order) =>
          order.id === id
            ? {
                ...order,
                ...patch,
                payment_status: (patch.paymentStatus as string) || order.payment_status,
                payment_reference: (patch.paymentReference as string) || order.payment_reference,
                deposit_paid: (patch.depositPaid as boolean) ?? order.deposit_paid,
                balance_paid: (patch.balancePaid as boolean) ?? order.balance_paid,
              }
            : order
        )
      )
      flash('Saved to server')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save order')
    }
  }

  async function expandOrder(order: Order) {
    setError('')
    const response = await fetch(`/api/orders/${order.id}`)
    if (!response.ok) return setError('Could not load order details')
    setDetail(await response.json())
  }

  async function loadMenu() {
    setMenuLoading(true)
    try {
      const response = await fetch('/api/menu?includeDisabled=true')
      if (!response.ok) throw new Error('Could not load menu')
      setMenu(await response.json())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load menu')
    } finally {
      setMenuLoading(false)
    }
  }

  async function saveMenu(event: React.FormEvent) {
    event.preventDefault()
    const response = await fetch(
      editing ? `/api/menu/${editing}` : '/api/menu',
      {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      }
    )
    if (!response.ok) return setError((await response.json()).error || 'Could not save menu item')
    const item = await response.json()
    setMenu((current) =>
      editing
        ? current.map((menuItem) => (menuItem.id === editing ? { ...menuItem, ...item } : menuItem))
        : [item, ...current]
    )
    setDraft(emptyDraft)
    setEditing(null)
    flash('Menu item saved')
  }

  async function disableMenu(item: MenuItem) {
    const response = await fetch(`/api/menu/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: false }),
    })
    const result = await response.json()
    if (!response.ok) return setError(result.error || 'Could not disable item')
    setMenu((current) =>
      current.map((menuItem) =>
        menuItem.id === item.id ? { ...menuItem, available: false } : menuItem
      )
    )
    flash('Menu item disabled')
  }

  async function reenableMenu(item: MenuItem) {
    const response = await fetch(`/api/menu/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: true }),
    })
    const result = await response.json()
    if (!response.ok) return setError(result.error || 'Could not re-enable item')
    setMenu((current) =>
      current.map((menuItem) =>
        menuItem.id === item.id ? { ...menuItem, available: true } : menuItem
      )
    )
    flash('Menu item re-enabled')
  }

  async function deleteMenu(item: MenuItem) {
    if (!window.confirm('Delete this item? If it has past orders, it will be disabled instead.')) return
    const response = await fetch(`/api/menu/${item.id}`, { method: 'DELETE' })
    const result = await response.json()
    if (!response.ok) return setError(result.error || 'Could not delete item')
    if (result.deleted) {
      setMenu((current) => current.filter((menuItem) => menuItem.id !== item.id))
      flash('Menu item deleted')
    } else {
      setMenu((current) =>
        current.map((menuItem) =>
          menuItem.id === item.id ? { ...menuItem, available: false } : menuItem
        )
      )
      flash(result.message || 'Item disabled')
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Sahten Food / Admin</p>
          <h1>Orders & menu</h1>
          <p>Live operations, payments, and menu availability.</p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            authClient.signOut({
              fetchOptions: { onSuccess: () => window.location.assign('/sign-in') },
            })
          }
        >
          Sign out
        </Button>
      </header>

      <nav className="admin-tabs">
        <Button
          variant={tab === 'orders' ? 'default' : 'outline'}
          onClick={() => setTab('orders')}
        >
          Orders
        </Button>
        <Button
          variant={tab === 'menu' ? 'default' : 'outline'}
          onClick={() => {
            setTab('menu')
            void loadMenu()
          }}
        >
          Menu editor
        </Button>
        <Button
          variant={tab === 'payments' ? 'default' : 'outline'}
          onClick={() => setTab('payments')}
        >
          Payments
          {pendingIds.size > 0 && (
            <span className="ml-2 bg-green text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
              {pendingIds.size}
            </span>
          )}
        </Button>
        <Button
          variant={tab === 'settings' ? 'default' : 'outline'}
          onClick={() => setTab('settings')}
        >
          Settings
        </Button>
      </nav>

      {notice && (
        <p className="notice" role="alert">
          {notice}
        </p>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <section className="admin-panel">
          <OrderTable
            orders={orders}
            filtered={filtered}
            pendingIds={pendingIds}
            paymentsOnly={false}
            search={search}
            status={status}
            fulfillment={fulfillment}
            payment={payment}
            statuses={statuses}
            payments={payments}
            onSearch={setSearch}
            onStatus={setStatus}
            onFulfillment={setFulfillment}
            onPayment={setPayment}
            onExpand={expandOrder}
            onPatch={patchOrder}
            onPreview={setProofPreview}
            offset={offset}
            pageSize={pageSize}
          />
        </section>
      )}

      {/* Payments Tab */}
      {tab === 'payments' && (
        <section className="admin-panel">
          <PaymentQueue
            orders={orders}
            filtered={filtered}
            pendingIds={pendingIds}
            search={search}
            status={status}
            fulfillment={fulfillment}
            payment={payment}
            statuses={statuses}
            payments={payments}
            onSearch={setSearch}
            onStatus={setStatus}
            onFulfillment={setFulfillment}
            onPayment={setPayment}
            onExpand={expandOrder}
            onPatch={patchOrder}
            onPreview={setProofPreview}
            offset={offset}
            pageSize={pageSize}
          />
        </section>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && <SettingsEditor />}

      {/* Menu Tab */}
      {tab === 'menu' && (
        <MenuEditor
          menu={menu}
          draft={draft}
          editing={editing}
          loading={menuLoading}
          onDraft={setDraft}
          onSave={saveMenu}
          onNew={() => {
            setEditing(null)
            setDraft(emptyDraft)
          }}
          onEdit={(item) => {
            setEditing(item.id)
            setDraft({
              name_en: item.nameEn,
              name_ar: item.nameAr,
              description_en: item.descriptionEn || '',
              description_ar: item.descriptionAr || '',
              category: item.category,
              price: item.price,
              prep_hours: String(item.prepHours),
              image_url: item.imageUrl || '',
              available: item.available,
            })
          }}
          onDisable={disableMenu}
          onDelete={deleteMenu}
          onReenable={(item) => void reenableMenu(item)}
        />
      )}

      <OrderDetailModal detail={detail} onClose={() => setDetail(null)} onPreview={setProofPreview} />
      <PaymentProofLightbox src={proofPreview} onClose={() => setProofPreview(null)} />
    </main>
  )
}
