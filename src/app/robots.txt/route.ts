import { NextResponse } from 'next/server'

export async function GET() {
  return new NextResponse(`User-agent: *
Disallow: /admin
Disallow: /private
Allow: /

Sitemap: https://example.com/sitemap.xml`, {
    headers: {
      'Content-Type': 'text/plain'
    }
  })
}