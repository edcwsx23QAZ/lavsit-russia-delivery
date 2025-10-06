import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkMissingEnvVars } from '@/lib/env-config'

export function middleware(request: NextRequest) {
  // EMERGENCY: SUPER AGGRESSIVE DEV DETECTION
  const isDev = process.env.NODE_ENV === 'development' || 
                process.env.NODE_ENV === undefined ||
                request.nextUrl.hostname.includes('localhost') ||
                request.nextUrl.hostname.includes('127.0.0.1') ||
                request.nextUrl.hostname.includes('.e2b.app') ||
                request.nextUrl.hostname.includes('ideavo') ||
                request.nextUrl.port !== '';

  // Skip middleware for the env-check page itself to avoid infinite redirects
  if (request.nextUrl.pathname === '/env-check') {
    const response = NextResponse.next()
    
    // Добавляем заголовки против кэширования в dev режиме
    if (isDev) {
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
    }
    
    return response
  }

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.includes('.')
  ) {
    const response = NextResponse.next()
    
    // Добавляем заголовки против кэширования в dev режиме
    if (isDev) {
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
    }
    
    return response
  }

  // Check if any required environment variables are missing
  const missingEnvVars = checkMissingEnvVars()

  // If any env variables are missing, redirect to env-check page
  if (missingEnvVars.length > 0) {
    return NextResponse.redirect(new URL('/env-check', request.url))
  }

  const response = NextResponse.next()
  
  // EMERGENCY: NUCLEAR CACHE HEADERS FOR DEV
  if (isDev) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, s-maxage=0, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Last-Modified', new Date().toUTCString())
    response.headers.set('ETag', `dev-${Date.now()}`)
    response.headers.set('X-Dev-Mode', 'true')
    response.headers.set('X-Emergency-No-Cache', 'true')
    response.headers.set('Clear-Site-Data', '"cache", "storage"')
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}