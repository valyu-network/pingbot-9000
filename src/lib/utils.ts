import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function formatTimestamp(date: Date): string {
  return date.toISOString()
}

export function parseUserAgent(userAgent: string) {
  // Simple user agent parsing
  const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/([0-9.]+)/)?.[0] || 'Unknown'
  const os = userAgent.match(/(Windows|Mac OS|Linux|Android|iOS)/)?.[0] || 'Unknown'

  // Extract viewport/device info
  const mobile = /Mobile|Android|iPhone|iPad/.test(userAgent)
  const tablet = /iPad|Android(?!.*Mobile)/.test(userAgent)
  const device = mobile ? (tablet ? 'tablet' : 'mobile') : 'desktop'

  return { browser, os, device, mobile, raw: userAgent }
}

export function extractClientIP(headers: Headers): string {
  // Check for common proxy headers in order of preference
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip',
    'x-cluster-client-ip',
    'forwarded-for',
    'forwarded'
  ]

  for (const header of ipHeaders) {
    const value = headers.get(header)
    if (value) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim()
      if (ip && ip !== 'unknown') return ip
    }
  }

  return 'unknown'
}