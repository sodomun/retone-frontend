import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.has("auth_session");

  if (!isAuthenticated && pathname.startsWith("/talk")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/talk", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/talk/:path*", "/login", "/signup"],
};
