/**
 * Optimistic auth gate: redirects based on the better-auth session cookie's
 * presence. Real enforcement lives in `requireSession`/`requireRole`, which every
 * page and server action calls (ADR 0011) — the middleware only shapes navigation
 * so unauthenticated users land on /dang-nhap instead of a flash of empty UI.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_ROUTES = ["/dang-nhap", "/dat-lai-mat-khau", "/test", "/api/auth"];

const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dang-nhap";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (sessionCookie && pathname === "/dang-nhap") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match every request EXCEPT:
     *   - _next/static (static assets)
     *   - _next/image (image optimisation)
     *   - favicon.ico, robots.txt, brand assets
     *   - /api/* (route handlers enforce their own auth: CRON_SECRET, tokens)
     *   - any file with a dot (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|brand/|api/|.*\\..*).*)",
  ],
};
