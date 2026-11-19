import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/** Supabase client for Server Components, route handlers and server actions. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component: cookies are read-only there. Session
            // refresh happens in the proxy (added in Stage 1).
          }
        },
      },
    },
  );
}
