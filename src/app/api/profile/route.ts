import { NextRequest, NextResponse } from "next/server";
import { OnboardingProfileSchema } from "@/types/student-os";
import { dbStore } from "@/lib/db/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ONBOARDED_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/supabase/middleware";

import { SupabaseDataService } from "@/lib/db/supabase-data-service";

export async function GET(request: NextRequest) {
  const sessionUserId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const profile = await SupabaseDataService.getProfile(sessionUserId);
  return NextResponse.json({ profile });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = OnboardingProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Please complete all required onboarding fields",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const sessionUserId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const profile = await SupabaseDataService.updateProfile(parsed.data, sessionUserId);

    const response = NextResponse.json({
      profile,
      redirectTo: "/",
    });

    response.cookies.set(ONBOARDED_COOKIE_NAME, "true", {
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
          err instanceof Error ? err.message : "Failed to save student profile",
      },
      { status: 500 }
    );
  }
}
