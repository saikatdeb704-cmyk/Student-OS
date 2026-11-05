import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "./client";

export const SESSION_COOKIE_NAME = "student_os_session";
export const ONBOARDED_COOKIE_NAME = "student_os_onboarded";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/offline",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (publicPath) =>
      pathname === publicPath || pathname.startsWith(`${publicPath}/`)
  );
}

export async function updateSessionAndEnforceRoutes(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, manifest, and API endpoints to handle their own auth JSON responses
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html"
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  let isAuthenticated = false;
  let isOnboarded = false;

  if (isSupabaseConfigured()) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options?: Record<string, unknown>;
            }[]
          ) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isAuthenticated = true;
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      isOnboarded = Boolean(
        profileRow?.onboarding_completed ||
          request.cookies.get(ONBOARDED_COOKIE_NAME)?.value === "true"
      );
    }
  }

  // Fallback / Local Auth session cookies (works seamlessly alongside or without live Supabase)
  if (!isAuthenticated) {
    const localSessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (localSessionCookie) {
      isAuthenticated = true;
      isOnboarded =
        request.cookies.get(ONBOARDED_COOKIE_NAME)?.value === "true";
    }
  }

  // 1. Unauthenticated users visiting protected pages -> redirect to /login
  if (!isAuthenticated && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated users who have NOT completed onboarding -> redirect to /onboarding
  if (isAuthenticated && !isOnboarded && pathname !== "/onboarding") {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    return NextResponse.redirect(onboardingUrl);
  }

  // 3. Authenticated & onboarded users visiting /login or /register -> redirect to /
  if (
    isAuthenticated &&
    isOnboarded &&
    (pathname === "/login" || pathname === "/register")
  ) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

