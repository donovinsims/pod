import { z } from "zod";

export const SourceEnum = z.enum(["youtube", "apple", "spotify"]);
export type Source = z.infer<typeof SourceEnum>;

export const FormatEnum = z.enum(["txt", "md"]);
export type Format = z.infer<typeof FormatEnum>;

export const TranscriptEntrySchema = z.object({
    startMs: z.number(),
    timestamp: z.string(),
    text: z.string(),
});
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

export const TranscriptDocumentSchema = z.object({
    id: z.string(),
    source: SourceEnum,
    url: z.string(),
    title: z.string(),
    durationMs: z.number().optional(),
    entries: z.array(TranscriptEntrySchema),
    format: FormatEnum,
});
export type TranscriptDocument = z.infer<typeof TranscriptDocumentSchema>;

export const BatchJobItemSchema = z.object({
    url: z.string().url(),
    format: FormatEnum.default("txt"),
    source: SourceEnum.optional(),
});
export type BatchJobItem = z.infer<typeof BatchJobItemSchema>;

export const BatchJobResultSchema = z.object({
    url: z.string(),
    status: z.enum(["success", "error"]),
    document: TranscriptDocumentSchema.optional(),
    error: z.string().optional(),
    errorCode: z.string().optional(),
});
export type BatchJobResult = z.infer<typeof BatchJobResultSchema>;

export const BatchJobSchema = z.object({
    id: z.string(),
    items: z.array(BatchJobItemSchema),
    results: z.array(BatchJobResultSchema),
    status: z.enum(["pending", "processing", "completed", "failed"]),
    createdAt: z.date(),
    completedAt: z.date().optional(),
});
export type BatchJob = z.infer<typeof BatchJobSchema>;

export const SingleRequestSchema = z.object({
    url: z.string().url(),
    format: FormatEnum,
    source: SourceEnum.optional(),
});

export const BatchRequestSchema = z.object({
    urls: z.array(z.string().url()).max(100),
    format: FormatEnum.default("txt"),
    concurrency: z.number().min(1).max(10).default(3),
});
