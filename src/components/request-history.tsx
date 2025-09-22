"use client"

import { useState, useEffect } from 'react'
import { StoredRequest } from '@/lib/request-storage'
import { TerminalCopyButton } from './terminal-copy-button'
import { parseUserAgent } from '@/lib/utils'

interface RequestHistoryProps {
  history: StoredRequest[]
  selectedRequests: string[]
  onSelectRequest: (id: string) => void
  onRemoveFromSelection: (id: string) => void
  onClearHistory: () => void
  className?: string
}

export function RequestHistory({
  history,
  selectedRequests,
  onSelectRequest,
  onRemoveFromSelection,
  onClearHistory,
  className = ""
}: RequestHistoryProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [newestRequestId, setNewestRequestId] = useState<string | null>(null)

  // Update timestamp when history changes and track newest request
  useEffect(() => {
    if (history.length > 0) {
      const newest = history[0]
      if (newestRequestId !== newest.id) {
        setNewestRequestId(newest.id)
        setLastUpdate(new Date())

        // Clear the highlight after 3 seconds
        const timer = setTimeout(() => {
          setNewestRequestId(null)
        }, 3000)

        return () => clearTimeout(timer)
      }
    }
  }, [history.length, history[0]?.id, newestRequestId])
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diff = now.getTime() - time.getTime()

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-green-400'
      case 'POST': return 'text-orange-400'
      case 'PUT': return 'text-blue-400'
      case 'DELETE': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  if (history.length === 0) {
    return (
      <div className={`border border-border rounded p-6 bg-card text-center ${className}`}>
        <div className="text-muted-foreground text-xl mb-2">📜</div>
        <div className="terminal-key">No Request History</div>
        <div className="text-muted-foreground text-sm mt-1">
          Make requests to start tracking history
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="terminal-key">REQUEST HISTORY ({history.length})</span>
          {selectedRequests.length > 0 && (
            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
              {selectedRequests.length} selected
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
        <div className="flex gap-2">
          <TerminalCopyButton
            text={JSON.stringify(history, null, 2)}
            className="text-xs"
          />
          <button
            onClick={onClearHistory}
            className="text-xs px-2 py-1 border border-red-600 text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors"
          >
            clear
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {history.map((request, index) => {
          const isSelected = selectedRequests.includes(request.id)
          const isNewest = newestRequestId === request.id
          const userAgentInfo = request.data.headers.identity.userAgent
            ? parseUserAgent(request.data.headers.identity.userAgent)
            : null

          return (
            <div
              key={`${request.id}-${index}`}
              className={`border rounded p-3 bg-card cursor-pointer transition-all ${
                isNewest
                  ? 'border-green-400 bg-green-950/20 shadow-lg shadow-green-500/20'
                  : isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-950/20'
                    : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => onSelectRequest(request.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  {isNewest && (
                    <span className="text-xs bg-green-600 text-white px-1 py-0.5 rounded animate-pulse">
                      NEW
                    </span>
                  )}
                  <span className={`font-mono text-sm ${getMethodColor(request.data.method)}`}>
                    {request.data.method}
                  </span>
                  <span className="terminal-ip text-sm">
                    {request.data.network.clientIP}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(request.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="terminal-key text-xs">id:</span>
                  <span className="terminal-string text-xs">{request.id}</span>
                  {isSelected && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveFromSelection(request.id)
                        }}
                        className="text-xs px-1 py-0.5 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors"
                        title="Remove from selection"
                      >
                        ×
                      </button>
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                {/* Location */}
                {request.data.network.geolocation && (
                  <div>
                    <span className="terminal-key">location:</span>
                    <span className="terminal-string ml-1">
                      {request.data.network.geolocation.city}, {request.data.network.geolocation.country}
                    </span>
                  </div>
                )}

                {/* Browser */}
                {userAgentInfo && (
                  <div>
                    <span className="terminal-key">browser:</span>
                    <span className="terminal-value ml-1">{userAgentInfo.browser}</span>
                  </div>
                )}

                {/* Path */}
                <div>
                  <span className="terminal-key">path:</span>
                  <span className="terminal-value ml-1 break-all">{request.data.path}</span>
                </div>

                {/* Response Time */}
                <div>
                  <span className="terminal-key">time:</span>
                  <span className="terminal-number ml-1">{request.data.performance.serverTime}ms</span>
                </div>

                {/* Headers Count */}
                <div>
                  <span className="terminal-key">headers:</span>
                  <span className="terminal-number ml-1">{request.data.headers.ordered.length}</span>
                </div>

                {/* Cookies Count */}
                <div>
                  <span className="terminal-key">cookies:</span>
                  <span className="terminal-number ml-1">{Object.keys(request.data.cookies).length}</span>
                </div>
              </div>

              {/* Query Parameters Preview */}
              {Object.keys(request.data.query).length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="terminal-key text-xs">query:</span>
                  <div className="text-xs text-muted-foreground mt-1 break-all">
                    {Object.entries(request.data.query)
                      .slice(0, 3)
                      .map(([key, value]) => `${key}=${value}`)
                      .join(', ')}
                    {Object.keys(request.data.query).length > 3 && '...'}
                  </div>
                </div>
              )}

              {/* Request Body Preview */}
              {request.data.body && (
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="terminal-key text-xs">body:</span>
                  <span className="terminal-string text-xs ml-1">{request.data.body.type}</span>
                  <span className="terminal-number text-xs ml-2">
                    {request.data.body.size} bytes
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selection Instructions */}
      <div className="text-xs text-muted-foreground text-center p-2 border border-border rounded bg-muted/30">
        Click requests to select (up to 5) • Most recent becomes baseline • Click × to remove • Use "🔄 live" to auto-update with new requests
      </div>
    </div>
  )
}