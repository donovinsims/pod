import { NextRequest, NextResponse } from "next/server";
import { BatchRequestSchema, BatchJobResult, Source } from "@/lib/types";
import { fetchYoutubeTranscript } from "@/lib/sources/youtube";
import { fetchAppleTranscript } from "@/lib/sources/apple";
import { fetchSpotifyTranscript } from "@/lib/sources/spotify";
import { TranscriptError, TranscriptErrorCode } from "@/lib/errors";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = BatchRequestSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { code: TranscriptErrorCode.BAD_RESPONSE, message: "Invalid request body", details: result.error },
                { status: 400 }
            );
        }

        const { urls, format, concurrency } = result.data;

        if (urls.length > 100) {
            return NextResponse.json(
                { code: TranscriptErrorCode.BAD_RESPONSE, message: "Batch size exceeds maximum limit of 100 URLs." },
                { status: 400 }
            );
        }

        // In a real implementation with high concurrency limits, you'd use a queue library like `p-limit`.
        // For simplicity without adding extra dependencies, we chunk manually.
        const results: BatchJobResult[] = [];

        // Chunk array by concurrency size
        for (let i = 0; i < urls.length; i += concurrency) {
            const chunk = urls.slice(i, i + concurrency);

            const chunkPromises = chunk.map(async (url) => {
                const source = detectSource(url);

                if (!source) {
                    return {
                        url,
                        status: "error" as const,
                        error: "Unsupported source URL format.",
                        errorCode: TranscriptErrorCode.UNSUPPORTED_SOURCE
                    };
                }

                try {
                    let doc;
                    switch (source) {
                        case "youtube":
                            doc = await fetchYoutubeTranscript(url, format);
                            break;
                        case "apple":
                            doc = await fetchAppleTranscript(url, format);
                            break;
                        case "spotify":
                            doc = await fetchSpotifyTranscript(url, format, undefined, undefined);
                            break;
                    }
                    return { url, status: "success" as const, document: doc };
                } catch (error) {
                    if (error instanceof TranscriptError) {
                        return { url, status: "error" as const, error: error.message, errorCode: error.code };
                    }
                    return { url, status: "error" as const, error: "Unexpected error", errorCode: TranscriptErrorCode.UNKNOWN };
                }
            });

            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);
        }

        return NextResponse.json({ success: true, results });

    } catch (error) {
        console.error("Unknown error in batch transcript API:", error);
        return NextResponse.json(
            { code: TranscriptErrorCode.UNKNOWN, message: "An unexpected error occurred during batch processing." },
            { status: 500 }
        );
    }
}

function detectSource(url: string): Source | null {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
    if (url.includes("podcasts.apple.com")) return "apple";
    if (url.includes("spotify.com")) return "spotify";
    return null;
}
