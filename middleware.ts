import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  // Simple middleware without Supabase auth helpers to avoid initialization issues
  const protectedRoutes = ["/dashboard", "/upload", "/records", "/settings"]
  const isProtectedRoute = protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  const authRoutes = ["/auth/signin", "/auth/signup"]
  const isAuthRoute = authRoutes.includes(req.nextUrl.pathname)

  // For now, just let all requests through to avoid initialization issues
  // We'll handle auth in the components themselves
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/upload/:path*", "/records/:path*", "/settings/:path*", "/auth/:path*"],
}
