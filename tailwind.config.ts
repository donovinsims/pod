import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#3b82f6',
        'primary-dark': '#1e40af',
        'error': '#ef4444',
        'success': '#10b981',
        'warning': '#f59e0b',
      },
    },
  },
  plugins: [],
};

export default config;
