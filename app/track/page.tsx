'use client'

import { FormEvent, useState } from 'react'

type Result = {
  orderNumber: string
  status: string
  paymentStatus: string
  readyDate: string
  readyAt?: string | null
  total?: string
  depositDue?: string
  balanceRemaining?: string
  fulfillment?: string
}

const steps = ['pending', 'preparing', 'ready', 'completed']

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready for Pickup/Delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const paymentStatusLabels: Record<string, string> = {
  unpaid: 'Unpaid',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  refunded: 'Refunded',
}

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const response = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Order not found')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to find order')
    } finally {
      setLoading(false)
    }
  }

  const currentStepIndex = result ? steps.indexOf(result.status) : -1
  const isArabic = phone.startsWith('0') || phone.startsWith('+961')

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto w-full">
        {/* Tracking Form */}
        <section className="bg-paper border border-border rounded-lg p-8 shadow-sm">
          <div className="text-center mb-6">
            <p className="text-sm font-medium text-green uppercase tracking-wider">Sahten Food</p>
            <h1 className="text-3xl font-normal text-charcoal mt-2 mb-2">
              {isArabic ? 'تتبع طلبك' : 'Track Your Order'}
            </h1>
            <p className="text-sm text-muted">
              {isArabic
                ? 'ادخل رقم الطلب ورقم الهاتف المستخدم عند الدفع.'
                : 'Enter the order number and phone number used at checkout.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-charcoal uppercase tracking-wider">
                  {isArabic ? 'رقم الطلب' : 'Order Number'}
                </span>
                <input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="SHT-..."
                  required
                  className="w-full px-4 py-2 border border-border bg-background rounded-md text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-green/50"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-charcoal uppercase tracking-wider">
                  {isArabic ? 'رقم الهاتف' : 'Phone Number'}
                </span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-border bg-background rounded-md text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-green/50"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green text-primary-foreground py-3 px-4 rounded-md font-medium text-sm uppercase tracking-wider hover:bg-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? isArabic
                  ? 'جاري التحقق...'
                  : 'Checking...'
                : isArabic
                  ? 'تتبع الطلب'
                  : 'Track Order'}
            </button>
          </form>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600 text-center">
              {error}
            </p>
          )}
        </section>

        {/* Status Card */}
        {result && (
          <section className="mt-8 bg-paper border border-border rounded-lg p-8 shadow-sm">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-normal text-charcoal">
                {isArabic ? 'حالة الطلب' : 'Order Status'}
              </h2>
              <p className="text-sm text-muted mt-1">{result.orderNumber}</p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                {steps.map((step, index) => (
                  <div key={step} className="text-center">
                    <div
                      className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-medium transition-colors ${
                        index <= currentStepIndex
                          ? 'bg-green text-primary-foreground'
                          : 'bg-background text-muted border border-border'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <p className="text-xs uppercase tracking-wider text-charcoal">
                      {statusLabels[step] || step}
                    </p>
                  </div>
                ))}
              </div>
              <div className="h-1 bg-border rounded-full relative">
                <div
                  className="absolute top-0 left-0 h-full bg-green rounded-full transition-all"
                  style={{
                    width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Order Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-charcoal uppercase tracking-wider mb-4">
                  {isArabic ? 'تفاصيل الطلب' : 'Order Details'}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted text-sm">
                      {isArabic ? 'الحالة' : 'Status'}
                    </span>
                    <span className="font-medium text-charcoal">
                      {statusLabels[result.status] || result.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted text-sm">
                      {isArabic ? 'حالة الدفع' : 'Payment Status'}
                    </span>
                    <span className="font-medium text-charcoal">
                      {paymentStatusLabels[result.paymentStatus] || result.paymentStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted text-sm">
                      {isArabic ? 'تاريخ الاستعداد' : 'Ready Date'}
                    </span>
                    <span className="font-medium text-charcoal">{result.readyDate}</span>
                  </div>
                  {result.fulfillment && (
                    <div className="flex justify-between">
                      <span className="text-muted text-sm">
                        {isArabic ? 'طريقة التوصيل' : 'Fulfillment'}
                      </span>
                      <span className="font-medium text-charcoal capitalize">
                        {result.fulfillment}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-charcoal uppercase tracking-wider mb-4">
                  {isArabic ? 'ملخص الدفع' : 'Payment Summary'}
                </h3>
                <div className="space-y-3">
                  {result.total && (
                    <div className="flex justify-between">
                      <span className="text-muted text-sm">
                        {isArabic ? 'المبلغ الإجمالي' : 'Total'}
                      </span>
                      <span className="font-medium text-charcoal">
                        ${Number(result.total).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {result.depositDue && (
                    <div className="flex justify-between">
                      <span className="text-muted text-sm">
                        {isArabic ? 'الدفعة المطلوبة' : 'Deposit Due'}
                      </span>
                      <span className="font-medium text-charcoal">
                        ${Number(result.depositDue).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {result.balanceRemaining && (
                    <div className="flex justify-between">
                      <span className="text-muted text-sm">
                        {isArabic ? 'الرصيد المتبقي' : 'Balance Remaining'}
                      </span>
                      <span className="font-medium text-charcoal">
                        ${Number(result.balanceRemaining).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* WhatsApp Action */}
            {result.orderNumber && (
              <div className="mt-8 pt-6 border-t border-border">
                <a
                  href={`https://wa.me/961${phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hello Sahten Food, I'm tracking order ${result.orderNumber}. Status: ${statusLabels[result.status] || result.status}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-citrus text-charcoal py-3 px-4 rounded-md font-medium text-sm uppercase tracking-wider hover:bg-citrus/90 transition-colors"
                >
                  <span>💬</span>
                  <span>{isArabic ? 'تواصل عبر واتساب' : 'Track via WhatsApp'}</span>
                </a>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
