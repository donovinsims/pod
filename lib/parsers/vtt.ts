import { TranscriptEntry } from "../types";
import { TranscriptError, TranscriptErrorCode } from "../errors";

function parseVttTimeToMs(time: string): number {
    const parts = time.trim().split(":");
    let ms = 0;
    if (parts.length === 3) {
        const [h, m, sWithMs] = parts;
        ms += parseInt(h) * 3600000;
        ms += parseInt(m) * 60000;
        const [s, subS] = sWithMs.split(/[.,]/);
        ms += parseInt(s) * 1000;
        ms += parseInt(subS || "0");
    } else if (parts.length === 2) {
        const [m, sWithMs] = parts;
        ms += parseInt(m) * 60000;
        const [s, subS] = sWithMs.split(/[.,]/);
        ms += parseInt(s) * 1000;
        ms += parseInt(subS || "0");
    }
    return ms;
}

export function parseVTT(content: string): TranscriptEntry[] {
    if (!content.includes("WEBVTT")) {
        throw new TranscriptError(
            "Invalid VTT file format",
            TranscriptErrorCode.BAD_RESPONSE
        );
    }

    const entries: TranscriptEntry[] = [];
    const lines = content.split(/\\r?\\n/);
    let currentEntry: Partial<TranscriptEntry> | null = null;
    let textLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line === "WEBVTT" || line === "") {
            // If we have a current entry, push it
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

        // Checking for a timestamp line: HH:MM:SS.mmm --> HH:MM:SS.mmm
        if (line.includes(" --> ")) {
            const parts = line.split(" --> ");
            const startTimeStr = parts[0].trim();
            currentEntry = {
                timestamp: startTimeStr.split(/[.,]/)[0], // Keep HH:MM:SS for the timestamp
                startMs: parseVttTimeToMs(startTimeStr),
            };
            textLines = [];
        } else if (currentEntry && !line.match(/^[0-9]+$/)) {
            // It's text belonging to the current timestamp (ignore lonely cue IDs)
            textLines.push(line.replace(/<[^>]+>/g, "")); // Strip tags
        }
    }

    // Handle the last entry
    if (currentEntry && currentEntry.timestamp) {
        entries.push({
            startMs: currentEntry.startMs || 0,
            timestamp: currentEntry.timestamp,
            text: textLines.join(" ").trim(),
        });
    }

    return entries;
}
