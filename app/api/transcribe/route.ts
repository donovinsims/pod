import { NextRequest } from 'next/server';
import { extractYoutubeTranscript } from '@/lib/extractors/youtube';
import { extractPodcastAudioStream } from '@/lib/extractors/podcast';
import Groq from 'groq-sdk';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

export const maxDuration = 300; // Allow Vercel to run up to 5 minutes

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
        return new Response('Missing URL parameter', { status: 400 });
    }

    const stream = new ReadableStream({
        async start(controller) {
            function send(event: string, data: unknown) {
                controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
            }

            try {
                // Detect YouTube URL
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    try {
                        send('status', { message: 'Attempting to fetch native YouTube transcript...' });
                        const transcript = await extractYoutubeTranscript(url);

                        send('status', { message: 'Native transcript found! Streaming...' });

                        // Fake stream the result for a smooth typing UX
                        const chunks = transcript.match(/[^.!?]+[.!?]+/g) || [transcript];
                        for (const chunk of chunks) {
                            send('chunk', { text: chunk.trim() + ' ' });
                            await new Promise((resolve) => setTimeout(resolve, 30));
                        }
                        send('done', { success: true });
                        controller.close();
                        return;
                    } catch (ytError) {
                        console.warn('YouTube transcript fetch failed, falling back to AI transcription:', ytError);
                        send('status', { message: 'Native CC not found. Using AI transcription fallback...' });
                        // Continue to the main podcast extraction flow below
                    }
                }

                // --- Main Extraction Flow (Spotify, Apple Podcasts, or YouTube Fallback) ---
                if (!groq) {
                    throw new Error('GROQ_API_KEY is not configured on the server.');
                }

                send('status', { message: 'Extracting audio stream (yt-dlp)...' });
                const streamUrl = await extractPodcastAudioStream(url);

                send('status', { message: 'Buffering audio for Whisper AI...' });

                // Fetch audio stream into memory
                const audioResponse = await fetch(streamUrl);
                if (!audioResponse.ok) {
                    throw new Error(`Failed to download audio stream: ${audioResponse.statusText}`);
                }

                const arrayBuffer = await audioResponse.arrayBuffer();

                // Create standard File object compatible with Groq/OpenAI Node SDK
                const file = new File([arrayBuffer], 'audio.mp3', { type: 'audio/mpeg' });

                send('status', { message: 'Transcribing with Whisper AI (may take 30-60s)...' });

                // Call Groq Whisper API
                const transcription = await groq.audio.transcriptions.create({
                    file: file,
                    model: 'whisper-large-v3',
                    response_format: 'verbose_json',
                });

                send('status', { message: 'Transcription complete! Streaming...' });

                // Stream text out by segments for real-time visualization
                const segments = (transcription as unknown as { segments?: Array<{ text: string }> }).segments || [];
                if (segments.length > 0) {
                    for (const segment of segments) {
                        send('chunk', { text: segment.text + ' ' });
                        await new Promise((resolve) => setTimeout(resolve, 80)); // Smooth UX
                    }
                } else {
                    send('chunk', { text: transcription.text });
                }

                send('done', { success: true });
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('Transcription API Error:', errorMessage);
                const isPaywall = errorMessage.includes('PAYWALL') || errorMessage.toLowerCase().includes('drm');
                const isTooLarge = errorMessage.includes('413') || errorMessage.toLowerCase().includes('too large');

                let displayMessage = errorMessage;
                if (isTooLarge) {
                    displayMessage = 'Audio Too Large. The Whisper model is currently limited to 25MB audio streams.';
                } else if (isPaywall) {
                    displayMessage = 'Paywall or Region Lock Detected.';
                }

                send('error', {
                    message: displayMessage || 'An unexpected error occurred during transcription.',
                    isPaywall,
                    details: errorMessage !== displayMessage ? errorMessage : undefined
                });
            } finally {
                try { controller.close(); } catch { }
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
