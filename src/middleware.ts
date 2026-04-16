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

  const isPortal = request.nextUrl.pathname.startsWith('/portal')
  const isLogin = request.nextUrl.pathname === '/portal/login'
  const isCallback = request.nextUrl.pathname === '/portal/auth/callback'

  // Not logged in → redirect to login (except login page and callback)
  if (isPortal && !isLogin && !isCallback && !user) {
    return NextResponse.redirect(new URL('/portal/login', request.url))
  }

  // Already logged in → redirect away from login page
  if (isLogin && user) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  return response
}

export const config = {
  matcher: ['/portal/:path*'],
}
