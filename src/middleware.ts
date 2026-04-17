import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set(name, value)
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options } as never)
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set(name, '')
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options } as never)
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // ── Admin portal routes ──────────────────────────
  const isPortal = path.startsWith('/portal')
  const isPortalLogin = path === '/portal/login'
  const isPortalCallback = path === '/portal/auth/callback'

  if (isPortal && !isPortalLogin && !isPortalCallback && !user) {
    return NextResponse.redirect(new URL('/portal/login', request.url))
  }
  if (isPortalLogin && user) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  // ── Contractor portal routes ─────────────────────
  const isContractor = path.startsWith('/contractor')
  const isContractorLogin = path === '/contractor/login'

  if (isContractor && !isContractorLogin && !user) {
    return NextResponse.redirect(new URL('/contractor/login', request.url))
  }
  if (isContractorLogin && user) {
    // Check if this user has a contractor record before redirecting
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (contractor) {
      return NextResponse.redirect(new URL('/contractor/jobs', request.url))
    }
    // No contractor record — let them see the login page (which will show an error)
  }

  return response
}

export const config = {
  matcher: ['/portal/:path*', '/contractor/:path*'],
}
