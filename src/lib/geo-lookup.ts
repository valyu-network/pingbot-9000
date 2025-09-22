export interface GeoLocation {
  ip: string
  country?: string
  countryCode?: string
  region?: string
  regionName?: string
  city?: string
  zip?: string
  lat?: number
  lon?: number
  timezone?: string
  isp?: string
  org?: string
  as?: string
  asname?: string
  reverse?: string
  mobile?: boolean
  proxy?: boolean
  hosting?: boolean
  query?: string
}

// Simple in-memory cache to avoid repeated API calls
const geoCache = new Map<string, GeoLocation>()
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

export async function lookupIP(ip: string): Promise<GeoLocation | null> {
  // Skip lookup for private/local IPs
  if (isPrivateIP(ip) || ip === 'unknown') {
    return {
      ip,
      country: 'Local/Private',
      countryCode: 'XX',
      city: 'Local Network'
    }
  }

  // Check cache first
  const cached = geoCache.get(ip)
  if (cached) {
    return cached
  }

  try {
    // Using ip-api.com free tier (no API key required)
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,mobile,proxy,hosting,query`,
      {
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.status === 'fail') {
      console.warn(`Geo lookup failed for ${ip}:`, data.message)
      return null
    }

    const geoData: GeoLocation = {
      ip: data.query || ip,
      country: data.country,
      countryCode: data.countryCode,
      region: data.region,
      regionName: data.regionName,
      city: data.city,
      zip: data.zip,
      lat: data.lat,
      lon: data.lon,
      timezone: data.timezone,
      isp: data.isp,
      org: data.org,
      as: data.as,
      asname: data.asname,
      mobile: data.mobile,
      proxy: data.proxy,
      hosting: data.hosting
    }

    // Cache the result
    geoCache.set(ip, geoData)

    // Clean up old cache entries periodically
    if (geoCache.size > 1000) {
      const entries = Array.from(geoCache.entries())
      entries.slice(0, 500).forEach(([key]) => geoCache.delete(key))
    }

    return geoData

  } catch (error) {
    console.error(`Failed to lookup IP ${ip}:`, error)
    return null
  }
}

export async function lookupReverseDNS(ip: string): Promise<string | null> {
  if (isPrivateIP(ip) || ip === 'unknown') {
    return null
  }

  try {
    // Note: Reverse DNS lookup requires server-side implementation
    // This is a placeholder - in a real app you might use a DNS library
    // or call an external service
    return null
  } catch (error) {
    console.error(`Failed reverse DNS lookup for ${ip}:`, error)
    return null
  }
}

function isPrivateIP(ip: string): boolean {
  if (!ip || ip === 'unknown' || ip === 'localhost') return true

  // Check for IPv4 private ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = ip.match(ipv4Regex)

  if (match) {
    const [, a, b, c, d] = match.map(Number)

    // 10.0.0.0/8
    if (a === 10) return true

    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true

    // 192.168.0.0/16
    if (a === 192 && b === 168) return true

    // 127.0.0.0/8 (localhost)
    if (a === 127) return true

    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) return true
  }

  // Check for IPv6 private/local ranges
  if (ip.startsWith('::1') || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true
  }

  return false
}