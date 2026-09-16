'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Settings = { serviceFee: string; deliveryFee: string; whatsappNumber: string; minPrepHoursNotice: string }

export function SettingsEditor() {
  const [settings, setSettings] = useState<Settings>({ serviceFee: '0', deliveryFee: '0', whatsappNumber: '', minPrepHoursNotice: '24' })
  const [message, setMessage] = useState('')
  useEffect(() => { fetch('/api/settings').then((response) => response.json()).then((value) => setSettings({ serviceFee: String(value.serviceFee ?? 0), deliveryFee: String(value.deliveryFee ?? 0), whatsappNumber: value.whatsappNumber ?? '', minPrepHoursNotice: String(value.minPrepHoursNotice ?? 24) })) }, [])
  async function save(event: React.FormEvent) { event.preventDefault(); const response = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...settings, minPrepHoursNotice: Number(settings.minPrepHoursNotice) }) }); setMessage(response.ok ? 'Settings saved' : ((await response.json()).error || 'Could not save settings')) }
  return <section className="admin-panel"><div className="admin-toolbar"><div><p className="eyebrow">Settings</p><h2>Order defaults</h2></div></div><form className="menu-editor-form" onSubmit={save}><label>Service fee<input type="number" min="0" step="0.01" value={settings.serviceFee} onChange={(event) => setSettings({ ...settings, serviceFee: event.target.value })} /></label><label>Delivery fee<input type="number" min="0" step="0.01" value={settings.deliveryFee} onChange={(event) => setSettings({ ...settings, deliveryFee: event.target.value })} /></label><label>WhatsApp number<input value={settings.whatsappNumber} onChange={(event) => setSettings({ ...settings, whatsappNumber: event.target.value })} /></label><label>Minimum prep notice (hours)<input type="number" min="0" step="1" value={settings.minPrepHoursNotice} onChange={(event) => setSettings({ ...settings, minPrepHoursNotice: event.target.value })} /></label><Button type="submit">Save settings</Button></form>{message && <p className="notice" aria-live="polite">{message}</p>}</section>
}
