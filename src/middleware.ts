import { type NextRequest } from "next/server";
import { updateSessionAndEnforceRoutes } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSessionAndEnforceRoutes(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

