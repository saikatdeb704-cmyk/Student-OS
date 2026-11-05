import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "./client";

/**
 * Server-side Supabase client scoped to the current user's SSR session cookies.
 * Respects Row Level Security (RLS) policies via `auth.uid()`.
 */
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored when invoked from a read-only Server Component render
          }
        },
      },
    }
  );
}

/**
 * Strictly server-only privileged Supabase client for background worker or
 * administrative audit logging. Throws immediately if ever invoked in a browser context.
 */
export function createSupabaseServiceRoleClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY VIOLATION: Service-role client must never be invoked in browser code."
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
