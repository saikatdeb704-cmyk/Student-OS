export type VoiceProviderId =
  | "browser_native"
  | "cloud_speech_provider"
  | "text_fallback";

export type MicrophonePermissionState =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

export interface VoiceCapabilityReport {
  browserName: string;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  microphoneApiSupported: boolean;
  sttSupported: boolean;
  ttsSupported: boolean;
  continuousSttSupported: boolean;
  recommendedMode: "full_voice" | "tts_only" | "text_fallback";
  compatibilityNotes: string[];
}

export interface VoiceConsentConfig {
  provider: VoiceProviderId;
  disclosureAcknowledged: boolean;
  thirdPartyAudioConsent: boolean;
}

export interface VoiceTranscriptResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  provider: VoiceProviderId;
  usedTextFallback: boolean;
}

export interface VoicePlaybackStatus {
  isPlaying: boolean;
  wasInterrupted: boolean;
  activeText: string;
  provider: VoiceProviderId;
}

export const THIRD_PARTY_VOICE_DISCLOSURE_TEXT =
  "Browser Native Voice processes speech locally via your device's built-in speech engine. Switching to an external Cloud Speech Provider transmits microphone audio to a third-party speech API and requires your explicit disclosure acknowledgement and permission.";

/**
 * Validates whether audio can be processed by the selected provider.
 * Strictly blocks sending audio to third-party providers without explicit
 * disclosure acknowledgement and user permission.
 */
export function validateVoiceProviderConsent(
  config: VoiceConsentConfig
): {
  allowed: boolean;
  effectiveProvider: VoiceProviderId;
  error?: string;
} {
  if (config.provider === "cloud_speech_provider") {
    if (!config.disclosureAcknowledged || !config.thirdPartyAudioConsent) {
      return {
        allowed: false,
        effectiveProvider: "text_fallback",
        error:
          "Third-party audio transmission blocked: explicit disclosure acknowledgement and user permission are required before sending audio to external speech services.",
      };
    }
    return {
      allowed: true,
      effectiveProvider: "cloud_speech_provider",
    };
  }

  return {
    allowed: true,
    effectiveProvider: config.provider,
  };
}

/**
 * Inspects a browser/runtime environment (or a mocked environment in tests)
 * without assuming every browser supports the same voice APIs.
 * Performs mobile compatibility checks for iOS Safari, Android Chrome, and Firefox.
 */
export function detectVoiceCapabilities(customEnv?: {
  userAgent?: string;
  hasMediaDevices?: boolean;
  hasSpeechRecognition?: boolean;
  hasWebkitSpeechRecognition?: boolean;
  hasSpeechSynthesis?: boolean;
}): VoiceCapabilityReport {
  const isBrowser = typeof window !== "undefined";

  const ua =
    customEnv?.userAgent ??
    (isBrowser && typeof navigator !== "undefined" ? navigator.userAgent : "");

  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobile =
    isIOS || isAndroid || /Mobile|Tablet|Touch/i.test(ua);

  let browserName = "Server / Headless";
  if (/Edg\//i.test(ua)) browserName = "Microsoft Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua))
    browserName = isAndroid ? "Chrome Mobile (Android)" : "Google Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua))
    browserName = isIOS ? "Mobile Safari (iOS)" : "Apple Safari";
  else if (/Firefox\//i.test(ua))
    browserName = isMobile ? "Firefox Mobile" : "Mozilla Firefox";
  else if (ua) browserName = "Standard Web Browser";

  const hasMediaDevices =
    customEnv?.hasMediaDevices ??
    Boolean(
      isBrowser &&
        typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function"
    );

  const hasSpeechRecognition =
    customEnv?.hasSpeechRecognition ??
    Boolean(
      isBrowser &&
        "SpeechRecognition" in (window as unknown as Record<string, unknown>)
    );

  const hasWebkitSpeechRecognition =
    customEnv?.hasWebkitSpeechRecognition ??
    Boolean(
      isBrowser &&
        "webkitSpeechRecognition" in
          (window as unknown as Record<string, unknown>)
    );

  const sttSupported = hasSpeechRecognition || hasWebkitSpeechRecognition;

  const ttsSupported =
    customEnv?.hasSpeechSynthesis ??
    Boolean(
      isBrowser &&
        "speechSynthesis" in window &&
        typeof window.speechSynthesis !== "undefined"
    );

  // Mobile browsers (especially iOS Safari & Android WebViews) often terminate
  // continuous SpeechRecognition early and require single-utterance mode + user gesture for TTS.
  const continuousSttSupported = sttSupported && !isMobile;

  const compatibilityNotes: string[] = [];
  if (!sttSupported) {
    compatibilityNotes.push(
      `${browserName} does not expose Web Speech Recognition (SpeechRecognition/webkitSpeechRecognition). Automatic Text Fallback is active.`
    );
  }
  if (!hasMediaDevices) {
    compatibilityNotes.push(
      "Microphone capture API (navigator.mediaDevices.getUserMedia) is unavailable in this context. Text input fallback is enabled."
    );
  }
  if (isMobile) {
    compatibilityNotes.push(
      "Mobile compatibility mode enabled: single-utterance recognition and tap-initiated audio playback are enforced to prevent mobile browser cutoffs."
    );
  }
  if (ttsSupported && sttSupported && hasMediaDevices && !isMobile) {
    compatibilityNotes.push(
      `${browserName} supports full native Speech-to-Text (STT) and Text-to-Speech (TTS).`
    );
  }

  const recommendedMode: VoiceCapabilityReport["recommendedMode"] =
    sttSupported && hasMediaDevices && ttsSupported
      ? "full_voice"
      : ttsSupported
      ? "tts_only"
      : "text_fallback";

  return {
    browserName,
    isMobile,
    isIOS,
    isAndroid,
    microphoneApiSupported: hasMediaDevices,
    sttSupported,
    ttsSupported,
    continuousSttSupported,
    recommendedMode,
    compatibilityNotes,
  };
}

/**
 * Requests or verifies microphone permission safely, releasing the audio stream
 * tracks immediately after verification so the microphone is not held open.
 */
export async function requestMicrophonePermission(customMediaDevices?: {
  getUserMedia?: (constraints: { audio: boolean }) => Promise<{
    getTracks: () => Array<{ stop: () => void }>;
  }>;
}): Promise<{
  state: MicrophonePermissionState;
  message: string;
}> {
  const mediaDevices =
    customMediaDevices ??
    (typeof navigator !== "undefined" ? navigator.mediaDevices : undefined);

  if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function") {
    return {
      state: "unsupported",
      message:
        "Microphone API is not supported in this browser or non-HTTPS context. Text fallback is active.",
    };
  }

  try {
    const stream = await mediaDevices.getUserMedia({ audio: true });
    if (stream && typeof stream.getTracks === "function") {
      stream.getTracks().forEach((track) => track.stop());
    }
    return {
      state: "granted",
      message: "Microphone permission granted.",
    };
  } catch (err) {
    const errName =
      err && typeof err === "object" && "name" in err
        ? String((err as { name: unknown }).name)
        : "";
    if (
      errName === "NotAllowedError" ||
      errName === "PermissionDeniedError" ||
      /denied|not allowed/i.test(String(err))
    ) {
      return {
        state: "denied",
        message:
          "Microphone access was denied by the user or browser settings. Switched to Text Fallback.",
      };
    }
    return {
      state: "denied",
      message:
        err instanceof Error
          ? err.message
          : "Unable to access microphone. Switched to Text Fallback.",
    };
  }
}

/**
 * Strips Markdown formatting before Text-to-Speech synthesis so the voice
 * engine reads clean natural sentences instead of punctuation symbols.
 */
export function sanitizeTextForSpeech(markdownText: string): string {
  return markdownText
    .replace(/```[\s\S]*?```/g, " Code block omitted for voice playback. ")
    .replace(/[#*_`~>|[\]()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Stateful Voice & Text Session Controller that manages:
 * - Microphone permission state
 * - Third-party disclosure & consent
 * - Speech-to-Text (STT) transcription + Text Fallback
 * - Text-to-Speech (TTS) playback, Stop Playback, and Interrupt Response
 * Works both in browser and in Node.js test environments.
 */
export class VoiceInteractionController {
  private consent: VoiceConsentConfig = {
    provider: "browser_native",
    disclosureAcknowledged: false,
    thirdPartyAudioConsent: false,
  };

  private micPermission: MicrophonePermissionState = "prompt";
  private isListening = false;
  private playbackStatus: VoicePlaybackStatus = {
    isPlaying: false,
    wasInterrupted: false,
    activeText: "",
    provider: "browser_native",
  };

  private activeRecognition: { stop?: () => void; abort?: () => void } | null =
    null;

  public getCapabilities(
    customEnv?: Parameters<typeof detectVoiceCapabilities>[0]
  ): VoiceCapabilityReport {
    return detectVoiceCapabilities(customEnv);
  }

  public getConsentConfig(): VoiceConsentConfig {
    return { ...this.consent };
  }

  public setConsentConfig(update: Partial<VoiceConsentConfig>): {
    allowed: boolean;
    config: VoiceConsentConfig;
    error?: string;
  } {
    const nextConfig: VoiceConsentConfig = {
      ...this.consent,
      ...update,
    };
    const check = validateVoiceProviderConsent(nextConfig);
    if (!check.allowed) {
      this.consent = {
        ...nextConfig,
        provider: "browser_native",
      };
      return {
        allowed: false,
        config: this.getConsentConfig(),
        error: check.error,
      };
    }
    this.consent = nextConfig;
    return {
      allowed: true,
      config: this.getConsentConfig(),
    };
  }

  public getMicrophonePermissionState(): MicrophonePermissionState {
    return this.micPermission;
  }

  public async checkOrRequestMicrophone(
    customMediaDevices?: Parameters<typeof requestMicrophonePermission>[0]
  ): Promise<{
    state: MicrophonePermissionState;
    message: string;
  }> {
    const res = await requestMicrophonePermission(customMediaDevices);
    this.micPermission = res.state;
    return res;
  }

  public getListeningState(): boolean {
    return this.isListening;
  }

  public getPlaybackStatus(): VoicePlaybackStatus {
    return { ...this.playbackStatus };
  }

  /**
   * Transcribes voice input or falls back cleanly to text when microphone or
   * browser STT is unavailable or when a third-party provider lacks consent.
   */
  public transcribeOrFallback(input: {
    spokenTranscript?: string;
    fallbackText?: string;
    simulatedConfidence?: number;
  }): VoiceTranscriptResult {
    const consentCheck = validateVoiceProviderConsent(this.consent);
    if (!consentCheck.allowed) {
      throw new Error(consentCheck.error);
    }

    // If a spoken transcript was captured when mic permission is granted
    if (
      this.micPermission === "granted" &&
      input.spokenTranscript &&
      input.spokenTranscript.trim().length > 0
    ) {
      this.isListening = false;
      return {
        transcript: input.spokenTranscript.trim(),
        isFinal: true,
        confidence: input.simulatedConfidence ?? 0.94,
        provider: this.consent.provider,
        usedTextFallback: false,
      };
    }

    // Clean Text Fallback path
    const cleanFallback = (
      input.fallbackText ||
      input.spokenTranscript ||
      ""
    ).trim();
    this.isListening = false;
    return {
      transcript: cleanFallback,
      isFinal: true,
      confidence: 1.0,
      provider: "text_fallback",
      usedTextFallback: true,
    };
  }

  /**
   * Starts TTS playback of an assistant response.
   */
  public speakResponse(
    markdownText: string,
    options?: { rate?: number; lang?: string }
  ): VoicePlaybackStatus {
    const clean = sanitizeTextForSpeech(markdownText);
    if (!clean) {
      this.playbackStatus = {
        isPlaying: false,
        wasInterrupted: false,
        activeText: "",
        provider: this.consent.provider,
      };
      return this.getPlaybackStatus();
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = options?.rate ?? 1.02;
        utterance.lang = options?.lang ?? "en-IN";
        utterance.onend = () => {
          this.playbackStatus.isPlaying = false;
        };
        utterance.onerror = () => {
          this.playbackStatus.isPlaying = false;
        };
        window.speechSynthesis.speak(utterance);
      } catch {
        // Ignore synthesis errors in restricted environments
      }
    }

    this.playbackStatus = {
      isPlaying: true,
      wasInterrupted: false,
      activeText: clean,
      provider: this.consent.provider,
    };

    return this.getPlaybackStatus();
  }

  /**
   * Stops active TTS voice playback immediately.
   */
  public stopPlayback(): VoicePlaybackStatus {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    this.playbackStatus = {
      ...this.playbackStatus,
      isPlaying: false,
    };
    return this.getPlaybackStatus();
  }

  /**
   * Interrupts an active voice response playback (and/or active recognition)
   * when the student begins speaking or clicks "Interrupt Response".
   */
  public interruptResponse(): VoicePlaybackStatus {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    if (this.activeRecognition?.abort) {
      try {
        this.activeRecognition.abort();
      } catch {
        // Ignore
      }
    }
    this.isListening = false;
    this.playbackStatus = {
      ...this.playbackStatus,
      isPlaying: false,
      wasInterrupted: true,
    };
    return this.getPlaybackStatus();
  }
}

