import { NextRequest, NextResponse } from "next/server";
import { ResetPasswordSchema } from "@/types/student-os";
import { dbStore } from "@/lib/db/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ResetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Invalid password reset input",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, token, password } = parsed.data;

    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const result = dbStore.resetPasswordWithToken({
      email,
      token,
      newPassword: password,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Unable to reset password" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Your password has been updated. You can now sign in.",
      redirectTo: "/login",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Password reset failed",
      },
      { status: 500 }
    );
  }
}

