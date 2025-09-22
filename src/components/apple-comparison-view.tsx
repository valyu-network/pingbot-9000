"use client"

import { MultiComparisonResult, ComparisonResult } from '@/lib/request-comparator'
import { StoredRequest } from '@/lib/request-storage'
import { TerminalCopyButton } from './terminal-copy-button'
import { parseUserAgent } from '@/lib/utils'

interface AppleComparisonViewProps {
  comparison: ComparisonResult | MultiComparisonResult
  className?: string
}

interface FieldData {
  label: string
  value: any
  path: string[]
  changed?: boolean
}

export function AppleComparisonView({ comparison, className = "" }: AppleComparisonViewProps) {
  const isMultiComparison = 'baseline' in comparison

  if (!isMultiComparison) {
    return (
      <div className={`p-4 border border-border rounded bg-card ${className}`}>
        <div className="text-center text-muted-foreground">
          Apple-style comparison is only available for multi-request comparisons.
          Please select 2 or more requests to compare.
        </div>
      </div>
    )
  }

  const multiResult = comparison as MultiComparisonResult
  const baseline = multiResult.baseline
  const comparisons = multiResult.comparisons.slice(0, 4) // Limit to 4 comparisons

  // Extract field data from a request
  const extractFieldData = (request: StoredRequest): FieldData[] => {
    const data = request.data
    const userAgent = data.headers.identity.userAgent ? parseUserAgent(data.headers.identity.userAgent) : null

    return [
      { label: 'ID', value: request.id, path: ['id'] },
      { label: 'Timestamp', value: new Date(request.timestamp).toLocaleString(), path: ['timestamp'] },
      { label: 'Method', value: data.method, path: ['method'] },
      { label: 'URL', value: data.url, path: ['url'] },
      { label: 'Path', value: data.path, path: ['path'] },
      { label: 'Client IP', value: data.network.clientIP, path: ['network', 'clientIP'] },
      { label: 'Country', value: data.network.geolocation?.country || 'Unknown', path: ['network', 'geolocation', 'country'] },
      { label: 'City', value: data.network.geolocation?.city || 'Unknown', path: ['network', 'geolocation', 'city'] },
      { label: 'ISP', value: data.network.geolocation?.isp || 'Unknown', path: ['network', 'geolocation', 'isp'] },
      { label: 'Browser', value: userAgent?.browser || 'Unknown', path: ['headers', 'identity', 'userAgent'] },
      { label: 'OS', value: userAgent?.os || 'Unknown', path: ['headers', 'identity', 'userAgent'] },
      { label: 'User Agent', value: data.headers.identity.userAgent || 'None', path: ['headers', 'identity', 'userAgent'] },
      { label: 'Accept Language', value: data.headers.identity.acceptLanguage || 'None', path: ['headers', 'identity', 'acceptLanguage'] },
      { label: 'Referer', value: data.headers.identity.referer || 'None', path: ['headers', 'identity', 'referer'] },
      { label: 'Headers Count', value: data.headers.ordered.length, path: ['headers', 'ordered'] },
      { label: 'Cookies Count', value: Object.keys(data.cookies).length, path: ['cookies'] },
      { label: 'Query Params', value: Object.keys(data.query).length, path: ['query'] },
      { label: 'Body Type', value: data.body?.type || 'None', path: ['body', 'type'] },
      { label: 'Body Size', value: data.body?.size || 0, path: ['body', 'size'] },
      { label: 'Server Time', value: `${data.performance.serverTime}ms`, path: ['performance', 'serverTime'] },
    ]
  }

  // Check if a field is changed in any comparison
  const isFieldChanged = (fieldPath: string[], comparisonIndex: number): boolean => {
    if (comparisonIndex >= comparisons.length) return false
    const comp = comparisons[comparisonIndex].comparison
    return comp.changes.some(change =>
      change.path.join('.') === fieldPath.join('.') && change.type !== 'unchanged'
    )
  }

  const baselineFields = extractFieldData(baseline)
  const comparisonFields = comparisons.map(comp => extractFieldData(comp.request))

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 47) + '...'
    }
    return String(value)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="border border-border rounded p-4 bg-card">
        <div className="flex items-center justify-between">
          <h3 className="terminal-key text-lg">compare dem requezzts....ya boi</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Baseline + {comparisons.length} comparison{comparisons.length !== 1 ? 's' : ''}
            </span>
            <TerminalCopyButton text={JSON.stringify(multiResult, null, 2)} />
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="border border-border rounded bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed" style={{ minWidth: '1200px' }}>
            {/* Header Row */}
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="w-48 p-3 text-left font-semibold terminal-key">Field</th>
                <th className="w-60 p-3 text-left font-semibold terminal-key border-l border-border">
                  <div>Baseline</div>
                  <div className="text-xs text-muted-foreground font-normal mt-1">
                    {baseline.id.substring(0, 20)}...
                  </div>
                </th>
                {comparisons.map((comp, index) => (
                  <th key={comp.requestId} className="w-60 p-3 text-left font-semibold terminal-key border-l border-border">
                    <div>Comparison #{index + 1}</div>
                    <div className="text-xs text-muted-foreground font-normal mt-1">
                      {comp.requestId.substring(0, 20)}...
                    </div>
                    <div className="text-xs mt-1">
                      <span className={`px-1 py-0.5 rounded text-xs ${comp.comparison.summary.ipChanged ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                        }`}>
                        {comp.comparison.summary.ipChanged ? 'IP ✓' : 'IP ✗'}
                      </span>
                    </div>
                  </th>
                ))}
                {/* Empty columns for unused comparison slots */}
                {Array.from({ length: 4 - comparisons.length }, (_, index) => (
                  <th key={`empty-${index}`} className="w-60 p-3 text-left border-l border-border">
                    <span className="text-muted-foreground">—</span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Data Rows */}
            <tbody className="max-h-[600px] overflow-y-auto">
              {baselineFields.map((baseField, fieldIndex) => (
                <tr key={baseField.label} className={`border-b border-border hover:bg-muted/30 ${fieldIndex % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                  }`}>
                  {/* Field Label */}
                  <td className="p-3 font-medium terminal-key text-sm">
                    {baseField.label}
                  </td>

                  {/* Baseline Value */}
                  <td className="p-3 border-l border-border text-sm font-mono">
                    <span className="break-all">
                      {formatValue(baseField.value)}
                    </span>
                  </td>

                  {/* Comparison Values */}
                  {Array.from({ length: 4 }, (_, compIndex) => {
                    const hasComparison = compIndex < comparisons.length
                    const field = hasComparison ? comparisonFields[compIndex][fieldIndex] : null
                    const isChanged = hasComparison ? isFieldChanged(baseField.path, compIndex) : false

                    return (
                      <td
                        key={compIndex}
                        className={`p-3 border-l border-border text-sm font-mono ${!hasComparison ? 'bg-muted/50' : isChanged ? 'bg-yellow-500/20 text-yellow-300' : ''
                          }`}
                      >
                        {hasComparison ? (
                          <span className={`break-all ${isChanged ? 'font-semibold' : ''}`}>
                            {formatValue(field?.value)}
                            {isChanged && (
                              <span className="ml-2 text-yellow-400 text-xs">●</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {comparisons.map((comp, index) => (
          <div key={comp.requestId} className="border border-border rounded p-3 bg-card">
            <div className="text-sm font-semibold terminal-key mb-2">
              Comparison #{index + 1}
            </div>
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Similarity:</span>
                <span className={`ml-2 font-mono ${comp.comparison.similarity >= 80 ? 'text-green-400' :
                  comp.comparison.similarity >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                  {comp.comparison.similarity}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Changes:</span>
                <span className="ml-2 font-mono terminal-number">
                  {comp.comparison.summary.totalChanges}
                </span>
              </div>
              <div className="flex gap-1 mt-2">
                {comp.comparison.summary.ipChanged && (
                  <span className="px-1 py-0.5 bg-green-600 text-white rounded text-xs">IP</span>
                )}
                {comp.comparison.summary.locationChanged && (
                  <span className="px-1 py-0.5 bg-blue-600 text-white rounded text-xs">LOC</span>
                )}
                {comp.comparison.summary.userAgentChanged && (
                  <span className="px-1 py-0.5 bg-purple-600 text-white rounded text-xs">UA</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="border border-border rounded p-3 bg-card">
        <div className="terminal-key mb-2">LEGEND:</div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500/20 border border-yellow-500/50 rounded"></div>
            <span>Changed Field</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">●</span>
            <span>Change Indicator</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">—</span>
            <span>No Comparison Data</span>
          </div>
        </div>
      </div>
    </div>
  )
}