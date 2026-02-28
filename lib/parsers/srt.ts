import { TranscriptEntry } from "../types";
import { TranscriptError, TranscriptErrorCode } from "../errors";

function parseSrtTimeToMs(time: string): number {
    const parts = time.trim().split(":");
    if (parts.length !== 3) return 0;

    let ms = 0;
    ms += parseInt(parts[0]) * 3600000;
    ms += parseInt(parts[1]) * 60000;

    const [s, subS] = parts[2].split(",");
    ms += parseInt(s) * 1000;
    ms += parseInt(subS || "0");

    return ms;
}

export function parseSRT(content: string): TranscriptEntry[] {
    const entries: TranscriptEntry[] = [];
    const lines = content.split(/\\r?\\n/);

    let currentEntry: Partial<TranscriptEntry> | null = null;
    let textLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line === "") {
            if (currentEntry && currentEntry.timestamp) {
                entries.push({
                    startMs: currentEntry.startMs || 0,
                    timestamp: currentEntry.timestamp,
                    text: textLines.join(" ").trim(),
                });
                currentEntry = null;
                textLines = [];
            }
            continue;
        }

        if (line.match(/^[0-9]+$/)) {
            // It's the counter, ignore
            continue;
        }

        if (line.includes(" --> ")) {
            const parts = line.split(" --> ");
            const startTimeStr = parts[0].trim();
            currentEntry = {
                timestamp: startTimeStr.split(",")[0], // Keep HH:MM:SS
                startMs: parseSrtTimeToMs(startTimeStr),
            };
        } else if (currentEntry) {
            // It's text
            textLines.push(line.replace(/<[^>]+>/g, ""));
        }
    }

    if (currentEntry && currentEntry.timestamp) {
        entries.push({
            startMs: currentEntry.startMs || 0,
            timestamp: currentEntry.timestamp,
            text: textLines.join(" ").trim(),
        });
    }

    if (entries.length === 0) {
        throw new TranscriptError(
            "Invalid SRT file format",
            TranscriptErrorCode.BAD_RESPONSE
        );
    }

    return entries;
}
