import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/editor",
    "/editor/(.*)",
    "/((?!api|trpc).*)",
  ],
  ignoredRoutes: [
    "/((?!api|trpc))(_next.*|.+.[\\w]+$)",
    "/api/webhook",
  ],
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/(api|trpc)(.*)",
  ],
}; 