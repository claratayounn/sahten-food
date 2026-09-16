import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build' && !process.env.BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET must be set in production')

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.V0_RUNTIME_URL ?? 'http://localhost:3000',
  emailAndPassword: { enabled: true, autoSignIn: true },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false,
      },
    },
  },
  trustedOrigins: [
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []), ...(process.env.V0_DEV_APP_URL ? [process.env.V0_DEV_APP_URL] : []), ...(process.env.V0_BUILD_URL ? [process.env.V0_BUILD_URL] : []), ...(process.env.V0_SANDBOX_URL ? [process.env.V0_SANDBOX_URL] : [])] : []),
    ...(process.env.NODE_ENV === 'production' ? [...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []), ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : [])] : []),
  ],
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  ...(process.env.NODE_ENV === 'development' ? { advanced: { defaultCookieAttributes: { sameSite: 'none' as const, secure: true } } } : {}),
  secret: process.env.BETTER_AUTH_SECRET || (process.env.NODE_ENV === 'development' ? crypto.randomUUID() : undefined),

})
