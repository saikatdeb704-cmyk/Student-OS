# Student OS — Known Operational Boundaries & Edge Cases

This document details known behavioral boundaries, browser variations, and operational trade-offs within Student OS. These items represent intentional architectural decisions, browser platform limitations, or planned future enhancements.

---

## 1. Dual-Mode Architecture (Local Demo vs. Production Supabase)

### Context & Behavior
Student OS was engineered with zero-friction development in mind. When `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set in `.env.local`:
- The application automatically activates **Local Demo Mode** using [`dbStore`](file:///c:/Users/HP/Student%20OS/src/lib/db/store.ts).
- All 27 relational tables, multi-tenant user isolation, RLS rules, and vector searches operate seamlessly in-memory and persist across development server hot-reloads.

### Production Consideration
- In multi-instance serverless deployments (such as Vercel or AWS Lambda with multiple concurrent function containers), in-memory demo state is container-local.
- **Production Requirement:** For multi-server or clustered production deployments, live Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) **must** be provided so all containers query the centralized PostgreSQL database.

---

## 2. Voice API & Browser Compatibility

### Speech-to-Text (STT) Variability
- **Chromium Browsers (Chrome, Edge, Brave, Android Chrome):** Full native support for continuous and single-turn `webkitSpeechRecognition` / `SpeechRecognition`.
- **iOS Safari:** Supports `webkitSpeechRecognition` starting from iOS 14.5, but requires explicit user gesture per session and pauses when the screen locks.
- **Mozilla Firefox:** Does not enable the Web Speech `SpeechRecognition` API by default.
  - *Fallback Behavior:* [`detectVoiceCapabilities`](file:///c:/Users/HP/Student%20OS/src/lib/voice/provider.ts) automatically detects Firefox and sets `textFallbackRecommended = true`, gracefully routing the student to the instant text composer without throwing browser exceptions.

### Text-to-Speech (TTS) Autoplay Restrictions
- Modern mobile operating systems (iOS and Android) block background or unprompted audio playback. TTS audio playback will only trigger in response to an active student tap or voice query.
- The voice interaction controller provides explicit [`stopPlayback()`](file:///c:/Users/HP/Student%20OS/src/lib/voice/provider.ts) and [`interruptResponse()`](file:///c:/Users/HP/Student%20OS/src/lib/voice/provider.ts) buttons to cancel audio speech synthesis instantly.

---

## 3. PWA Installation Differences Across Operating Systems

### Desktop & Android Chrome / Edge
- Supports the native `beforeinstallprompt` event.
- The UI displays an **"Install App"** button in the top navigation header and mobile drawer. Clicking it launches the native OS installation dialog.

### iOS Safari (Apple WebKit)
- Apple intentionally does not implement the `beforeinstallprompt` event on iOS.
- *Fallback Handling:* The Student OS PWA detection engine identifies iOS Safari and displays targeted instructional guidance: *"Tap the Share button in Safari, then tap 'Add to Home Screen'"*.

### Service Worker Scope & Navigation
- The service worker is scoped to `/`. In private browsing modes (e.g. Chrome Incognito or Firefox Private Window), some browsers disable `CacheStorage` or limit service worker lifecycle events. Student OS wraps all service worker registrations in graceful try/catch blocks so the web application continues to work flawlessly.

---

## 4. In-Memory Sliding-Window Rate Limiting

### Behavior
- The current rate limiter ([`src/lib/security/rate-limiter.ts`](file:///c:/Users/HP/Student%20OS/src/lib/security/rate-limiter.ts)) maintains sliding-window request timestamps in Node.js server process memory.
- In single-server or containerized deployments (Docker, Fly.io, single-region Node.js), this provides instantaneous, zero-latency rate limiting for `/api/auth/*` and `/api/ceo/chat`.

### Clustered Deployment Recommendation
- For horizontally scaled deployments across multiple serverless regions, instantiate an external centralized key-value store (such as Upstash Redis or Vercel KV) using the same interface to share request counters globally across containers.

---

## 5. Document Ingestion File Formats

### Supported Formats
- Fully supported for ingestion and client extraction: `.txt`, `.md`, `.markdown`, `.csv`, `.tsv`, `.json`.
- Upload validation supported: `.pdf`, `.docx`, `.pptx`, `.xlsx`, `.png`, `.jpg`, `.webp`.

### Scanned Document OCR
- Text-based PDF files are parsed directly. Scanned image-only PDFs (photocopied textbook pages) require an upstream OCR step or Google Document AI / Gemini Vision API integration for high-accuracy character recognition.

---

## 6. Token Budget Quotas

### Default Limits
- `MAX_TOKENS_PER_REQUEST`: 2,048 tokens.
- `DAILY_TOKEN_BUDGET_PER_USER`: 50,000 tokens.
- In demo mode, token estimates use standard character heuristics (`chars / 4`). When connected to live Gemini API, actual usage reported by the Gemini API metadata is recorded in `usage_records`.

