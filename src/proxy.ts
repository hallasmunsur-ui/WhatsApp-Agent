import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "session";

// Paths that must stay open without login: Meta's webhook (protected
// separately by HMAC signature), the login flow itself, and the PWA assets
// (manifest, service worker, icons) a browser fetches before/without auth
// when installing the app to a home screen.
const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/webhook",
  "/manifest.webmanifest",
  "/sw.js",
  "/icon",
  "/apple-icon",
  "/manifest-icon-192",
  "/manifest-icon-512",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const sessionToken = process.env.DASHBOARD_SESSION_TOKEN;
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;

  if (sessionToken && cookie === sessionToken) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
