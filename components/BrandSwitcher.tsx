'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const brands = [
    {
        name: 'Spotify',
        color: '#1DB954',
        fontClass: 'font-montserrat',
        logo: (
            <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-10 md:h-10 fill-current">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.306c-.216.354-.675.465-1.029.249-2.815-1.72-6.358-2.108-10.531-1.155-.404.092-.811-.158-.903-.562-.092-.404.158-.811.562-.903 4.567-1.045 8.484-.602 11.644 1.328.354.216.465.675.257 1.043zm1.468-3.258c-.272.443-.848.583-1.291.311-3.223-1.981-8.138-2.557-11.95-1.399-.5.152-1.026-.135-1.178-.635-.152-.5.135-1.026.635-1.178 4.359-1.323 9.778-.682 13.472 1.589.443.272.583.848.312 1.312zm.127-3.39c-3.865-2.295-10.25-2.508-13.978-1.376-.593.18-1.222-.153-1.402-.746-.18-.593.153-1.222.746-1.402 4.283-1.3 11.34-1.056 15.82 1.599.533.317.708 1.005.391 1.538-.317.533-1.005.708-1.577.387z" />
            </svg>
        )
    },
    {
        name: 'Apple',
        color: '#A259FF', // Apple Podcasts Purple
        fontClass: 'font-inter',
        logo: (
            <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-10 md:h-10 fill-current">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 18.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
            </svg>
        )
    },
    {
        name: 'YouTube',
        color: '#FF0000',
        fontClass: 'font-roboto',
        logo: (
            <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-10 md:h-10 fill-current">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
        )
    }
];

export default function BrandSwitcher() {
    const [index, setIndex] = useState(0);
    const [displayText, setDisplayText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const brand = brands[index];
        const fullText = brand.name;

        const typingSpeed = isDeleting ? 40 : 100;

        if (!isDeleting && displayText === fullText) {
            const timeout = setTimeout(() => setIsDeleting(true), 2000);
            return () => clearTimeout(timeout);
        }

        if (isDeleting && displayText === '') {
            setIsDeleting(false);
            setIndex((prev) => (prev + 1) % brands.length);
            return;
        }

        const timeout = setTimeout(() => {
            setDisplayText(prev =>
                isDeleting
                    ? fullText.substring(0, prev.length - 1)
                    : fullText.substring(0, prev.length + 1)
            );
        }, typingSpeed);

        return () => clearTimeout(timeout);
    }, [displayText, isDeleting, index]);

    return (
        <div className="inline-flex items-center gap-3 min-w-[140px] md:min-w-[180px]">
            <div className="relative w-8 h-8 md:w-10 md:h-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={brands[index].name}
                        initial={{ opacity: 0, scale: 0.5, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: -10 }}
                        transition={{ duration: 0.3, ease: "circOut" }}
                        style={{ '--brand-color': brands[index].color } as React.CSSProperties}
                        className="absolute inset-0 text-[var(--brand-color)] drop-shadow-[0_0_8px_var(--brand-color)]"
                    >
                        {brands[index].logo}
                    </motion.div>
                </AnimatePresence>
            </div>
            <span
                className={`${brands[index].fontClass} font-bold transition-all duration-500`}
                style={{
                    color: brands[index].color,
                    '--brand-glow': `${brands[index].color}44`
                } as React.CSSProperties}
            >
                <span className="[text-shadow:0_0_20px_var(--brand-glow)]">
                    {displayText}
                </span>
                <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    style={{ backgroundColor: brands[index].color }}
                    className="inline-block w-[2px] h-[1.2em] ml-0.5 align-middle"
                />
            </span>
        </div>
    );
}
