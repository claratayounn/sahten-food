'use client'

import { Button } from '@/components/ui/button'

export type Detail = { order: { order_number: string; customer_name: string; customer_phone: string; status: string; payment_status: string; payment_method: string; payment_reference: string | null; payment_proof_url: string | null; delivery_address: string | null; fulfillment: string; ready_date: string; total: string; deposit_paid: boolean; balance_paid: boolean; verified_by: string | null; verified_at: string | null; verified_by_name?: string | null }; items: { id: string; name: string; price: string; quantity: number; service: string | null; serviceFee: string }[] }

export function OrderDetailModal({ detail, onClose, onPreview }: { detail: Detail | null; onClose: () => void; onPreview: (url: string) => void }) {
  if (!detail) return null
  const { order } = detail
  return <div className="admin-detail" role="dialog" aria-modal="true"><Button variant="outline" onClick={onClose}>Close</Button><h2>{order.order_number}</h2><p>{order.customer_name} · {order.customer_phone}</p><dl><dt>Status</dt><dd>{order.status}</dd><dt>Payment status</dt><dd>{order.payment_status}</dd><dt>Fulfillment</dt><dd>{order.fulfillment} · {order.delivery_address || 'Pickup'}</dd><dt>Ready date</dt><dd>{order.ready_date}</dd><dt>Total</dt><dd>${Number(order.total).toFixed(2)}</dd><dt>Deposit</dt><dd>{order.deposit_paid ? 'Paid' : 'Unpaid'}</dd><dt>Balance</dt><dd>{order.balance_paid ? 'Paid' : 'Unpaid'}</dd>{order.payment_reference && <><dt>Payment reference</dt><dd>{order.payment_reference}</dd></>}{order.verified_at && <><dt>Verified</dt><dd>Verified by {order.verified_by_name || order.verified_by || 'admin'} · {new Date(order.verified_at).toLocaleString()}</dd></>}</dl>{order.payment_proof_url && <button type="button" className="proof-thumb-button" onClick={() => onPreview(order.payment_proof_url!)}><img className="proof-thumb" src={order.payment_proof_url} alt="Payment proof thumbnail" /></button>}<div>{detail.items.map((item) => <p key={item.id}>{item.name} × {item.quantity} · ${item.price} · {item.service || 'No service'} (+${item.serviceFee})</p>)}</div></div>
}
