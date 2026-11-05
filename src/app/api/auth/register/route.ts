import { NextRequest, NextResponse } from "next/server";
import { RegisterSchema } from "@/types/student-os";
import { dbStore } from "@/lib/db/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import {
  ONBOARDED_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/supabase/middleware";

export async function POST(request: NextRequest) {
  try {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous_client";

    const rateResult = checkRateLimit(`register_${clientIp}`, "auth");
    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many registration attempts. Please wait before trying again.",
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
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Invalid registration details",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { fullName, email, password } = parsed.data;

    // 1. If Supabase is configured, register via Supabase Auth
    const supabase = await createSupabaseServerClient();
    let supabaseUserId: string | undefined;

    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      supabaseUserId = data.user?.id;
    }

    // 2. Register in unified store & set HTTP-only session cookies
    const { account, error } = dbStore.registerUser({
      fullName,
      email,
      password,
    });

    if (error || !account) {
      return NextResponse.json(
        { error: error || "Unable to create student account" },
        { status: 409 }
      );
    }

    if (supabaseUserId) {
      account.id = supabaseUserId;
      account.profile.id = supabaseUserId;
    }

    const response = NextResponse.json(
      {
        user: {
          id: account.id,
          email: account.email,
          fullName: account.profile.fullName,
          onboardingCompleted: false,
        },
        redirectTo: "/onboarding",
      },
      { status: 201 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, account.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.set(ONBOARDED_COOKIE_NAME, "false", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to register student",
      },
      { status: 500 }
    );
  }
}

