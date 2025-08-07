import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdmin = token?.isAdmin;
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

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

        // For admin routes, we need both authentication and admin status
        if (isAdminRoute) {
          return !!token && token.isAdmin === true;
        }

        // For other routes, just need authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/draft/:path*",
    "/vote/:path*",
    "/rankings/:path*",
    "/events/:path*",
  ],
};
