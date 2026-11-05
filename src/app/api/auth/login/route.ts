import { NextRequest, NextResponse } from "next/server";
import { LoginSchema } from "@/types/student-os";
import { dbStore } from "@/lib/db/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import {
  ONBOARDED_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/supabase/middleware";
import { setSessionCookies } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous_client";

    const rateResult = checkRateLimit(`login_${clientIp}`, "auth");
    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many login attempts. Please wait before trying again.",
          retryAfter: rateResult.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateResult.resetInSeconds),
            "X-RateLimit-Limit": String(rateResult.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || "Invalid login credentials",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // 1. If Supabase is configured, sign in via Supabase Auth
    const supabase = await createSupabaseServerClient();
    let supabaseOnboardingDone: boolean | undefined;

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      if (data.user) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", data.user.id)
          .maybeSingle();

        supabaseOnboardingDone = Boolean(profileRow?.onboarding_completed);
      }
    }

    // 2. Authenticate against store
    const { account, error } = dbStore.authenticateUser({ email, password });

    if (error || !account) {
      return NextResponse.json(
        { error: error || "Invalid email or password" },
        { status: 401 }
      );
    }

    const isOnboarded =
      supabaseOnboardingDone !== undefined
        ? supabaseOnboardingDone
        : account.profile.onboardingCompleted;

    const redirectTo = isOnboarded ? "/" : "/onboarding";

    const response = NextResponse.json({
      user: {
        id: account.id,
        email: account.email,
        fullName: account.profile.fullName,
        onboardingCompleted: isOnboarded,
      },
      redirectTo,
    });

    setSessionCookies(response, account.id, isOnboarded);

    return response;
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Authentication failed",
      },
      { status: 500 }
    );
  }
}

