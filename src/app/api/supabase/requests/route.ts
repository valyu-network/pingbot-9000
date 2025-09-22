import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { broadcastUpdate } from '@/app/api/events/route'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data, error } = await supabase
      .from('request_history')
      .select('id, timestamp, method, url, path, client_ip, user_agent, request_data, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Failed to fetch requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, timestamp, method, url, path, client_ip, user_agent, request_data } = body

    const { data, error } = await supabase
      .from('request_history')
      .insert({
        id,
        timestamp,
        method,
        url,
        path,
        client_ip,
        user_agent,
        request_data
      })
      .select()

    if (error) {
      throw error
    }

    // Broadcast real-time update to all connected clients with full request data
    broadcastUpdate({
      type: 'new_request',
      request: {
        id,
        timestamp,
        data: request_data
      }
    })

    return NextResponse.json({ success: true, id, data })
  } catch (error) {
    console.error('Failed to save request:', error)
    return NextResponse.json(
      { error: 'Failed to save request' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const { error } = await supabase
      .from('request_history')
      .delete()
      .gte('created_at', '1970-01-01') // Delete all records

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to clear history:', error)
    return NextResponse.json(
      { error: 'Failed to clear history' },
      { status: 500 }
    )
  }
}