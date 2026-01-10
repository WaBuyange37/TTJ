import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Redirect to login if not authenticated
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Role-based access control
    const role = token.role as string

    // Founder routes
    if (path.startsWith('/founder') && role !== 'FOUNDER') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Country Director routes
    if (path.startsWith('/director') && role !== 'COUNTRY_DIRECTOR') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Social Worker routes
    if (path.startsWith('/worker') && role !== 'SOCIAL_WORKER') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/founder/:path*',
    '/director/:path*',
    '/worker/:path*',
    '/api/income/:path*',
    '/api/expense/:path*',
    '/api/emergency/:path*',
    '/api/chat/:path*',
    '/api/post/:path*',
  ],
}
