"use client"

import { useEffect, useState, useRef } from 'react'
import { RequestInspector } from './request-inspector'
import { useRequestHistory } from '@/hooks/use-request-history'
import { StoredRequest } from '@/lib/request-storage'

export function RequestDashboard() {
  const [latestRequest, setLatestRequest] = useState<StoredRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPolling, setIsPolling] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const {
    history,
    loadHistory,
    handleRealtimeUpdate,
    autoShiftRequests,
    toggleAutoShift,
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
  } = useRequestHistory()

  // Use ref to prevent SSE reconnections when handleRealtimeUpdate dependencies change
  const handleRealtimeUpdateRef = useRef(handleRealtimeUpdate)

  // Keep the ref up to date
  useEffect(() => {
    handleRealtimeUpdateRef.current = handleRealtimeUpdate
  }, [handleRealtimeUpdate])

  // Load requests and set the latest one
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await loadHistory()
      setIsLoading(false)
    }
    loadData()
  }, [loadHistory])

  // Update latest request when history changes
  useEffect(() => {
    if (history.length > 0) {
      const newLatest = history[0]
      // Check if this is actually a new request
      if (!latestRequest || newLatest.id !== latestRequest.id) {
        setLatestRequest(newLatest)
        setLastUpdate(new Date())
      }
    }
  }, [history, latestRequest])

  // Real-time updates via Server-Sent Events
  useEffect(() => {
    const eventSource = new EventSource('/api/events')

    eventSource.onopen = () => {
      console.log('Real-time connection established')
      setIsConnected(true)
      setIsPolling(false)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'new_request') {
          console.log('New request detected:', data.request.id)
          setIsPolling(true)
          setLastUpdate(new Date())
          // Handle real-time update with full request data using ref to prevent SSE reconnections
          handleRealtimeUpdateRef.current(data.request)
          setIsPolling(false)
        } else if (data.type === 'connected') {
          console.log('Connected to real-time updates')
          setIsConnected(true)
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      setIsConnected(false)
      setIsPolling(false)
    }

    return () => {
      eventSource.close()
    }
  }, [])

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsPolling(true)
    try {
      await loadHistory()
      setLastUpdate(new Date())
    } finally {
      setIsPolling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🔍  ping-bot-9000</div>
          <div className="text-muted-foreground">Loading captured requests...</div>
        </div>
      </div>
    )
  }

  if (!latestRequest) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">🕳️</div>
          <div className="text-xl font-bold">No Requests Captured Yet</div>
          <div className="text-muted-foreground max-w-md">
            This dashboard shows requests captured by the server middleware.
            <br />
            Make some requests to your deployed server to see them appear here.
          </div>
          <div className="text-sm text-muted-foreground mt-4">
            💡 Try visiting different pages, sending API calls, or having others visit your site
          </div>
        </div>
      </div>
    )
  }

  // Show the latest captured request with live indicators
  return (
    <div className="relative">
      {/* Live Update Indicator */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
          {isPolling ? (
            <>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-yellow-400">Updating...</span>
            </>
          ) : isConnected ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400">Real-time</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-400">Disconnected</span>
            </>
          )}
          {lastUpdate && (
            <span className="text-gray-400 ml-2">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isPolling}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm transition-colors"
        >
          {isPolling ? '⟳' : '↻'} Refresh
        </button>
      </div>

      <RequestInspector
        data={latestRequest.data}
        autoShiftRequests={autoShiftRequests}
        toggleAutoShift={toggleAutoShift}
        history={history}
        selectedRequests={selectedRequests}
        comparisonResult={comparisonResult}
        keepLiveResponse={keepLiveResponse}
        selectRequest={selectRequest}
        removeFromSelection={removeFromSelection}
        clearSelection={clearSelection}
        compareSelected={compareSelected}
        clearHistory={clearHistory}
        toggleKeepLiveResponse={toggleKeepLiveResponse}
        canCompare={canCompare}
        hasHistory={hasHistory}
        setComparingActive={setComparingActive}
      />
    </div>
  )
}