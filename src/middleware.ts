import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdmin = token?.isAdmin;
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
    const isAuthRoute = req.nextUrl.pathname.startsWith("/auth");

    // If user is authenticated and trying to access auth pages, redirect to home
    if (isAuthRoute && token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // If trying to access admin routes but not an admin
    if (isAdminRoute && !isAdmin) {
      // If user is authenticated but not admin, send to unauthorized page
      if (token) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      // If user is not authenticated at all, send to login
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
        const isAuthRoute = req.nextUrl.pathname.startsWith("/auth");

        // For auth routes, we want to allow access even without token
        // (the middleware will handle redirecting authenticated users)
        if (isAuthRoute) {
          return true;
        }

        // For admin routes, we need both authentication and admin status
        if (isAdminRoute) {
          return !!token && token.isAdmin === true;
        }

        // For all other routes (rankings, events, teams, etc.), allow public access
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/auth/:path*",
    // Removed the following routes from requiring authentication:
    // "/rankings/:path*",
    // "/events/:path*",
    // "/teams/:path*",
  ],
};
