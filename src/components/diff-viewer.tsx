"use client"

import { ComparisonResult, FieldChange, RequestComparator, MultiComparisonResult } from '@/lib/request-comparator'
import { TerminalCopyButton } from './terminal-copy-button'
import { StoredRequest } from '@/lib/request-storage'

interface DiffViewerProps {
  comparison: ComparisonResult | MultiComparisonResult
  className?: string
}

export function DiffViewer({ comparison, className = "" }: DiffViewerProps) {
  const getChangeIcon = (type: FieldChange['type']) => {
    switch (type) {
      case 'added': return '+'
      case 'removed': return '-'
      case 'changed': return '~'
      default: return '='
    }
  }

  const getChangeClass = (type: FieldChange['type']) => {
    switch (type) {
      case 'added': return 'text-green-400'
      case 'removed': return 'text-red-400'
      case 'changed': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const formatChangeText = (change: FieldChange) => {
    const icon = getChangeIcon(change.type)
    switch (change.type) {
      case 'added':
        return `${icon} ${change.field}: ${formatValue(change.newValue)}`
      case 'removed':
        return `${icon} ${change.field}: ${formatValue(change.oldValue)}`
      case 'changed':
        return `${icon} ${change.field}: ${formatValue(change.oldValue)} → ${formatValue(change.newValue)}`
      default:
        return `${icon} ${change.field}: ${formatValue(change.newValue)}`
    }
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'string') return `"${value}"`
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 0)
      } catch {
        return '[object]'
      }
    }
    return String(value)
  }

  // Check if this is a multi-comparison result
  const isMultiComparison = 'baseline' in comparison

  if (isMultiComparison) {
    // Handle multi-comparison view
    const multiResult = comparison as MultiComparisonResult

    return (
      <div className={`space-y-4 ${className}`}>
        {/* Multi-Comparison Header */}
        <div className="border border-border rounded p-4 bg-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="terminal-key text-lg">Baseline Comparison</h3>
            <TerminalCopyButton
              text={JSON.stringify(multiResult, null, 2)}
            />
          </div>

          <div className="space-y-3">
            <div>
              <span className="terminal-key">Baseline Request:</span>
              <div className="text-sm text-muted-foreground mt-1">
                {multiResult.baseline.id} - {new Date(multiResult.baseline.timestamp).toLocaleString()} - {multiResult.baseline.data.network.clientIP}
              </div>
            </div>

            <div>
              <span className="terminal-key">Comparing Against:</span>
              <div className="text-sm space-y-1 mt-1">
                {multiResult.comparisons.map((comp, index) => (
                  <div key={comp.requestId} className="text-muted-foreground">
                    #{index + 1}: {comp.requestId} - {new Date(comp.request.timestamp).toLocaleString()} - {comp.request.data.network.clientIP}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Individual Comparisons */}
        {multiResult.comparisons.map((comp, index) => {
          const categories = RequestComparator.getChangesByCategory(comp.comparison)
          const isProxyRotation = RequestComparator.isProxyRotationDetected(comp.comparison)

          return (
            <div key={comp.requestId} className="border border-border rounded bg-card">
              <div className="px-4 py-2 bg-muted border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="terminal-key">
                      COMPARISON #{index + 1}: {comp.requestId}
                    </span>
                    {isProxyRotation && (
                      <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                        🔄 PROXY ROTATION
                      </span>
                    )}
                  </div>
                  <TerminalCopyButton
                    text={JSON.stringify(comp.comparison, null, 2)}
                  />
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="terminal-key">Similarity:</span>
                    <div className={`text-lg font-mono ${comp.comparison.similarity >= 80 ? 'text-green-400' : comp.comparison.similarity >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {comp.comparison.similarity}%
                    </div>
                  </div>
                  <div>
                    <span className="terminal-key">Total Changes:</span>
                    <div className="terminal-number text-lg">{comp.comparison.summary.totalChanges}</div>
                  </div>
                  <div>
                    <span className="terminal-key">IP Changed:</span>
                    <div className={comp.comparison.summary.ipChanged ? 'text-green-400' : 'text-gray-400'}>
                      {comp.comparison.summary.ipChanged ? 'YES' : 'NO'}
                    </div>
                  </div>
                  <div>
                    <span className="terminal-key">Location Changed:</span>
                    <div className={comp.comparison.summary.locationChanged ? 'text-green-400' : 'text-gray-400'}>
                      {comp.comparison.summary.locationChanged ? 'YES' : 'NO'}
                    </div>
                  </div>
                </div>

                {/* Changes by Category */}
                {comp.comparison.changes.length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(categories).map(([categoryName, changes]) => {
                      if (changes.length === 0) return null

                      return (
                        <div key={categoryName} className="border border-border rounded bg-muted/30">
                          <div className="px-3 py-1 bg-muted border-b border-border">
                            <span className="terminal-key text-sm">
                              {categoryName.toUpperCase()} ({changes.length})
                            </span>
                          </div>
                          <div className="p-3">
                            <div className="space-y-1 font-mono text-xs">
                              {changes.slice(0, 5).map((change, changeIndex) => (
                                <div key={`${change.field}-${changeIndex}`} className="flex items-start gap-2">
                                  <span className={`${getChangeClass(change.type)} font-bold w-3 flex-shrink-0`}>
                                    {getChangeIcon(change.type)}
                                  </span>
                                  <div className="flex-1 break-all">
                                    <span className={getChangeClass(change.type)}>
                                      {formatChangeText(change)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {changes.length > 5 && (
                                <div className="text-muted-foreground text-center">
                                  ... and {changes.length - 5} more changes
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center text-green-400 py-4">
                    ✓ No changes detected
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Handle single comparison (fallback for existing functionality)
  const singleResult = comparison as ComparisonResult
  const categories = RequestComparator.getChangesByCategory(singleResult)
  const isProxyRotation = RequestComparator.isProxyRotationDetected(singleResult)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Header */}
      <div className="border border-border rounded p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <h3 className="terminal-key text-lg">Single Comparison</h3>
            {isProxyRotation && (
              <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                🔄 PROXY ROTATION DETECTED
              </span>
            )}
          </div>
          <TerminalCopyButton
            text={JSON.stringify(singleResult, null, 2)}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="terminal-key">Similarity:</span>
            <div className={`text-lg font-mono ${singleResult.similarity >= 80 ? 'text-green-400' : singleResult.similarity >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {singleResult.similarity}%
            </div>
          </div>
          <div>
            <span className="terminal-key">Total Changes:</span>
            <div className="terminal-number text-lg">{singleResult.summary.totalChanges}</div>
          </div>
          <div>
            <span className="terminal-key">IP Changed:</span>
            <div className={singleResult.summary.ipChanged ? 'text-green-400' : 'text-gray-400'}>
              {singleResult.summary.ipChanged ? 'YES' : 'NO'}
            </div>
          </div>
          <div>
            <span className="terminal-key">Location Changed:</span>
            <div className={singleResult.summary.locationChanged ? 'text-green-400' : 'text-gray-400'}>
              {singleResult.summary.locationChanged ? 'YES' : 'NO'}
            </div>
          </div>
        </div>
      </div>

      {/* No changes message */}
      {singleResult.changes.length === 0 && (
        <div className="border border-border rounded p-6 bg-card text-center">
          <div className="text-green-400 text-xl mb-2">✓</div>
          <div className="terminal-key">No changes detected</div>
          <div className="text-muted-foreground text-sm mt-1">
            Both requests are identical
          </div>
        </div>
      )}

      {/* Changes by Category */}
      {Object.entries(categories).map(([categoryName, changes]) => {
        if (changes.length === 0) return null

        return (
          <div key={categoryName} className="border border-border rounded bg-card">
            <div className="px-4 py-2 bg-muted border-b border-border">
              <div className="flex items-center justify-between">
                <span className="terminal-key">
                  {categoryName.toUpperCase()} CHANGES ({changes.length})
                </span>
                <TerminalCopyButton
                  text={changes.map(c => RequestComparator.formatChange(c)).join('\n')}
                />
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-2 font-mono text-sm">
                {changes.map((change, index) => (
                  <div key={`${change.field}-${index}`} className="flex items-start gap-2">
                    <span className={`${getChangeClass(change.type)} font-bold w-4 flex-shrink-0`}>
                      {getChangeIcon(change.type)}
                    </span>
                    <div className="flex-1 break-all">
                      <span className={getChangeClass(change.type)}>
                        {formatChangeText(change)}
                      </span>
                      {change.path.length > 1 && (
                        <div className="text-muted-foreground text-xs mt-1">
                          Path: {change.path.join(' → ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {/* Key Legend */}
      <div className="border border-border rounded p-3 bg-card">
        <div className="terminal-key mb-2">LEGEND:</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-bold">+</span>
            <span>Added</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400 font-bold">-</span>
            <span>Removed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-bold">~</span>
            <span>Changed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold">=</span>
            <span>Unchanged</span>
          </div>
        </div>
      </div>
    </div>
  )
}