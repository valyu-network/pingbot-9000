"use client"

import { useState } from 'react'

interface HeaderTooltipProps {
  header: string
  children: React.ReactNode
}

const headerExplanations: Record<string, string> = {
  // Standard HTTP headers
  'host': 'The domain name and port number of the server',
  'user-agent': 'Browser/client identification string containing browser, OS, and device info',
  'accept': 'MIME types the client can process (text/html, application/json, etc.)',
  'accept-language': 'Preferred languages for the response (en-US, en, etc.)',
  'accept-encoding': 'Compression algorithms the client supports (gzip, deflate, br)',
  'connection': 'Controls whether network connection stays open after current transaction',
  'cache-control': 'Directives for caching mechanisms in both requests and responses',
  'cookie': 'Previously stored HTTP cookies sent by the server',
  'referer': 'URL of the page that linked to this resource',
  'origin': 'Origin of the request (protocol + domain + port)',
  'content-type': 'Media type of the request body (application/json, text/html, etc.)',
  'content-length': 'Size of the request body in bytes',
  'authorization': 'Authentication credentials for HTTP authentication',

  // Proxy and forwarding headers
  'x-forwarded-for': 'Original client IP when behind proxy/load balancer (User → Proxy → Server)',
  'x-forwarded-host': 'Original Host header when behind proxy',
  'x-forwarded-proto': 'Original protocol (http/https) when behind proxy',
  'x-forwarded-port': 'Original port when behind proxy',
  'x-real-ip': 'Real client IP address (commonly used by Nginx)',
  'forwarded': 'Standardized version of X-Forwarded-* headers (RFC 7239)',

  // Cloudflare headers
  'cf-connecting-ip': 'Real visitor IP address (Cloudflare CDN)',
  'cf-ray': 'Unique identifier for Cloudflare request',
  'cf-visitor': 'Original visitor protocol (Cloudflare)',
  'cf-ipcountry': 'Country code of visitor IP (Cloudflare)',

  // Security headers
  'sec-ch-ua': 'User agent client hints - browser brand and version',
  'sec-ch-ua-mobile': 'Whether the request is from a mobile device',
  'sec-ch-ua-platform': 'Operating system platform',
  'sec-fetch-site': 'Relationship between request origin and target (same-origin, cross-site, etc.)',
  'sec-fetch-mode': 'Request mode (navigate, cors, no-cors, same-origin)',
  'sec-fetch-dest': 'Request destination (document, script, image, etc.)',
  'sec-fetch-user': 'Whether request was triggered by user activation',
  'strict-transport-security': 'Forces HTTPS connections (HSTS)',
  'content-security-policy': 'Helps prevent XSS attacks by controlling resource loading',

  // Next.js specific
  'next-router-prefetch': 'Next.js router prefetching indicator',
  'next-url': 'Next.js internal URL information',

  // Common custom headers
  'x-requested-with': 'Identifies Ajax requests (XMLHttpRequest)',
  'x-csrf-token': 'Cross-Site Request Forgery protection token',
  'x-api-key': 'API authentication key',
  'x-client-version': 'Client application version',
  'x-device-id': 'Unique device identifier',

  // Load balancer headers
  'x-amzn-trace-id': 'AWS Application Load Balancer trace ID',
  'x-azure-ref': 'Azure load balancer reference',

  // CDN headers
  'x-cache': 'Cache status (HIT, MISS, BYPASS)',
  'x-served-by': 'Server/CDN node that served the request',
  'via': 'Proxy servers the request passed through',

  // Browser features
  'upgrade-insecure-requests': 'Browser preference to upgrade HTTP to HTTPS',
  'dnt': 'Do Not Track preference (1 = do not track)',
  'save-data': 'Client preference for reduced data usage'
}

export function HeaderTooltip({ header, children }: HeaderTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const explanation = headerExplanations[header.toLowerCase()]

  if (!explanation) {
    return <>{children}</>
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 bottom-full left-0 mb-2 p-2 bg-gray-900 border border-gray-700 rounded text-xs text-white max-w-xs break-words shadow-lg">
          <div className="font-medium text-blue-300 mb-1">{header}</div>
          <div className="text-gray-300">{explanation}</div>
          {/* Arrow */}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  )
}