import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Transcript Exporter',
    description: 'Export transcripts from YouTube, Apple Podcasts, and Spotify as Text or Markdown.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-background text-foreground antialiased min-h-screen flex flex-col`}>
                <header className="border-b px-4 h-14 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur z-50">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg tracking-tight">Transcript Exporter</span>
                    </div>
                    <nav className="flex items-center gap-4 text-sm font-medium">
                        <a href="/" className="hover:text-primary transition-colors text-muted-foreground">Single</a>
                        <a href="/batch" className="hover:text-primary transition-colors text-muted-foreground">Batch</a>
                        <a href="/settings" className="hover:text-primary transition-colors text-muted-foreground">Settings</a>
                    </nav>
                </header>

                <main className="flex-1 flex flex-col container max-w-4xl mx-auto py-8 px-4">
                    {children}
                </main>

                <footer className="border-t py-6 text-center text-sm text-muted-foreground">
                    Built securely. Local processing only.
                </footer>
                <Toaster />
                <Analytics />
            </body>
        </html>
    );
}
