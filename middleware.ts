import { authMiddleware } from "@clerk/nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from 'next/server'

export default authMiddleware({
  publicRoutes: [
    "/",
    "/shared(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/editor(.*)",
  ],
  
  async afterAuth(auth, req) {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      })
    }

    if (req.url.includes('/shared/') || 
        req.url.includes('/sign-in') || 
        req.url.includes('/sign-up') ||
        req.url.includes('/editor')) {
      return NextResponse.next()
    }

    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }

    const response = NextResponse.next()
    
    // Add CORS headers to all responses
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    
    return response
  }
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
} 