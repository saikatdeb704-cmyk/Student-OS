import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbStore } from "@/lib/db/store";
import {
  sanitizeTextForSpeech,
  THIRD_PARTY_VOICE_DISCLOSURE_TEXT,
  validateVoiceProviderConsent,
} from "@/lib/voice/provider";
import { getAuthenticatedUserId } from "@/lib/auth/session";

const VoiceActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_settings"),
    voiceEnabled: z.boolean().optional(),
    provider: z
      .enum(["browser_native", "cloud_speech_provider", "text_fallback"])
      .optional(),
    disclosureAcknowledged: z.boolean().optional(),
    thirdPartyAudioConsent: z.boolean().optional(),
    speechRate: z.number().min(0.5).max(2.0).optional(),
  }),
  z.object({
    action: z.literal("transcribe"),
    provider: z.enum([
      "browser_native",
      "cloud_speech_provider",
      "text_fallback",
    ]),
    disclosureAcknowledged: z.boolean().default(false),
    thirdPartyAudioConsent: z.boolean().default(false),
    spokenTranscript: z.string().optional(),
    fallbackText: z.string().optional(),
  }),
  z.object({
    action: z.literal("prepare_tts"),
    markdownText: z.string().min(1),
  }),
]);

export async function GET(request: NextRequest) {
  const sessionUserId = await getAuthenticatedUserId(request);
  return NextResponse.json({
    settings: dbStore.getVoiceSettings(sessionUserId),
    disclosureText: THIRD_PARTY_VOICE_DISCLOSURE_TEXT,
  });
}

export async function POST(request: NextRequest) {
  try {
    const sessionUserId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const parsed = VoiceActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Invalid voice action payload",
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (payload.action === "update_settings") {
      if (
        payload.provider === "cloud_speech_provider" &&
        (!payload.disclosureAcknowledged || !payload.thirdPartyAudioConsent)
      ) {
        return NextResponse.json(
          {
            error:
              "Cannot enable third-party cloud speech provider without explicit disclosure acknowledgement and user permission.",
          },
          { status: 403 }
        );
      }

      const settings = dbStore.updateVoiceSettings(
        {
          voiceEnabled: payload.voiceEnabled,
          provider: payload.provider,
          disclosureAcknowledged: payload.disclosureAcknowledged,
          thirdPartyAudioConsent: payload.thirdPartyAudioConsent,
          speechRate: payload.speechRate,
        },
        sessionUserId
      );

      return NextResponse.json({ settings });
    }

    if (payload.action === "transcribe") {
      const consentCheck = validateVoiceProviderConsent({
        provider: payload.provider,
        disclosureAcknowledged: payload.disclosureAcknowledged,
        thirdPartyAudioConsent: payload.thirdPartyAudioConsent,
      });

      if (!consentCheck.allowed) {
        return NextResponse.json(
          {
            error: consentCheck.error,
            effectiveProvider: consentCheck.effectiveProvider,
          },
          { status: 403 }
        );
      }

      const cleanSpoken = (payload.spokenTranscript || "").trim();
      const cleanFallback = (payload.fallbackText || "").trim();
      const transcript = cleanSpoken || cleanFallback;

      return NextResponse.json({
        transcript,
        usedTextFallback: !cleanSpoken && Boolean(cleanFallback),
        provider: cleanSpoken ? payload.provider : "text_fallback",
      });
    }

    if (payload.action === "prepare_tts") {
      const cleanSpeechText = sanitizeTextForSpeech(payload.markdownText);
      return NextResponse.json({
        cleanSpeechText,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Voice API error occurred",
      },
      { status: 500 }
    );
  }
}

