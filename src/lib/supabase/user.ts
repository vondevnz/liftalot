import { headers } from "next/headers";
import { EMAIL_HEADER, USER_HEADER } from "./middleware";

/**
 * The signed-in user's id, as validated by middleware on this same request.
 *
 * Reading a header costs nothing; calling supabase.auth.getUser() again would
 * be another network round trip to re-verify a token that was verified
 * milliseconds ago. Trustworthy because middleware deletes any client-supplied
 * value before setting its own, and every page route passes through it.
 */
export async function currentUserId(): Promise<string | null> {
  const h = await headers();
  return h.get(USER_HEADER);
}

/** The signed-in user's email, from the same validated request header. */
export async function currentUserEmail(): Promise<string | null> {
  const h = await headers();
  return h.get(EMAIL_HEADER);
}
