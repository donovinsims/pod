"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FileArchive, Loader2, Play } from "lucide-react";
import JSZip from "jszip";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

import { Format, BatchJobResult } from "@/lib/types";
import { formatTranscript } from "@/lib/formatters";
import { sanitizeFilename } from "@/lib/filename";

const BatchFormSchema = z.object({
    urlsString: z.string().min(1, "Please enter at least one URL"),
    format: z.enum(["txt", "md"]),
});

export default function BatchPage() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<BatchJobResult[] | null>(null);

    const { toast } = useToast();

    const form = useForm<z.infer<typeof BatchFormSchema>>({
        resolver: zodResolver(BatchFormSchema),
        defaultValues: {
            urlsString: "",
            format: "txt",
        },
    });

    async function onSubmit(values: z.infer<typeof BatchFormSchema>) {
        setIsProcessing(true);
        setProgress(0);
        setResults(null);

        // Parse URLs (comma or newline separated)
        const rawUrls = values.urlsString
            .split(/[\\n,]+/)
            .map(u => u.trim())
            .filter(u => u.length > 0);

        // Initial basic validation to avoid massive immediate fails
        const validUrls: string[] = [];
        const invalidUrls: string[] = [];

        rawUrls.forEach(url => {
            try {
                new URL(url);
                validUrls.push(url);
            } catch (e) {
                invalidUrls.push(url);
            }
        });

        if (validUrls.length === 0) {
            toast({
                title: "No Valid URLs",
                description: "Could not find any valid URLs in your input.",
                variant: "destructive",
            });
            setIsProcessing(false);
            return;
        }

        if (validUrls.length > 100) {
            toast({
                title: "Too Many URLs",
                description: "Please limit batch processing to 100 URLs at a time.",
                variant: "destructive",
            });
            setIsProcessing(false);
            return;
        }

        try {
            // Simulate progress updates for UI feel before the actual request finishes
            // (a real streaming API would be better here, but for this exercise we chunk on server and return list)
            const interval = setInterval(() => {
                setProgress(p => Math.min(p + 10, 90));
            }, 500);

            const res = await fetch("/api/transcript/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    urls: validUrls,
                    format: values.format,
                    concurrency: 3
                }),
            });

            clearInterval(interval);
            setProgress(100);

            const data = await res.json();

            if (!res.ok) {
                toast({
                    title: "Batch Failed",
                    description: data.message || "Failed to process batch",
                    variant: "destructive",
                });
                return;
            }

            // Add back the invalid URLs as errors in the results list
            const fullResults = [
                ...data.results,
                ...invalidUrls.map(url => ({
                    url,
                    status: "error" as const,
                    error: "Invalid URL format"
                }))
            ];

            setResults(fullResults);

            const successCount = fullResults.filter(r => r.status === "success").length;
            toast({
                title: "Batch Complete",
                description: `Successfully processed ${successCount} out of ${fullResults.length} URLs.`,
            });

        } catch (err) {
            toast({
                title: "Network Error",
                description: "Failed to connect to the server.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    }

    async function handleDownloadZip() {
        if (!results) return;

        const successfulJobs = results.filter(r => r.status === "success" && r.document);
        if (successfulJobs.length === 0) {
            toast({ title: "Nothing to download", variant: "destructive" });
            return;
        }

        try {
            const zip = new JSZip();

            // Add successes
            successfulJobs.forEach(result => {
                if (!result.document) return;
                const filename = sanitizeFilename(result.document.title, result.document.format as Format, result.document.source);
                const content = formatTranscript(result.document);
                zip.file(filename, content);
            });

            // Add a manifest/log of errors
            const errorJobs = results.filter(r => r.status === "error");
            if (errorJobs.length > 0) {
                const errorLog = errorJobs.map(r => `URL: ${r.url}\\nError: ${r.error}\\nCode: ${r.errorCode || 'UNKNOWN'}\\n`).join("\\n---\\n\\n");
                zip.file("errors.txt", errorLog);
            }

            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `transcripts_batch_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({ title: "ZIP Downloaded!" });
        } catch (e) {
            toast({ title: "Failed to generate ZIP", variant: "destructive" });
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Batch Export</h1>
                <p className="text-muted-foreground mt-2">
                    Paste multiple URLs (one per line or comma-separated) up to 100 items.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Job Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="urlsString"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>URLs</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="https://youtube.com/watch?v=...
https://podcasts.apple.com/..."
                                                    {...field}
                                                    disabled={isProcessing}
                                                    className="min-h-[150px] text-base sm:text-sm font-mono resize-y"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="format"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Export Format</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    className="flex gap-4"
                                                    disabled={isProcessing}
                                                >
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value="txt" />
                                                        </FormControl>
                                                        <FormLabel className="font-normal cursor-pointer">.txt</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value="md" />
                                                        </FormControl>
                                                        <FormLabel className="font-normal cursor-pointer">.md</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {isProcessing && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Processing batch...</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                    </div>
                                )}

                                <Button type="submit" disabled={isProcessing} className="w-full min-h-[44px]">
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Running...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="mr-2 h-4 w-4" />
                                            Start Batch Job
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                            <CardTitle>Results</CardTitle>
                            <CardDescription>
                                {results ? `Processed ${results.length} URLs` : "Run a job to see results"}
                            </CardDescription>
                        </div>
                        {results && results.some(r => r.status === "success") && (
                            <Button onClick={handleDownloadZip} size="sm" variant="secondary" className="min-h-[44px]">
                                <FileArchive className="mr-2 h-4 w-4" />
                                Download ZIP
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {results ? (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {results.map((r, i) => (
                                    <div key={i} className={`p-3 rounded-md text-sm border ${r.status === 'success' ? 'border-green-200 bg-green-50 text-green-900 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-100' : 'border-destructive/20 bg-destructive/10 text-destructive'}`}>
                                        <div className="font-mono text-xs truncate opacity-70 mb-1">{r.url}</div>
                                        <div className="font-medium">
                                            {r.status === 'success' ? (
                                                <div className="flex items-center text-green-600 dark:text-green-400">
                                                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                                                    Success
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <div className="flex items-center">
                                                        <span className="w-2 h-2 rounded-full bg-destructive mr-2" />
                                                        Failed
                                                    </div>
                                                    <span className="text-xs mt-1 opacity-80">{r.error}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
                                Results will appear here
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
