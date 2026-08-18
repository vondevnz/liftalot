import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files — running the auth
     * refresh on those is pure latency.
     *
     * manifest.webmanifest is named explicitly: it has no image extension, so
     * without this the auth guard redirects it to /login and the browser gets
     * an HTML page where it expected JSON — no icons on an installed shortcut.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
