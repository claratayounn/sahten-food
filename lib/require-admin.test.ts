import { beforeEach, beforeAll, describe, expect, it, vi } from 'vitest'

const getSession = vi.fn()
const limit = vi.fn()
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession } } }))
vi.mock('@/lib/db', () => ({ db: { select: () => ({ from: () => ({ where: () => ({ limit }) }) }) } }))
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }))

let requireAdmin: typeof import('./require-admin').requireAdmin
beforeAll(async () => { requireAdmin = (await import('./require-admin')).requireAdmin })

describe('requireAdmin', () => {
  beforeEach(() => { getSession.mockReset(); limit.mockReset() })
  it('rejects missing sessions', async () => {
    getSession.mockResolvedValue(null)
    expect((await requireAdmin()).ok).toBe(false)
  })
  it('allows admin users', async () => {
    getSession.mockResolvedValue({ user: { id: 'admin-1' } })
    limit.mockResolvedValue([{ role: 'admin' }])
    expect((await requireAdmin()).ok).toBe(true)
  })
})
