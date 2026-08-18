import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Browser client. Used by the interactive surfaces — walk toggle, set entry —
 * which write optimistically and cannot afford a Server Action round trip
 * between sets on gym wifi.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
