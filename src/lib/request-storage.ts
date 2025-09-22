import { RequestData } from './request-parser'
import { GeoLocation } from './geo-lookup'

export interface StoredRequest {
  id: string
  timestamp: string
  data: RequestData & {
    network: RequestData['network'] & {
      geolocation?: GeoLocation | null
    }
  }
}

export class RequestStorage {
  static generateId(requestData: RequestData): string {
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 19).replace(/[:.]/g, '')
    const ip = requestData.network.clientIP.replace(/\./g, '-')
    const method = requestData.method.toLowerCase()
    const counter = (Math.random() * 1000).toString(36).slice(0, 3)

    return `${method}-${ip}-${timestamp}-${counter}`
  }

  static async getHistory(): Promise<StoredRequest[]> {
    try {
      if (typeof window === 'undefined') return []

      // Try to fetch from Supabase API first
      const response = await fetch('/api/supabase/requests')
      if (response.ok) {
        const supabaseData = await response.json()
        // Convert Supabase format to StoredRequest format
        const history: StoredRequest[] = supabaseData.map((row: any) => ({
          id: row.id,
          timestamp: row.timestamp,
          data: typeof row.request_data === 'string' ? JSON.parse(row.request_data) : row.request_data
        }))
        return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      } else {
        console.warn('Supabase API failed, falling back to localStorage')
      }

      // Fallback to localStorage if Supabase fails
      const stored = localStorage.getItem('ping-detector-request-history')
      if (!stored) return []

      const history: StoredRequest[] = JSON.parse(stored)
      return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } catch (error) {
      console.error('Failed to load request history:', error)
      return []
    }
  }

  static async saveRequest(requestData: RequestData & { network: RequestData['network'] & { geolocation?: GeoLocation | null } }): Promise<StoredRequest> {
    const id = this.generateId(requestData)

    const newRequest: StoredRequest = {
      id,
      timestamp: requestData.timestamp,
      data: requestData
    }

    if (typeof window === 'undefined') {
      return newRequest
    }

    try {
      // Save to Supabase via API first
      const supabasePayload = {
        id: newRequest.id,
        timestamp: newRequest.timestamp,
        method: requestData.method,
        url: requestData.url,
        path: requestData.path,
        client_ip: requestData.network.clientIP,
        user_agent: requestData.headers.identity.userAgent,
        request_data: requestData
      }

      const response = await fetch('/api/supabase/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supabasePayload)
      })

      if (response.ok) {
        console.log('Successfully saved to Supabase')
      } else {
        console.warn('Failed to save to Supabase, falling back to localStorage')
      }

      // Also save to localStorage as backup
      const history = await this.getHistory()
      const updatedHistory = [newRequest, ...history].slice(0, 50) // Keep last 50 requests
      localStorage.setItem('ping-detector-request-history', JSON.stringify(updatedHistory))

      return newRequest
    } catch (error) {
      console.error('Failed to save request:', error)
      return newRequest
    }
  }

  static async getRequest(id: string): Promise<StoredRequest | null> {
    const history = await this.getHistory()
    return history.find(req => req.id === id) || null
  }

  static async clearHistory(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      // Clear from Supabase first
      const response = await fetch('/api/supabase/requests', {
        method: 'DELETE'
      })

      if (response.ok) {
        console.log('Successfully cleared Supabase history')
      } else {
        console.warn('Failed to clear Supabase history')
      }

      // Also clear localStorage
      localStorage.removeItem('ping-detector-request-history')
    } catch (error) {
      console.error('Failed to clear history:', error)
    }
  }

  static async getLastRequest(): Promise<StoredRequest | null> {
    const history = await this.getHistory()
    return history[0] || null
  }

  static async getRequestsByIP(ip: string): Promise<StoredRequest[]> {
    const history = await this.getHistory()
    return history.filter(req => req.data.network.clientIP === ip)
  }

  static async getUniqueIPs(): Promise<string[]> {
    const history = await this.getHistory()
    const ips = new Set(history.map(req => req.data.network.clientIP))
    return Array.from(ips)
  }

  static async getRequestsByLocation(country: string): Promise<StoredRequest[]> {
    const history = await this.getHistory()
    return history.filter(req =>
      req.data.network.geolocation?.country?.toLowerCase() === country.toLowerCase()
    )
  }

  static async exportHistory(): Promise<string> {
    const history = await this.getHistory()
    return JSON.stringify(history, null, 2)
  }

  static async importHistory(jsonData: string): Promise<boolean> {
    if (typeof window === 'undefined') return false

    try {
      const imported: StoredRequest[] = JSON.parse(jsonData)

      // Validate the structure
      if (!Array.isArray(imported)) {
        throw new Error('Invalid format: expected array')
      }

      for (const item of imported) {
        if (!item.id || !item.timestamp || !item.data) {
          throw new Error('Invalid request format')
        }
      }

      // Merge with existing history, remove duplicates by ID
      const existing = await this.getHistory()
      const combined = [...imported, ...existing]
      const unique = combined.filter((item, index, arr) =>
        arr.findIndex(other => other.id === item.id) === index
      )

      const final = unique
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50)

      localStorage.setItem('ping-detector-request-history', JSON.stringify(final))
      return true
    } catch (error) {
      console.error('Failed to import history:', error)
      return false
    }
  }
}