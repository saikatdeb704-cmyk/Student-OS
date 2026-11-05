import { NextRequest, NextResponse } from "next/server";
import { OnboardingProfileSchema } from "@/types/student-os";
import { SupabaseDataService } from "@/lib/db/supabase-data-service";
import { getAuthenticatedUserId, setSessionCookies } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const sessionUserId = await getAuthenticatedUserId(request);
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

    const sessionUserId = await getAuthenticatedUserId(request);
    const profile = await SupabaseDataService.updateProfile(parsed.data, sessionUserId);

    const response = NextResponse.json({
      profile,
      redirectTo: "/",
    });

    setSessionCookies(response, sessionUserId, true);

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
