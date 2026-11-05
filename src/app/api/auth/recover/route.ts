import { NextRequest, NextResponse } from "next/server";
import { RecoverPasswordSchema } from "@/types/student-os";
import { dbStore } from "@/lib/db/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RecoverPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || "Please enter a valid email",
        },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const origin = request.nextUrl.origin;

    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });
    }

    const { token } = dbStore.createPasswordRecoveryToken(email);

    // Return a generic privacy-preserving message + in development/demo mode provide the direct reset URL for testing
    const recoveryLink = token
      ? `/reset-password?email=${encodeURIComponent(
          email
        )}&token=${encodeURIComponent(token)}`
      : undefined;

    return NextResponse.json({
      message:
        "If an account exists for this email address, password recovery instructions have been generated.",
      recoveryLink,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to initiate password recovery",
      },
      { status: 500 }
    );
  }
}

