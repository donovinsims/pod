"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FileDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

import { SingleRequestSchema, Format, TranscriptDocument } from "@/lib/types";
import { formatTranscript } from "@/lib/formatters";
import { sanitizeFilename } from "@/lib/filename";

export default function Home() {
    const [isLoading, setIsLoading] = useState(false);
    const [errorDetails, setErrorDetails] = useState<{ title: string; desc: string } | null>(null);
    const { toast } = useToast();

    const form = useForm<z.input<typeof SingleRequestSchema>>({
        resolver: zodResolver(SingleRequestSchema),
        defaultValues: {
            url: "",
            format: "txt",
            source: undefined,
        },
    });

    async function onSubmit(values: z.input<typeof SingleRequestSchema>) {
        setIsLoading(true);
        setErrorDetails(null);

        try {
            const res = await fetch("/api/transcript", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const data = await res.json();

            if (!res.ok) {
                setErrorDetails({
                    title: data.code || "Error",
                    desc: data.message || "Something went wrong.",
                });
                toast({
                    title: "Export Failed",
                    description: data.message,
                    variant: "destructive",
                });
                return;
            }

            const doc: TranscriptDocument = data.document;
            downloadFile(doc, values.format as Format);

            toast({
                title: "Success",
                description: `Downloaded transcript for: ${doc.title}`,
            });
            form.reset();
        } catch (err) {
            setErrorDetails({
                title: "Network Error",
                desc: "Failed to connect to the server.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    function downloadFile(doc: TranscriptDocument, format: Format) {
        const content = formatTranscript(doc);
        const filename = sanitizeFilename(doc.title, format, doc.source);
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Single Export</h1>
                <p className="text-muted-foreground mt-2">
                    Paste a supported URL to instantly download its transcript.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Retrieve Transcript</CardTitle>
                    <CardDescription>
                        Supports YouTube, Apple Podcasts (if RSS has tag), and Spotify (metadata only).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://youtube.com/watch?v=..."
                                                {...field}
                                                disabled={isLoading}
                                                className="text-base sm:text-sm" // prevents iOS zoom
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
                                        <FormLabel>Format</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex gap-4"
                                                disabled={isLoading}
                                            >
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="txt" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal cursor-pointer">Text (.txt)</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="md" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal cursor-pointer">Markdown (.md)</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {errorDetails && (
                                <Alert variant="destructive">
                                    <AlertTitle>{errorDetails.title}</AlertTitle>
                                    <AlertDescription>{errorDetails.desc}</AlertDescription>
                                </Alert>
                            )}

                            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto min-h-[44px]">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Fetching...
                                    </>
                                ) : (
                                    <>
                                        <FileDown className="mr-2 h-4 w-4" />
                                        Download
                                    </>
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card className="bg-muted/50 border-dashed">
                <CardContent className="p-6 text-sm text-muted-foreground flex flex-col space-y-2">
                    <strong>Important Notes on Sources:</strong>
                    <ul className="list-disc pl-4 space-y-1">
                        <li><strong>YouTube:</strong> Usually works instantly unless the video is private or auto-captions are disabled.</li>
                        <li><strong>Apple Podcasts:</strong> Requires the podcast creator to embed exactly a <code>&lt;podcast:transcript&gt;</code> tag in their RSS feed. If not present, we will not generate one.</li>
                        <li><strong>Spotify:</strong> Only fetches metadata natively. Currently requires manual transcript file mapping limits on the platform side.</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
