import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    // Forward the code to the client page so the browser can exchange it
    // and persist the session in localStorage. Server-side exchange here
    // would silently succeed but never reach the browser's storage.
    const sep = next.includes('?') ? '&' : '?'
    return NextResponse.redirect(`${origin}${next}${sep}code=${code}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
