import { authMiddleware } from "@clerk/nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from 'next/server'

export default authMiddleware({
  publicRoutes: ["/", "/shared(.*)", "/sign-in(.*)", "/sign-up(.*)", "/editor(.*)", "/api/supabase(.*)"],
  
  async afterAuth(auth, req) {
    if (req.url.includes('/shared/') || 
        req.url.includes('/sign-in') || 
        req.url.includes('/sign-up') ||
        req.url.includes('/editor') ||
        req.url.includes('/api/supabase')) {
      return NextResponse.next()
    }

    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }

    return NextResponse.next()
  }
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
} 