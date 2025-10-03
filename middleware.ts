import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Define which routes are public
  const publicRoutes = [
    "/",
    "/sign-in",
    "/sign-up",
    "/api/auth",
  ];

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // If it's a public route, continue
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For protected routes, check for authentication
  const session = request.cookies.get("better-auth.session_token")?.value;

  if (!session) {
    // Redirect to sign-in page if not authenticated
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};