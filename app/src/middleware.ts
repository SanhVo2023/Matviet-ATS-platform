/**
 * Refreshes Supabase session cookies on every navigation so RSCs always
 * see fresh auth state. Also enforces redirect rules:
 *   - Unauthenticated user hitting a protected route → /dang-nhap
 *   - Authenticated user hitting /dang-nhap → /
 *
 * Middleware runs on the Edge runtime; keep dependencies minimal.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_ROUTES = ["/dang-nhap", "/dat-lai-mat-khau", "/auth/callback"];

const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touching auth.getUser() refreshes the access token + cookies as needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dang-nhap";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/dang-nhap") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match every request EXCEPT:
     *   - _next/static (static assets)
     *   - _next/image (image optimisation)
     *   - favicon.ico, robots.txt, brand assets
     *   - any file with a dot (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|brand/|.*\\..*).*)",
  ],
};
