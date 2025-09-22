import { NextRequest } from 'next/server'

// Disable static generation for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = false

// Store active connections
const connections = new Set<ReadableStreamDefaultController>()

export async function GET(request: NextRequest) {
  // Return early during build/prerender
  if (process.env.NODE_ENV === 'production' && !request.headers.get('accept')?.includes('text/event-stream')) {
    return new Response('SSE endpoint', { status: 200 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to our set
      connections.add(controller)

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`))

      // Clean up when connection closes
      request.signal.addEventListener('abort', () => {
        connections.delete(controller)
        try {
          controller.close()
        } catch (e) {
          // Connection already closed
        }
      })
    },
    cancel(controller) {
      connections.delete(controller)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

// Function to broadcast to all connected clients
export function broadcastUpdate(data: any) {
  const encoder = new TextEncoder()
  const message = `data: ${JSON.stringify(data)}\n\n`
  const encodedMessage = encoder.encode(message)

  connections.forEach(controller => {
    try {
      controller.enqueue(encodedMessage)
    } catch (e) {
      // Remove dead connections
      connections.delete(controller)
    }
  })
}