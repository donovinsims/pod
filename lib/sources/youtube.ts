import { TranscriptDocument, TranscriptEntry, Format } from "../types";
import { TranscriptError, TranscriptErrorCode } from "../errors";
// We'll use a mocked fetcher for the demonstration,
// since youtube-transcript often breaks without an API key or rotating proxies.
// In a real app, this would use youtube-transcript or similar library:
// import { YoutubeTranscript } from 'youtube-transcript';

export async function fetchYoutubeTranscript(
    url: string,
    format: Format
): Promise<TranscriptDocument> {
    try {
        const videoId = extractYoutubeId(url);
        if (!videoId) {
            throw new TranscriptError(
                "Invalid YouTube URL",
                TranscriptErrorCode.INVALID_URL
            );
        }

        // --- Mock Implementation ---
        // Here an actual call to a service fetching YouTube captions would go.
        // e.g. const raw = await YoutubeTranscript.fetchTranscript(videoId);
        //
        // For this build prompt, we'll pretend we've fetched & parsed it.

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Simulate NO_TRANSCRIPT for a specific mock ID or just return a dummy
        if (videoId === "NO_TRANSCRIPT_ID") {
            throw new TranscriptError(
                "No transcript available for this video.",
                TranscriptErrorCode.NO_TRANSCRIPT
            );
        }

        const title = `YouTube Video ${videoId}`;
        const entries: TranscriptEntry[] = [
            { startMs: 0, timestamp: "00:00:00", text: "Welcome to the video." },
            { startMs: 5000, timestamp: "00:00:05", text: "This is a fetched YouTube transcript." },
            { startMs: 12500, timestamp: "00:00:12", text: "It has been parsed successfully." },
        ];

        return {
            id: videoId,
            source: "youtube",
            url: `https://youtube.com/watch?v=${videoId}`,
            title,
            entries,
            format,
        };
    } catch (error) {
        if (error instanceof TranscriptError) {
            throw error;
        }
        throw new TranscriptError(
            "Failed to fetch YouTube transcript",
            TranscriptErrorCode.BAD_RESPONSE,
            error
        );
    }
}

function extractYoutubeId(url: string): string | null {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}
