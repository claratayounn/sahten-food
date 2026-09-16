'use client'

import { FormEvent, useState } from 'react'

type Result = { orderNumber: string; status: string; paymentStatus: string; readyDate: string; readyAt?: string | null; total?: string; depositDue?: string; balanceRemaining?: string; fulfillment?: string }

const steps = ['pending', 'preparing', 'ready', 'completed']

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(''); setResult(null)
    try { const response = await fetch(`/api/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Order not found'); setResult(data) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to find order') } finally { setLoading(false) }
  }
  return <main className="auth-page track-layout-reference"><section className="auth-card track-receipt-grid"><p className="eyebrow">Sahten Food</p><h1>Track your order</h1><p>Enter the order number and phone number used at checkout.</p><form onSubmit={submit} className="auth-form"><label>Order number<input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="SHT-..." required /></label><label>Phone number<input value={phone} onChange={(e) => setPhone(e.target.value)} required /></label><button className="button" disabled={loading}>{loading ? 'Checking…' : 'Track order'}</button></form>{error && <p role="alert" className="auth-error">{error}</p>}{result && <div className="track-result"><strong>{result.orderNumber}</strong><span>Status: {result.status}</span><span>Payment: {result.paymentStatus}</span><span>Ready: {result.readyDate}</span>{result.fulfillment && <span>Fulfillment: {result.fulfillment}</span>}{result.total && <span>Total: ${Number(result.total).toFixed(2)}</span>}{result.depositDue && <span>Deposit due: ${Number(result.depositDue).toFixed(2)}</span>}{result.balanceRemaining && <span>Balance remaining: ${Number(result.balanceRemaining).toFixed(2)}</span>}<div className="track-steps" aria-label="Order progress">{steps.map((step) => <span key={step} data-active={steps.indexOf(step) <= steps.indexOf(result.status)}>{step}</span>)}</div></div>}</section></main>
}
