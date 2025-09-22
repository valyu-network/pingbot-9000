"use client"

import { useEffect, useState } from 'react'
import { RequestData } from '@/lib/request-parser'
import { GeoLocation } from '@/lib/geo-lookup'
import { formatBytes, parseUserAgent } from '@/lib/utils'
import { TerminalWindow, TerminalLine, TerminalSection, TerminalJson, TerminalTable } from './terminal-window'
import { TerminalCopyButton } from './terminal-copy-button'
import { RequestHistory } from './request-history'
import { DiffViewer } from './diff-viewer'
import { AppleComparisonView } from './apple-comparison-view'
import { HeaderTooltip } from './header-tooltip'

interface RequestInspectorProps {
  data: RequestData & {
    network: RequestData['network'] & {
      geolocation?: GeoLocation | null
    }
  }
  autoShiftRequests?: boolean
  toggleAutoShift?: () => void
  history: any[]
  selectedRequests: string[]
  comparisonResult: any
  keepLiveResponse: boolean
  selectRequest: (id: string) => void
  removeFromSelection: (id: string) => void
  clearSelection: () => void
  compareSelected: () => void
  clearHistory: () => void
  toggleKeepLiveResponse: () => void
  canCompare: boolean
  hasHistory: boolean
  setComparingActive: (active: boolean) => void
}

export function RequestInspector({
  data,
  autoShiftRequests,
  toggleAutoShift,
  history,
  selectedRequests,
  comparisonResult,
  keepLiveResponse,
  selectRequest,
  removeFromSelection,
  clearSelection,
  compareSelected,
  clearHistory,
  toggleKeepLiveResponse,
  canCompare,
  hasHistory,
  setComparingActive
}: RequestInspectorProps) {
  const userAgentInfo = data.headers.identity.userAgent ? parseUserAgent(data.headers.identity.userAgent) : null
  const hasBody = data.body && data.body.size > 0
  const hasCookies = Object.keys(data.cookies).length > 0
  const hasSecHeaders = Object.keys(data.headers.identity.secHeaders).length > 0

  // State for view mode
  const [viewMode, setViewMode] = useState<'dashboard' | 'history' | 'comparison'>('dashboard')

  // Notify hook when comparison view becomes active/inactive
  useEffect(() => {
    setComparingActive(viewMode === 'comparison')
  }, [viewMode, setComparingActive])

  // No longer auto-save - requests are captured by middleware

  const getMethodClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'terminal-method-get'
      case 'POST': return 'terminal-method-post'
      case 'PUT': return 'terminal-method-put'
      case 'DELETE': return 'terminal-method-delete'
      default: return 'terminal-value'
    }
  }

  const handleCompareSelected = () => {
    compareSelected()
    setViewMode('comparison')
  }


  return (
    <div className="fixed inset-0 flex flex-col">
      <div className="dashboard-container h-full flex flex-col">
        {/* Header - Fixed Height */}
        <div className="dashboard-header-new flex-shrink-0 p-4">
          <TerminalWindow title={`∇ ping-bot-9000 — ${viewMode}`}>
            <div className="space-y-3">
              {/* Main Info Line with URL */}
              <TerminalLine
                command={`url: ${data.url}`}
                output={
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="terminal-key">method</span>
                        <span className="text-muted-foreground mx-2">:</span>
                        <span className={getMethodClass(data.method)}>{data.method}</span>
                      </div>
                      <div>
                        <span className="terminal-key">ip</span>
                        <span className="text-muted-foreground mx-2">:</span>
                        <span className="terminal-ip">{data.network.clientIP}</span>
                      </div>
                      <div>
                        <span className="terminal-key">time</span>
                        <span className="text-muted-foreground mx-2">:</span>
                        <span className="terminal-number">{data.performance.serverTime}ms</span>
                      </div>
                      <div>
                        <span className="terminal-key">timestamp</span>
                        <span className="text-muted-foreground mx-2">:</span>
                        <span className="terminal-string">{new Date(data.timestamp).toLocaleTimeString()}</span>
                      </div>
                      {hasHistory && (
                        <div>
                          <span className="terminal-key">requests</span>
                          <span className="text-muted-foreground mx-2">:</span>
                          <span className="terminal-number">{history.length}</span>
                        </div>
                      )}
                      {Object.keys(data.query).length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="terminal-key">query</span>
                          <span className="text-muted-foreground mx-2">:</span>
                          <div className="flex gap-1">
                            {Object.entries(data.query).map(([key, value]) => (
                              <span key={key} className="text-xs bg-gray-800 px-1 py-0.5 rounded">
                                <span className="terminal-key">{key}</span>=<span className="terminal-value">{value}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <TerminalCopyButton text={JSON.stringify(data, null, 2)} />
                  </div>
                }
              />

              {/* View Controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('dashboard')}
                    className={`px-3 py-1 text-xs border rounded transition-colors ${viewMode === 'dashboard'
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    dashboard
                  </button>
                  <button
                    onClick={() => setViewMode('history')}
                    className={`px-3 py-1 text-xs border rounded transition-colors ${viewMode === 'history'
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    history ({history.length})
                  </button>
                  {comparisonResult && (
                    <button
                      onClick={() => setViewMode('comparison')}
                      className={`px-3 py-1 text-xs border rounded transition-colors ${viewMode === 'comparison'
                        ? 'border-yellow-500 bg-yellow-500 text-black'
                        : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      comparison
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Live Response Toggle */}
                  {selectedRequests.length > 0 && (
                    <button
                      onClick={toggleKeepLiveResponse}
                      className={`px-2 py-1 text-xs border rounded transition-colors ${keepLiveResponse
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {keepLiveResponse ? '🔄 live' : 'static'}
                    </button>
                  )}

                  {/* Auto-Shift Toggle */}
                  {selectedRequests.length > 0 && toggleAutoShift && (
                    <button
                      onClick={toggleAutoShift}
                      className={`px-2 py-1 text-xs border rounded transition-colors ${autoShiftRequests
                        ? 'border-purple-500 bg-purple-500 text-white'
                        : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      title={autoShiftRequests
                        ? 'Auto-shift mode: New requests push older ones down'
                        : 'Static mode: New requests only update baseline'
                      }
                    >
                      {autoShiftRequests ? '📤 shift' : '📌 hold'}
                    </button>
                  )}

                  {/* Clear Selection */}
                  {selectedRequests.length > 0 && (
                    <button
                      onClick={() => {
                        clearSelection()
                      }}
                      className="px-2 py-1 text-xs border border-red-500 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors"
                    >
                      clear ({selectedRequests.length})
                    </button>
                  )}

                  {/* Comparison Actions */}
                  {canCompare && (
                    <button
                      onClick={handleCompareSelected}
                      className="px-3 py-1 text-xs border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black rounded transition-colors"
                    >
                      compare selected ({selectedRequests.length})
                    </button>
                  )}

                  {/* Comparison Status */}
                  {comparisonResult && (
                    <div className="flex items-center gap-2 text-xs">
                      {'baseline' in comparisonResult ? (
                        // Multi-comparison result
                        <span className="px-2 py-1 bg-purple-600 text-white rounded">
                          📊 BASELINE COMPARISON ({comparisonResult.comparisons.length})
                        </span>
                      ) : (
                        // Single comparison result
                        <>
                          {comparisonResult.summary.ipChanged && (
                            <span className="px-2 py-1 bg-green-600 text-white rounded">
                              🔄 IP CHANGED
                            </span>
                          )}
                          {comparisonResult.summary.locationChanged && (
                            <span className="px-2 py-1 bg-blue-600 text-white rounded">
                              📍 LOCATION CHANGED
                            </span>
                          )}
                          {comparisonResult.summary.totalChanges === 0 && (
                            <span className="px-2 py-1 bg-gray-600 text-white rounded">
                              ≡ IDENTICAL
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TerminalWindow>
        </div>

        {/* Dashboard Content - 2x2 Grid Layout */}
        {viewMode === 'dashboard' && (
          <div className="widgets-container flex-1 flex flex-wrap gap-2 p-2 overflow-y-auto md:overflow-hidden">
            {/* Top Left - User Agent */}
            <div className="basis-full md:basis-[calc(50%-0.25rem)] grow h-80 md:h-[calc(50%-0.25rem)] flex flex-col min-h-0">
              <TerminalWindow title="user-agent">
                <div className="space-y-2 h-full overflow-y-auto">
                  {data.headers.identity.userAgent ? (
                    <>
                      {userAgentInfo && (
                        <div className="space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="terminal-key">browser</span>
                              <div className="terminal-value mt-1">{userAgentInfo.browser}</div>
                            </div>
                            <div>
                              <span className="terminal-key">os</span>
                              <div className="terminal-value mt-1">{userAgentInfo.os}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="terminal-key">device</span>
                              <div className="terminal-value mt-1">{userAgentInfo.device}</div>
                            </div>
                            <div>
                              <span className="terminal-key">viewport</span>
                              <div className="terminal-value mt-1">
                                {data.headers.all['viewport-width'] && data.headers.all['viewport-height']
                                  ? `${data.headers.all['viewport-width']}×${data.headers.all['viewport-height']}`
                                  : userAgentInfo.mobile ? 'mobile' : 'unknown'
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {data.headers.identity.acceptLanguage && (
                        <div>
                          <span className="terminal-key">language</span>
                          <div className="terminal-value text-sm mt-1">{data.headers.identity.acceptLanguage}</div>
                        </div>
                      )}
                      {data.headers.identity.referer && (
                        <div>
                          <span className="terminal-key">referer</span>
                          <div className="terminal-string text-xs mt-1 break-all">{data.headers.identity.referer}</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted-foreground text-center py-8">
                      No user agent detected
                    </div>
                  )}
                </div>
              </TerminalWindow>
            </div>

            {/* Top Right - Network Geo */}
            <div className="basis-full md:basis-[calc(50%-0.25rem)] grow h-80 md:h-[calc(50%-0.25rem)] flex flex-col min-h-0">
              <TerminalWindow title="network-geo">
                <div className="space-y-2 h-full overflow-y-auto">
                  <div>
                    <span className="terminal-key">client_ip</span>
                    <div className="terminal-ip text-sm mt-1">{data.network.clientIP}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {data.headers.all['cf-connecting-ip'] && (
                        <span className="px-1 py-0.5 bg-orange-600 text-white rounded text-xs">☁️ Cloudflare</span>
                      )}
                      {!data.headers.all['cf-connecting-ip'] && data.headers.all['x-forwarded-for'] && (
                        <span className="px-1 py-0.5 bg-blue-600 text-white rounded text-xs">🔄 Proxy</span>
                      )}
                      {!data.headers.all['cf-connecting-ip'] && !data.headers.all['x-forwarded-for'] && data.headers.all['x-real-ip'] && (
                        <span className="px-1 py-0.5 bg-green-600 text-white rounded text-xs">🌐 Nginx</span>
                      )}
                      {!data.headers.all['cf-connecting-ip'] && !data.headers.all['x-forwarded-for'] && !data.headers.all['x-real-ip'] && (
                        <span className="px-1 py-0.5 bg-gray-600 text-white rounded text-xs">🔗 Direct</span>
                      )}
                    </div>
                  </div>

                  {/* IP Chain Visualization */}
                  {(data.headers.all['x-forwarded-for'] || data.headers.all['cf-connecting-ip'] || data.headers.all['x-real-ip']) && (
                    <div>
                      <span className="terminal-key">ip_chain</span>
                      <div className="text-xs mt-1 space-y-1">
                        {data.headers.all['x-forwarded-for'] && (
                          <div className="flex items-center text-muted-foreground">
                            <span className="w-20">x-fwd-for:</span>
                            <span className="font-mono">{data.headers.all['x-forwarded-for']}</span>
                          </div>
                        )}
                        {data.headers.all['cf-connecting-ip'] && (
                          <div className="flex items-center text-muted-foreground">
                            <span className="w-20">cf-ip:</span>
                            <span className="font-mono">{data.headers.all['cf-connecting-ip']}</span>
                          </div>
                        )}
                        {data.headers.all['x-real-ip'] && (
                          <div className="flex items-center text-muted-foreground">
                            <span className="w-20">x-real-ip:</span>
                            <span className="font-mono">{data.headers.all['x-real-ip']}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {data.network.geolocation && (
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="terminal-key">country</span>
                          <div className="terminal-string mt-1">
                            {data.network.geolocation.countryCode} {data.network.geolocation.country}
                          </div>
                        </div>
                        <div>
                          <span className="terminal-key">region</span>
                          <div className="terminal-value mt-1">
                            {data.network.geolocation.regionName || data.network.geolocation.region}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="terminal-key">city</span>
                          <div className="terminal-string mt-1">{data.network.geolocation.city}</div>
                        </div>
                        <div>
                          <span className="terminal-key">isp</span>
                          <div className="terminal-value mt-1">{data.network.geolocation.isp}</div>
                        </div>
                      </div>
                      {data.network.geolocation.timezone && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="terminal-key">timezone</span>
                            <div className="terminal-value mt-1">{data.network.geolocation.timezone}</div>
                          </div>
                          <div></div>
                        </div>
                      )}
                      {data.network.geolocation.lat && data.network.geolocation.lon && (
                        <div>
                          <span className="terminal-key">coordinates</span>
                          <div className="terminal-number mt-1">
                            <a
                              href={`https://maps.google.com/maps?q=${data.network.geolocation.lat},${data.network.geolocation.lon}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-blue-400 hover:underline transition-colors cursor-pointer underline"
                            >
                              {data.network.geolocation.lat.toFixed(4)}, {data.network.geolocation.lon.toFixed(4)}
                            </a>
                          </div>
                        </div>
                      )}
                      {data.network.geolocation.org && data.network.geolocation.org !== data.network.geolocation.isp && (
                        <div>
                          <span className="terminal-key">organization</span>
                          <div className="terminal-value mt-1">{data.network.geolocation.org}</div>
                        </div>
                      )}
                      {data.network.geolocation.asname && (
                        <div>
                          <span className="terminal-key">as_network</span>
                          <div className="terminal-value mt-1">{data.network.geolocation.asname}</div>
                        </div>
                      )}
                      {(data.network.geolocation.mobile || data.network.geolocation.proxy || data.network.geolocation.hosting) && (
                        <div className="flex gap-2 mt-2">
                          {data.network.geolocation.mobile && (
                            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">📱 MOBILE</span>
                          )}
                          {data.network.geolocation.proxy && (
                            <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">🔒 PROXY</span>
                          )}
                          {data.network.geolocation.hosting && (
                            <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded">🏢 HOSTING</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TerminalWindow>
            </div>

            {/* Bottom Left - HTTP Headers */}
            <div className="basis-full md:basis-[calc(50%-0.25rem)] grow h-80 md:h-[calc(50%-0.25rem)] flex flex-col min-h-0">
              <TerminalWindow title="http-headers">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between flex-shrink-0 mb-2">
                    <span className="terminal-key">total: <span className="terminal-number">{data.headers.ordered.length}</span></span>
                    <TerminalCopyButton text={JSON.stringify(data.headers.all, null, 2)} />
                  </div>
                  <div className="space-y-1 text-xs flex-1 overflow-y-auto">
                    {data.headers.ordered.map(([key, value], index) => (
                      <div key={index} className="flex text-xs">
                        <HeaderTooltip header={key}>
                          <span className="terminal-key w-48 flex-shrink-0 truncate cursor-help hover:text-blue-400 transition-colors">
                            {key}
                          </span>
                        </HeaderTooltip>
                        <span className="text-muted-foreground mx-2">:</span>
                        <span className="terminal-value flex-1 break-all">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TerminalWindow>
            </div>

            {/* Bottom Right - Security Headers */}
            <div className="basis-full md:basis-[calc(50%-0.25rem)] grow h-80 md:h-[calc(50%-0.25rem)] flex flex-col min-h-0">
              <TerminalWindow title="security-headers">
                <div className="space-y-1 text-xs h-full overflow-y-auto">
                  {hasSecHeaders ? (
                    Object.entries(data.headers.identity.secHeaders).map(([key, value]) => (
                      <div key={key} className="flex">
                        <span className="terminal-key w-32 flex-shrink-0 truncate">
                          {key}
                        </span>
                        <span className="text-muted-foreground mx-1">:</span>
                        <span className="terminal-value flex-1">{value}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-center py-8">
                      No security headers detected
                    </div>
                  )}
                </div>
              </TerminalWindow>
            </div>
          </div>
        )}

        {/* Bottom Section - Body only if present */}
        {viewMode === 'dashboard' && hasBody && (
          <div className="flex-1 p-2">
            <div className="w-full">
              <TerminalWindow title="request-body">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="terminal-key">content_type</span>
                      <div className="terminal-string text-sm mt-1">{data.body!.type || 'unknown'}</div>
                    </div>
                    <div>
                      <span className="terminal-key">size</span>
                      <div className="terminal-number text-sm mt-1">{formatBytes(data.body!.size)}</div>
                    </div>
                    <div className="flex justify-end">
                      <TerminalCopyButton text={JSON.stringify(data.body, null, 2)} />
                    </div>
                  </div>

                  {data.body!.parsed && (
                    <div>
                      <div className="terminal-key mb-2">parsed_data:</div>
                      <div className="max-h-32 overflow-y-auto">
                        <TerminalJson data={data.body!.parsed} />
                      </div>
                    </div>
                  )}

                  {data.body!.preview && (
                    <div>
                      <div className="terminal-key mb-2">raw_preview:</div>
                      <div className="terminal-json max-h-24 overflow-y-auto">
                        <span className="terminal-string text-sm">{data.body!.preview}</span>
                      </div>
                    </div>
                  )}
                </div>
              </TerminalWindow>
            </div>
          </div>
        )}

        {/* Conditional Views */}
        {viewMode === 'history' && (
          <div className="view-container flex-1 p-4 pt-0">
            <RequestHistory
              history={history}
              selectedRequests={selectedRequests}
              onSelectRequest={selectRequest}
              onRemoveFromSelection={removeFromSelection}
              onClearHistory={clearHistory}
            />
          </div>
        )}

        {viewMode === 'comparison' && comparisonResult && (
          <div className="view-container flex-1 p-4 pt-0 overflow-y-auto">
            <AppleComparisonView
              comparison={comparisonResult}
            />
          </div>
        )}
      </div>
    </div>
  )
}