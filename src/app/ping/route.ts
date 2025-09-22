import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: "pong",
    message: "This endpoint simulates what crawlers would hit",
    headers_received: "Headers are captured by middleware",
    timestamp: new Date().toISOString()
  })
}