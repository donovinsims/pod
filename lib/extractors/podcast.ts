import { create } from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs';
import { extractApplePodcastInfo, extractXiaoyuzhouInfo } from '../podcast-parser';

// Robust binary path resolution for Vercel
const ensureExecutableBinary = (): string => {
    const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
    const sourcePath = path.join(process.cwd(), 'node_modules/youtube-dl-exec/bin/yt-dlp');
    const targetPath = '/tmp/yt-dlp';

    // Locally or if we can execute directly, use the source
    if (!isVercel) {
        if (fs.existsSync(sourcePath)) {
            try { fs.chmodSync(sourcePath, 0o755); } catch (e) { }
            return sourcePath;
        }
        return 'yt-dlp';
    }

    // On Vercel, copy to /tmp to ensure it's executable
    try {
        if (!fs.existsSync(targetPath)) {
            console.log('Copying yt-dlp binary to /tmp...');
            fs.copyFileSync(sourcePath, targetPath);
        }
        fs.chmodSync(targetPath, 0o755);
        return targetPath;
    } catch (error) {
        console.error('Failed to prepare binary in /tmp:', error);
        return sourcePath; // Fallback
    }
};

const youtubedl = create(ensureExecutableBinary());

export async function extractPodcastAudioStream(url: string): Promise<string> {
    // 1. Check for platform-specific high-speed extractors
    try {
        if (url.includes('podcasts.apple.com')) {
            const info = await extractApplePodcastInfo(url);
            if (info.audioUrl) return info.audioUrl;
        }

        if (url.includes('xiaoyuzhoufm.com') || url.includes('小宇宙')) {
            const info = await extractXiaoyuzhouInfo(url);
            if (info.audioUrl) return info.audioUrl;
        }
    } catch (specificError) {
        console.warn('Platform-specific extraction failed, falling back to yt-dlp:', specificError);
    }

    // 2. Try yt-dlp extraction
    try {
        const rawData = await youtubedl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificates: true,
            preferFreeFormats: true,
            format: 'worstaudio/bestaudio',
        }) as Record<string, any>;

        return processRawData(rawData);
    } catch (error: any) {
        return handleExtractionError(error, url);
    }
}

function processRawData(data: Record<string, any>): string {
    if (typeof data.url === 'string') return data.url;

    const audioFormats = (data.formats as any[])?.filter(f => f.acodec !== 'none') || [];
    if (audioFormats.length > 0 && typeof audioFormats[0].url === 'string') {
        return audioFormats[0].url;
    }

    throw new Error('Could not find a valid audio stream URL.');
}

async function handleExtractionError(error: any, url: string): Promise<string> {
    const errorMsg = error?.message || String(error);
    console.error('Extraction attempt failed:', errorMsg);

    // If first attempt failed, try ONE fallback with minimal flags
    try {
        const fallbackData = await youtubedl(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
        }) as Record<string, any>;
        return processRawData(fallbackData);
    } catch (fallbackError: any) {
        const finalErr = fallbackError?.message || String(fallbackError);

        if (finalErr.includes('EACCES') || finalErr.includes('not found')) {
            throw new Error('Binary execution failed or not found. Please contact support.');
        }

        if (finalErr.toLowerCase().includes('sign in') || finalErr.toLowerCase().includes('premium')) {
            throw new Error('PAYWALL_DETECTED');
        }

        throw new Error(`Extraction failed: ${finalErr}`);
    }
}
