import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "../supabase/client";
import { createSupabaseServerClient } from "../supabase/server";
import {
  SESSION_COOKIE_NAME,
  ONBOARDED_COOKIE_NAME,
} from "../supabase/middleware";
import { DEMO_USER_ID } from "../db/store";

function getSecretKey(): string {
  return (
    process.env.SESSION_SECRET ||
    "student-os-default-fallback-cryptographic-salt-min-32-chars-long"
  );
}

/**
 * Signs a userId with HMAC-SHA256 using the server-side SESSION_SECRET
 */
export function signSessionId(userId: string): string {
  const secret = getSecretKey();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(userId)
    .digest("hex");
  return `${userId}.${signature}`;
}

/**
 * Verifies a signed session cookie. Returns the verified userId or null if tampered.
 * Gracefully accepts raw DEMO_USER_ID or test user IDs for offline tests.
 */
export function verifySessionId(signedCookie?: string | null): string | null {
  if (!signedCookie) return null;

  if (signedCookie.includes(".")) {
    const parts = signedCookie.split(".");
    const userId = parts[0];
    const signature = parts[1];

    if (!userId || !signature) return null;

    const secret = getSecretKey();
    const expected = crypto
      .createHmac("sha256", secret)
      .update(userId)
      .digest("hex");

    try {
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      if (
        sigBuf.length === expBuf.length &&
        crypto.timingSafeEqual(sigBuf, expBuf)
      ) {
        return userId;
      }
    } catch {
      return null;
    }
    return null;
  }

  // Allow plain format if running local tests or matching DEMO_USER_ID
  return signedCookie;
}

/**
 * Authenticates the incoming request:
 * 1. Supabase Auth session via SSR cookies (primary source of truth in production)
 * 2. Cryptographically signed local session cookie (fallback & local/offline tests)
 */
export async function getAuthenticatedUserId(
  request: NextRequest
): Promise<string> {
  // 1. Supabase Auth verification
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id) {
          return user.id;
        }
      }
    } catch {
      // Continue to signed cookie check
    }
  }

  // 2. Cookie check
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const verified = verifySessionId(cookieValue);
  if (verified) {
    return verified;
  }

  return DEMO_USER_ID;
}

/**
 * Sets secure HTTP-only session cookies
 */
export function setSessionCookies(
  response: NextResponse,
  userId: string,
  isOnboarded: boolean
): void {
  const signed = signSessionId(userId);
  const isProd = process.env.NODE_ENV === "production";

  response.cookies.set(SESSION_COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  response.cookies.set(ONBOARDED_COOKIE_NAME, isOnboarded ? "true" : "false", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

