import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ONBOARDED_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/supabase/middleware";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  const response = NextResponse.json({
    success: true,
    redirectTo: "/login",
  });

  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(ONBOARDED_COOKIE_NAME);

  return response;
}

