import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const authEnabled = process.env.AUTH_ENABLED === "true";
  const publicPaths = ["/api/auth", "/login", "/signup"];
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  // Depending on the runtime, nextUrl.pathname may still include the base path; strip it so public paths match.
  const pathname = basePath && req.nextUrl.pathname.startsWith(`${basePath}/`) ? req.nextUrl.pathname.slice(basePath.length) : req.nextUrl.pathname;
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const sessionCookie = process.env.NEXTAUTH_URL?.startsWith("https://") ? "__Secure-next-auth.session-token" : "next-auth.session-token";

  if (authEnabled && !isPublicPath) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: sessionCookie
    });

    if (!token || token.error === "RefreshAccessTokenError") {
      return NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth/signin`, req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
