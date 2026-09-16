import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.get('better-auth.session_token') || request.cookies.get('__Secure-better-auth.session_token')
  if (!hasSession) return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url))
  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*'] }
