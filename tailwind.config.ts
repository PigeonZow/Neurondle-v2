import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design tokens (RGB triplet variables live in globals.css,
        // hex mirrors in src/lib/theme.ts for the PIXI canvas)
        ink: 'rgb(var(--ink) / <alpha-value>)',
        chart: 'rgb(var(--chart) / <alpha-value>)',
        graticule: 'rgb(var(--graticule) / <alpha-value>)',
        starlight: 'rgb(var(--starlight) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-deep': 'rgb(var(--accent-deep) / <alpha-value>)',
        alert: 'rgb(var(--alert) / <alpha-value>)',
        ember: 'rgb(var(--ember) / <alpha-value>)',
        verdant: 'rgb(var(--verdant) / <alpha-value>)',
        nebula: 'rgb(var(--nebula) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
        mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
        wordmark: ['var(--font-wordmark)', ...defaultTheme.fontFamily.sans],
      },
      animation: {
        'pin-drop': 'pinDrop 0.3s ease-out',
        'score-reveal': 'scoreReveal 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pinDrop: {
          '0%': { transform: 'translateY(-20px) scale(1.2)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        scoreReveal: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
