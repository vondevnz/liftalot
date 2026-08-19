import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./env";

// /reset-password is public so the page can load and read the recovery session
// itself. Guarding it would redirect to /login before the client had a chance
// to process a link that arrives as a hash fragment rather than a query param.
// Nothing is exposed by letting it render: updateUser fails without a session.
const PUBLIC_PATHS = ["/login", "/auth", "/reset-password"];

/**
 * Carries the validated user id from middleware to the server components below.
 *
 * getUser() is a network call to Supabase on every invocation. Middleware has
 * to make it — it is the only place that can verify the cookie rather than
 * trust it — but the layout and pages then repeated it, so a single navigation
 * cost three sequential auth round trips before touching any data. Passing the
 * id down a request header makes it one.
 */
export const USER_HEADER = "x-liftalot-user";
export const EMAIL_HEADER = "x-liftalot-email";

export async function updateSession(request: NextRequest) {
  // Strip any inbound value first: a client could otherwise send this header
  // itself and impersonate another user. Only middleware may set it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(USER_HEADER);
  requestHeaders.delete(EMAIL_HEADER);

  // Collected rather than applied immediately, so the response can be built
  // once at the end with both the refreshed cookies and the added header.
  const refreshed: { name: string; value: string; options: object }[] = [];

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        refreshed.push(...cookiesToSet);
      },
    },
  });

  // Must be getUser, not getSession: it revalidates the token with Supabase
  // rather than trusting a cookie the client could have forged.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  function withCookies(response: NextResponse) {
    for (const { name, value, options } of refreshed) {
      response.cookies.set(name, value, options);
    }
    return response;
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withCookies(NextResponse.redirect(url));
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return withCookies(NextResponse.redirect(url));
  }

  if (user) {
    requestHeaders.set(USER_HEADER, user.id);
    if (user.email) requestHeaders.set(EMAIL_HEADER, user.email);
  }

  return withCookies(NextResponse.next({ request: { headers: requestHeaders } }));
}
