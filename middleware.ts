import { authMiddleware } from "@clerk/nextjs"
import { NextResponse } from "next/server"

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: ["/", "/shared(.*)", "/sign-in(.*)", "/sign-up(.*)", "/editor(.*)"],
  
  // Optional: Handle auth for shared routes
  async afterAuth(auth, req) {
    // Allow public routes
    if (req.url.includes('/shared/') || 
        req.url.includes('/sign-in') || 
        req.url.includes('/sign-up') ||
        req.url.includes('/editor')) {
      return NextResponse.next()
    }

    // If not signed in and trying to access protected route
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