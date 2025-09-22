"use client"

import { useState, useEffect, useCallback } from 'react'
import { RequestData } from '@/lib/request-parser'
import { GeoLocation } from '@/lib/geo-lookup'
import { RequestStorage, StoredRequest } from '@/lib/request-storage'
import { RequestComparator, ComparisonResult, MultiComparisonResult } from '@/lib/request-comparator'

type ExtendedRequestData = RequestData & {
  network: RequestData['network'] & {
    geolocation?: GeoLocation | null
  }
}

export function useRequestHistory() {
  const [history, setHistory] = useState<StoredRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequests, setSelectedRequests] = useState<string[]>([])
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | MultiComparisonResult | null>(null)
  const [keepLiveResponse, setKeepLiveResponse] = useState(true)
  const [autoShiftRequests, setAutoShiftRequests] = useState(false)
  const [isComparingActive, setIsComparingActive] = useState(false)

  // Load history on mount
  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const storedHistory = await RequestStorage.getHistory()
      setHistory(storedHistory)
    } catch (error) {
      console.error('Failed to load history:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const saveRequest = useCallback(async (requestData: ExtendedRequestData) => {
    const savedRequest = await RequestStorage.saveRequest(requestData)

    setHistory(prev => {
      const updated = [savedRequest, ...prev]

      // Handle live response update inside the setHistory callback where we have access to prev
      if (keepLiveResponse) {
        setSelectedRequests(current => {
          if (current.length >= 2) {
            setComparisonResult(null) // Clear comparison to trigger re-comparison

            // Find all currently selected requests from the updated history
            const allRequests = [savedRequest, ...prev]
            const currentSelected = current
              .map(id => allRequests.find(req => req.id === id))
              .filter(Boolean) as StoredRequest[]

            // Sort by timestamp (newest first)
            const sortedByTime = currentSelected.sort((a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )

            // Keep the 4 oldest selections, replace the newest with the new request
            const keep4Oldest = sortedByTime.slice(1, 5).map(req => req.id)

            return [savedRequest.id, ...keep4Oldest]
          }
          return current
        })
      }

      return updated
    })

    return savedRequest
  }, [keepLiveResponse])

  const clearHistory = useCallback(async () => {
    await RequestStorage.clearHistory()
    setHistory([])
    setSelectedRequests([])
    setComparisonResult(null)
  }, [])

  const selectRequest = useCallback((id: string) => {
    setSelectedRequests(prev => {
      if (prev.includes(id)) {
        // Deselect if already selected
        return prev.filter(reqId => reqId !== id)
      } else if (prev.length < 5) {
        // Add to selection if under 5 requests
        return [...prev, id]
      } else {
        // Replace the oldest selection if at 5 requests
        return [...prev.slice(1), id]
      }
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedRequests([])
    setComparisonResult(null)
  }, [])

  const removeFromSelection = useCallback((id: string) => {
    setSelectedRequests(prev => {
      const updated = prev.filter(reqId => reqId !== id)
      // Clear comparison if we have less than 2 requests
      if (updated.length < 2) {
        setComparisonResult(null)
      }
      return updated
    })
  }, [])

  const toggleKeepLiveResponse = useCallback(() => {
    setKeepLiveResponse(prev => !prev)
  }, [])

  const toggleAutoShift = useCallback(() => {
    setAutoShiftRequests(prev => !prev)
  }, [])

  const setComparingActive = useCallback((active: boolean) => {
    setIsComparingActive(active)
  }, [])

  // Compare multiple requests with most recent as baseline
  const compareSelected = useCallback(() => {
    if (selectedRequests.length < 2) return null

    // Find the most recent request (by timestamp) among selected
    const selectedRequestsData = selectedRequests
      .map(id => history.find(req => req.id === id))
      .filter(Boolean) as StoredRequest[]

    // Sort by timestamp (newest first) to get the most recent as baseline
    const sortedByTime = selectedRequestsData.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    const baselineRequest = sortedByTime[0] // Most recent becomes baseline
    const otherRequests = sortedByTime.slice(1, 5) // Next 4 become comparisons

    // Compare all other requests against the most recent baseline
    const comparisons = otherRequests.map(request => {
      return {
        requestId: request.id,
        request,
        comparison: RequestComparator.compareStoredRequests(baselineRequest, request)
      }
    })

    // Create comprehensive result with baseline and all comparisons
    const result = {
      baseline: baselineRequest,
      comparisons
    }

    // Store the multi-comparison result
    setComparisonResult(result as any)
    return result
  }, [selectedRequests, history])

  // Handle real-time live comparison updates
  const handleRealtimeUpdate = useCallback((newRequest: StoredRequest) => {
    // First, add the new request to history immediately (optimistic update)
    setHistory(prev => {
      const updated = [newRequest, ...prev]

      // Only handle selection updates if we're actively viewing comparison
      if (isComparingActive && selectedRequests.length >= 2) {
        setComparisonResult(null) // Clear comparison to trigger re-comparison

        if (autoShiftRequests) {
          // Auto-shift mode: Move all requests down, add new one at front, maintain 5-request window
          setSelectedRequests(current => {
            const newSelection = [newRequest.id, ...current]
            return newSelection.slice(0, 5) // Keep max 5 requests
          })
        } else if (keepLiveResponse) {
          // Live mode: Only update baseline (most recent), keep others static
          setSelectedRequests(current => {
            // Use the updated history array for lookup
            const allRequests = updated
            const currentSelected = current
              .map(id => allRequests.find(req => req.id === id))
              .filter(Boolean) as StoredRequest[]

            // Sort by timestamp (newest first)
            const sortedByTime = currentSelected.sort((a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )

            // Keep the 4 oldest selections, replace the newest with the new request
            const keep4Oldest = sortedByTime.slice(1, 5).map(req => req.id)
            return [newRequest.id, ...keep4Oldest]
          })
        }
        // else: static mode - don't change selections automatically
      }

      return updated
    })
  }, [keepLiveResponse, autoShiftRequests, selectedRequests.length, isComparingActive])

  // Auto-trigger comparison when selections change
  useEffect(() => {
    if (selectedRequests.length >= 2 && history.length > 0) {
      console.log('Auto-triggering comparison due to selection/history change')
      compareSelected()
    }
  }, [selectedRequests, history, compareSelected])

  const getUniqueIPs = useCallback(async () => {
    return await RequestStorage.getUniqueIPs()
  }, [])

  const getRequestsByIP = useCallback(async (ip: string) => {
    return await RequestStorage.getRequestsByIP(ip)
  }, [])

  const exportHistory = useCallback(async () => {
    return await RequestStorage.exportHistory()
  }, [])

  const importHistory = useCallback(async (jsonData: string) => {
    const success = await RequestStorage.importHistory(jsonData)
    if (success) {
      await loadHistory()
    }
    return success
  }, [loadHistory])

  const getStats = useCallback(() => {
    const uniqueIPs = new Set(history.map(req => req.data.network.clientIP))
    const uniqueCountries = new Set(
      history
        .map(req => req.data.network.geolocation?.country)
        .filter(Boolean)
    )
    const uniqueUserAgents = new Set(
      history
        .map(req => req.data.headers.identity.userAgent)
        .filter(Boolean)
    )

    const methods = history.reduce((acc, req) => {
      acc[req.data.method] = (acc[req.data.method] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalRequests: history.length,
      uniqueIPs: uniqueIPs.size,
      uniqueCountries: uniqueCountries.size,
      uniqueUserAgents: uniqueUserAgents.size,
      methods,
      timeSpan: history.length > 1 ? {
        oldest: history[history.length - 1]?.timestamp,
        newest: history[0]?.timestamp
      } : null
    }
  }, [history])

  return {
    // State
    history,
    isLoading,
    selectedRequests,
    comparisonResult,
    keepLiveResponse,
    autoShiftRequests,

    // Actions
    saveRequest,
    loadHistory,
    clearHistory,
    selectRequest,
    clearSelection,
    removeFromSelection,
    compareSelected,
    toggleKeepLiveResponse,
    toggleAutoShift,
    handleRealtimeUpdate,
    setComparingActive,

    // Utilities
    getUniqueIPs,
    getRequestsByIP,
    exportHistory,
    importHistory,
    getStats,

    // Computed
    canCompare: selectedRequests.length >= 2,
    hasHistory: history.length > 0,
    maxSelections: selectedRequests.length >= 5,
    selectedRequestsData: selectedRequests.map(id => history.find(req => req.id === id)).filter(Boolean) as StoredRequest[]
  }
}