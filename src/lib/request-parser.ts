import { headers, cookies } from 'next/headers'
import { extractClientIP, parseUserAgent, formatTimestamp } from './utils'

export interface RequestData {
  timestamp: string
  method: string
  url: string
  path: string
  query: Record<string, string>
  headers: {
    all: Record<string, string>
    ordered: Array<[string, string]>
    identity: {
      userAgent?: string
      acceptLanguage?: string
      referer?: string
      secHeaders: Record<string, string>
    }
  }
  network: {
    clientIP: string
    remoteAddress?: string
    port?: number
  }
  cookies: Record<string, string>
  body?: {
    size: number
    preview?: string
    type?: string
    parsed?: any
  }
  cache?: {
    status: string
  }
  performance: {
    serverTime: number
  }
}

export async function parseRequest(request: Request): Promise<RequestData> {
  const startTime = Date.now()
  const timestamp = formatTimestamp(new Date())

  // Get headers and cookies using Next.js 15 async APIs
  const requestHeaders = await headers()
  const requestCookies = await cookies()

  // Parse URL
  const url = new URL(request.url)
  const query: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    query[key] = value
  })

  // Convert headers to objects
  const allHeaders: Record<string, string> = {}
  const orderedHeaders: Array<[string, string]> = []
  const secHeaders: Record<string, string> = {}

  requestHeaders.forEach((value, key) => {
    allHeaders[key] = value
    orderedHeaders.push([key, value])

    // Collect Security headers
    if (key.toLowerCase().startsWith('sec-')) {
      secHeaders[key] = value
    }
  })

  // Parse identity hints
  const userAgent = requestHeaders.get('user-agent') || undefined
  const acceptLanguage = requestHeaders.get('accept-language') || undefined
  const referer = requestHeaders.get('referer') || undefined

  // Extract client IP
  const clientIP = extractClientIP(requestHeaders)

  // Parse cookies
  const cookiesObj: Record<string, string> = {}
  requestCookies.getAll().forEach(({ name, value }) => {
    cookiesObj[name] = value
  })

  // Parse body if present
  let bodyData: RequestData['body'] | undefined
  const contentLength = requestHeaders.get('content-length')
  if (contentLength && parseInt(contentLength) > 0) {
    try {
      const bodyText = await request.clone().text()
      const contentType = requestHeaders.get('content-type') || ''

      bodyData = {
        size: parseInt(contentLength),
        preview: bodyText.slice(0, 1000), // First 1000 chars
        type: contentType
      }

      // Try to parse based on content type
      if (contentType.includes('application/json')) {
        try {
          bodyData.parsed = JSON.parse(bodyText)
        } catch {
          // Invalid JSON, keep as text
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        bodyData.parsed = Object.fromEntries(new URLSearchParams(bodyText))
      }
    } catch (error) {
      // Body parsing failed, skip
    }
  }

  const endTime = Date.now()

  return {
    timestamp,
    method: request.method,
    url: request.url,
    path: url.pathname,
    query,
    headers: {
      all: allHeaders,
      ordered: orderedHeaders,
      identity: {
        userAgent,
        acceptLanguage,
        referer,
        secHeaders
      }
    },
    network: {
      clientIP,
      // Note: remoteAddress and port are not available in Edge Runtime
    },
    cookies: cookiesObj,
    body: bodyData,
    performance: {
      serverTime: endTime - startTime
    }
  }
}