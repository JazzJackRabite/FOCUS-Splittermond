import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'split-blue': '#1B365D',
        'split-gold': '#C5A059',
        'parchment-dark': '#E3D4B9',
        'text-main': '#2C1810',
      },
      fontFamily: {
        serif: ['Merriweather', 'serif'],
        fantasy: ['Cinzel', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
