import { RequestData } from './request-parser'
import { GeoLocation } from './geo-lookup'
import { StoredRequest } from './request-storage'

export type ChangeType = 'added' | 'removed' | 'changed' | 'unchanged'

export interface FieldChange {
  field: string
  type: ChangeType
  oldValue?: any
  newValue?: any
  path: string[]
}

export interface ComparisonResult {
  similarity: number // 0-100 percentage
  changes: FieldChange[]
  summary: {
    ipChanged: boolean
    locationChanged: boolean
    headersChanged: number
    cookiesChanged: number
    userAgentChanged: boolean
    totalChanges: number
  }
}

export interface MultiComparisonResult {
  baseline: StoredRequest
  comparisons: {
    requestId: string
    request: StoredRequest
    comparison: ComparisonResult
  }[]
}

export class RequestComparator {
  static compare(
    oldRequest: RequestData & { network: RequestData['network'] & { geolocation?: GeoLocation | null } },
    newRequest: RequestData & { network: RequestData['network'] & { geolocation?: GeoLocation | null } }
  ): ComparisonResult {
    const changes: FieldChange[] = []

    // Compare basic request info
    this.compareField(changes, 'method', oldRequest.method, newRequest.method, ['method'])
    this.compareField(changes, 'url', oldRequest.url, newRequest.url, ['url'])
    this.compareField(changes, 'path', oldRequest.path, newRequest.path, ['path'])

    // Compare network info
    this.compareField(changes, 'client_ip', oldRequest.network.clientIP, newRequest.network.clientIP, ['network', 'clientIP'])

    // Compare geolocation
    const oldGeo = oldRequest.network.geolocation
    const newGeo = newRequest.network.geolocation

    if (oldGeo && newGeo) {
      this.compareField(changes, 'country', oldGeo.country, newGeo.country, ['network', 'geolocation', 'country'])
      this.compareField(changes, 'city', oldGeo.city, newGeo.city, ['network', 'geolocation', 'city'])
      this.compareField(changes, 'isp', oldGeo.isp, newGeo.isp, ['network', 'geolocation', 'isp'])
      this.compareField(changes, 'coordinates',
        oldGeo.lat && oldGeo.lon ? `${oldGeo.lat},${oldGeo.lon}` : null,
        newGeo.lat && newGeo.lon ? `${newGeo.lat},${newGeo.lon}` : null,
        ['network', 'geolocation', 'coordinates']
      )
    } else if (oldGeo && !newGeo) {
      changes.push({
        field: 'geolocation',
        type: 'removed',
        oldValue: oldGeo,
        newValue: null,
        path: ['network', 'geolocation']
      })
    } else if (!oldGeo && newGeo) {
      changes.push({
        field: 'geolocation',
        type: 'added',
        oldValue: null,
        newValue: newGeo,
        path: ['network', 'geolocation']
      })
    }

    // Compare headers
    const headerChanges = this.compareObjects(oldRequest.headers.all, newRequest.headers.all, ['headers', 'all'])
    changes.push(...headerChanges)

    // Compare identity headers specifically
    this.compareField(changes, 'user_agent', oldRequest.headers.identity.userAgent, newRequest.headers.identity.userAgent, ['headers', 'identity', 'userAgent'])
    this.compareField(changes, 'accept_language', oldRequest.headers.identity.acceptLanguage, newRequest.headers.identity.acceptLanguage, ['headers', 'identity', 'acceptLanguage'])
    this.compareField(changes, 'referer', oldRequest.headers.identity.referer, newRequest.headers.identity.referer, ['headers', 'identity', 'referer'])

    // Compare security headers
    const secHeaderChanges = this.compareObjects(oldRequest.headers.identity.secHeaders, newRequest.headers.identity.secHeaders, ['headers', 'identity', 'secHeaders'])
    changes.push(...secHeaderChanges)

    // Compare cookies
    const cookieChanges = this.compareObjects(oldRequest.cookies, newRequest.cookies, ['cookies'])
    changes.push(...cookieChanges)

    // Compare query parameters
    const queryChanges = this.compareObjects(oldRequest.query, newRequest.query, ['query'])
    changes.push(...queryChanges)

    // Compare body if present
    if (oldRequest.body && newRequest.body) {
      this.compareField(changes, 'body_type', oldRequest.body.type, newRequest.body.type, ['body', 'type'])
      this.compareField(changes, 'body_size', oldRequest.body.size, newRequest.body.size, ['body', 'size'])

      if (oldRequest.body.parsed && newRequest.body.parsed) {
        const bodyChanges = this.compareObjects(oldRequest.body.parsed, newRequest.body.parsed, ['body', 'parsed'])
        changes.push(...bodyChanges)
      }
    } else if (oldRequest.body && !newRequest.body) {
      changes.push({
        field: 'body',
        type: 'removed',
        oldValue: oldRequest.body,
        newValue: null,
        path: ['body']
      })
    } else if (!oldRequest.body && newRequest.body) {
      changes.push({
        field: 'body',
        type: 'added',
        oldValue: null,
        newValue: newRequest.body,
        path: ['body']
      })
    }

    // Calculate similarity
    const totalFields = this.countTotalFields(oldRequest) + this.countTotalFields(newRequest)
    const unchangedFields = changes.filter(c => c.type === 'unchanged').length
    const similarity = totalFields > 0 ? Math.round((unchangedFields / totalFields) * 100) : 100

    // Generate summary
    const summary = {
      ipChanged: changes.some(c => c.field === 'client_ip' && c.type === 'changed'),
      locationChanged: changes.some(c => (c.field === 'country' || c.field === 'city') && c.type === 'changed'),
      headersChanged: changes.filter(c => c.path[0] === 'headers' && c.type !== 'unchanged').length,
      cookiesChanged: changes.filter(c => c.path[0] === 'cookies' && c.type !== 'unchanged').length,
      userAgentChanged: changes.some(c => c.field === 'user_agent' && c.type === 'changed'),
      totalChanges: changes.filter(c => c.type !== 'unchanged').length
    }

    return {
      similarity,
      changes: changes.filter(c => c.type !== 'unchanged'), // Only return actual changes
      summary
    }
  }

  static compareStoredRequests(oldRequest: StoredRequest, newRequest: StoredRequest): ComparisonResult {
    return this.compare(oldRequest.data, newRequest.data)
  }

  private static compareField(changes: FieldChange[], field: string, oldValue: any, newValue: any, path: string[]) {
    if (oldValue === newValue) {
      changes.push({ field, type: 'unchanged', oldValue, newValue, path })
    } else if (oldValue === undefined || oldValue === null) {
      changes.push({ field, type: 'added', oldValue, newValue, path })
    } else if (newValue === undefined || newValue === null) {
      changes.push({ field, type: 'removed', oldValue, newValue, path })
    } else {
      changes.push({ field, type: 'changed', oldValue, newValue, path })
    }
  }

  private static compareObjects(oldObj: Record<string, any>, newObj: Record<string, any>, basePath: string[]): FieldChange[] {
    const changes: FieldChange[] = []
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])

    for (const key of allKeys) {
      const oldValue = oldObj[key]
      const newValue = newObj[key]
      this.compareField(changes, key, oldValue, newValue, [...basePath, key])
    }

    return changes
  }

  private static countTotalFields(request: any): number {
    let count = 0

    function countRecursive(obj: any): void {
      if (obj === null || obj === undefined) {
        count++
        return
      }

      if (typeof obj === 'object' && !Array.isArray(obj)) {
        for (const value of Object.values(obj)) {
          countRecursive(value)
        }
      } else {
        count++
      }
    }

    countRecursive(request)
    return count
  }

  static formatChange(change: FieldChange): string {
    switch (change.type) {
      case 'added':
        return `[ADDED] ${change.field}: ${this.formatValue(change.newValue)}`
      case 'removed':
        return `[REMOVED] ${change.field}: ${this.formatValue(change.oldValue)}`
      case 'changed':
        return `[CHANGED] ${change.field}: ${this.formatValue(change.oldValue)} → ${this.formatValue(change.newValue)}`
      default:
        return `[UNCHANGED] ${change.field}: ${this.formatValue(change.newValue)}`
    }
  }

  private static formatValue(value: any): string {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'string') return `"${value}"`
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  static isProxyRotationDetected(comparison: ComparisonResult): boolean {
    return comparison.summary.ipChanged || comparison.summary.locationChanged
  }

  static getChangesByCategory(comparison: ComparisonResult) {
    const categories = {
      network: comparison.changes.filter(c => c.path[0] === 'network'),
      headers: comparison.changes.filter(c => c.path[0] === 'headers'),
      cookies: comparison.changes.filter(c => c.path[0] === 'cookies'),
      query: comparison.changes.filter(c => c.path[0] === 'query'),
      body: comparison.changes.filter(c => c.path[0] === 'body'),
      other: comparison.changes.filter(c => !['network', 'headers', 'cookies', 'query', 'body'].includes(c.path[0]))
    }

    return categories
  }
}