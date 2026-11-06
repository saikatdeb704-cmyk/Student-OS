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
    const normalizedEmail = email.trim().toLowerCase();
    const isDemoUser = normalizedEmail === "aarav.sharma@iitd.ac.in";

    let authenticatedUserId: string | null = null;
    let authenticatedEmail = normalizedEmail;
    let authenticatedFullName = "Student";
    let isOnboarded = false;

    const supabase = await createSupabaseServerClient();

    if (isDemoUser) {
      // 1. Prototype quick access demo student
      const { account, error } = dbStore.authenticateUser({ email, password });
      if (error || !account) {
        return NextResponse.json(
          { error: error || "Invalid email or password" },
          { status: 401 }
        );
      }
      authenticatedUserId = account.id;
      authenticatedEmail = account.email;
      authenticatedFullName = account.profile.fullName;
      isOnboarded = true;
    } else if (supabase) {
      // 2. Real user login via Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        return NextResponse.json(
          {
            error:
              "Invalid email or password. If you haven't created an account yet, please click 'Create your student account' below.",
          },
          { status: 401 }
        );
      }

      authenticatedUserId = data.user.id;
      authenticatedEmail = data.user.email || normalizedEmail;
      authenticatedFullName =
        data.user.user_metadata?.full_name || "Student";

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("onboarding_completed, full_name")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileRow?.full_name) {
        authenticatedFullName = profileRow.full_name;
      }
      isOnboarded = Boolean(profileRow?.onboarding_completed);

      // Ensure local serverless cache has this profile
      if (!dbStore.getUserById(data.user.id)) {
        dbStore.createProfile({
          id: data.user.id,
          email: authenticatedEmail,
          fullName: authenticatedFullName,
          onboardingCompleted: isOnboarded,
        });
      }
    } else {
      // 3. Local fallback mode without Supabase
      const { account, error } = dbStore.authenticateUser({ email, password });
      if (error || !account) {
        return NextResponse.json(
          { error: error || "Invalid email or password" },
          { status: 401 }
        );
      }
      authenticatedUserId = account.id;
      authenticatedEmail = account.email;
      authenticatedFullName = account.profile.fullName;
      isOnboarded = account.profile.onboardingCompleted;
    }

    const redirectTo = isOnboarded ? "/" : "/onboarding";

    const response = NextResponse.json({
      user: {
        id: authenticatedUserId,
        email: authenticatedEmail,
        fullName: authenticatedFullName,
        onboardingCompleted: isOnboarded,
      },
      redirectTo,
    });

    setSessionCookies(response, authenticatedUserId, isOnboarded);

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

