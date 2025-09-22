import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Skip dashboard and internal routes
  if (
    request.nextUrl.pathname === '/' ||                    // Skip dashboard at root
    request.nextUrl.pathname.startsWith('/dashboard') ||   // Skip dashboard routes
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/favicon') ||
    request.nextUrl.pathname.endsWith('.js') ||
    request.nextUrl.pathname.endsWith('.css') ||
    request.nextUrl.pathname.endsWith('.ico')
  ) {
    return NextResponse.next()
  }

  // Capture this incoming request
  const startTime = Date.now()

  console.log(`🔍 Capturing request: ${request.method} ${request.nextUrl.pathname}`)

  try {
    // Get real client IP (handle proxies, cloudflare, etc.)
    const clientIP =
      request.headers.get('cf-connecting-ip') ||           // Cloudflare
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || // Proxy
      request.headers.get('x-real-ip') ||                  // Nginx
      'unknown'

    // Capture full request data
    const requestData = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: `${request.nextUrl.origin}${request.nextUrl.pathname}${request.nextUrl.search}`,
      path: request.nextUrl.pathname,
      query: Object.fromEntries(request.nextUrl.searchParams.entries()),
      headers: {
        all: Object.fromEntries(request.headers.entries()),
        ordered: Array.from(request.headers.entries()),
        identity: {
          userAgent: request.headers.get('user-agent'),
          acceptLanguage: request.headers.get('accept-language'),
          referer: request.headers.get('referer'),
          secHeaders: Object.fromEntries(
            Array.from(request.headers.entries()).filter(([key]) =>
              key.toLowerCase().startsWith('sec-')
            )
          )
        }
      },
      cookies: Object.fromEntries(
        (request.headers.get('cookie') || '')
          .split(';')
          .map(c => c.trim().split('='))
          .filter(([name, value]) => name && value)
          .map(([name, value]) => [name, decodeURIComponent(value)])
      ),
      body: null, // Will handle body separately if needed
      network: {
        clientIP,
        geolocation: null
      },
      performance: {
        serverTime: 0 // Will be calculated after response
      }
    }

    // Generate meaningful ID
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 19).replace(/[:.]/g, '')
    const ip = clientIP.replace(/[.:]/g, '-')
    const method = request.method.toLowerCase()
    const counter = Math.random().toString(36).slice(2, 5)
    const requestId = `${method}-${ip}-${timestamp}-${counter}`

    // Log this request asynchronously (don't block the response)
    const logRequest = async () => {
      try {
        const endTime = Date.now()
        requestData.performance.serverTime = endTime - startTime

        // Try to get geolocation for this IP
        if (clientIP !== 'unknown' && !clientIP.startsWith('127.') && !clientIP.startsWith('192.168.')) {
          try {
            const geoResponse = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,city,isp,lat,lon,query`)
            if (geoResponse.ok) {
              const geoData = await geoResponse.json()
              if (geoData.status === 'success') {
                ;(requestData.network as any).geolocation = {
                  country: geoData.country,
                  city: geoData.city,
                  isp: geoData.isp,
                  lat: geoData.lat,
                  lon: geoData.lon,
                  query: geoData.query
                }
              }
            }
          } catch (geoError) {
            console.warn('Geo lookup failed:', geoError)
          }
        }

        // Save to Supabase
        await fetch(`${request.nextUrl.origin}/api/supabase/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: requestId,
            timestamp: requestData.timestamp,
            method: requestData.method,
            url: requestData.url,
            path: requestData.path,
            client_ip: clientIP,
            user_agent: requestData.headers.identity.userAgent,
            request_data: requestData
          })
        })

        console.log(`✅ Successfully stored: ${method.toUpperCase()} ${requestData.path} from ${clientIP}`)
      } catch (error) {
        console.error('❌ Failed to store request to Supabase:', error)
        console.error('Request data:', {
          method: requestData.method,
          path: requestData.path,
          clientIP,
          url: requestData.url,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ? 'SET' : 'MISSING'
        })
      }
    }

    // Don't await this - let the request proceed immediately
    logRequest()

  } catch (error) {
    console.error('❌ Middleware error:', error)
    console.error('Request details:', {
      method: request.method,
      path: request.nextUrl.pathname,
      headers: Object.fromEntries(request.headers.entries())
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all requests except:
     * - API routes (our internal APIs)
     * - Next.js internals (_next)
     * - Static files
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}