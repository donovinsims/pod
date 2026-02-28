export enum TranscriptErrorCode {
    INVALID_URL = "INVALID_URL",
    UNSUPPORTED_SOURCE = "UNSUPPORTED_SOURCE",
    NOT_FOUND = "NOT_FOUND",
    NO_TRANSCRIPT = "NO_TRANSCRIPT",
    RATE_LIMITED = "RATE_LIMITED",
    TIMEOUT = "TIMEOUT",
    BAD_RESPONSE = "BAD_RESPONSE",
    UNKNOWN = "UNKNOWN",
}

export class TranscriptError extends Error {
    code: TranscriptErrorCode;
    details?: unknown;

    constructor(message: string, code: TranscriptErrorCode = TranscriptErrorCode.UNKNOWN, details?: unknown) {
        super(message);
        this.name = "TranscriptError";
        this.code = code;
        this.details = details;

        // TypeScript requirement when extending Error
        Object.setPrototypeOf(this, TranscriptError.prototype);
    }

    toJSON() {
        const result: Record<string, unknown> = {
            code: this.code,
            message: this.message,
        };
        if (this.details) {
            result.details = this.details;
        }
        return result;
    }
}
