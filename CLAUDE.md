# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (Next.js on port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript check without emitting
```

ESLint and TypeScript errors are intentionally ignored during builds (`next.config.js`).

## Architecture

This is a **Next.js 14 App Router** application that extracts audio from YouTube/Spotify/Apple Podcasts and transcribes it via Groq Whisper.

### Transcript Extraction Flow

Two parallel paths exist for extraction:

1. **YouTube native captions** (`lib/extractors/youtube.ts` → `lib/sources/youtube.ts`): Tries `youtube_transcript_api` CLI first; falls back to audio extraction.

2. **Audio stream extraction** (`lib/extractors/podcast.ts`): Uses `youtube-dl-exec` (yt-dlp wrapper) to extract an audio stream URL, which is then sent to Groq Whisper for transcription.

**Vercel constraint**: yt-dlp binary lives in `node_modules` (read-only on Vercel). `ensureExecutableBinary()` in `lib/extractors/podcast.ts` copies the binary to `/tmp/yt-dlp` and `chmod 755`s it when `process.env.VERCEL` is set.

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/transcribe` | GET | **Primary endpoint** — SSE streaming, real-time transcript chunks. `maxDuration: 300`. |
| `/api/transcript` | POST | Single URL, returns full `TranscriptDocument` JSON. |
| `/api/transcript/batch` | POST | Batch up to 100 URLs with configurable concurrency (default 3). |

The SSE route (`app/api/transcribe/route.ts`) is the one the main UI uses. It streams `data:` events for status updates and transcript chunks.

### Data Flow (Single Transcript)

```
User URL → /api/transcribe (SSE)
  → Platform detection
  → YouTube? → youtube-transcript library → stream chunks
  → Else → podcast.ts ensureExecutableBinary() → yt-dlp extracts stream URL
           → fetch audio → Groq Whisper API → stream chunks back
```

### Key Types (`lib/types.ts`)

- `TranscriptEntry`: `{ startMs, timestamp, text }`
- `TranscriptDocument`: `{ id, source, url, title, durationMs?, entries[], format }`
- `Source`: `"youtube" | "apple" | "spotify"`
- `Format`: `"txt" | "md"`

### Path Aliases

`@/*` maps to the repo root. Use `@/lib/...`, `@/components/...`, `@/app/...`.

### State Management

Zustand store (`lib/store.ts`) handles batch job history and settings. Only settings persist to `localStorage` (job history persistence is commented out).

### Transcript Parsing Pipeline

After extraction, raw transcript text goes through format-specific parsers (`lib/parsers/`): `plain.ts`, `srt.ts`, `vtt.ts`. Output is formatted via `lib/formatters.ts` into either `.txt` or `.md`.

### Environment Variables

```
GROQ_API_KEY           # Required for Whisper transcription
SPOTIFY_CLIENT_ID      # Optional, not currently used
SPOTIFY_CLIENT_SECRET  # Optional, not currently used
YOUTUBE_API_KEY        # Optional, not currently used
```
