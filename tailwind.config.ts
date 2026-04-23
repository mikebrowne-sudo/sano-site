import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50:  '#F7F9F7',
          100: '#E0EAE3',
          200: '#a8c5b0',
          300: '#7EC87A',
          500: '#076653',
          550: '#0a7a64',  // Phase 1.2 — slightly richer green for hover/CTA accents
          600: '#5C6B64',
          700: '#344C3D',
          800: '#06231D',
        },
        // Portal product surface tokens (Phase 1.2). Cool neutral page
        // background reads cleaner than the warm sage-50 the marketing
        // site uses; cards stay pure white so they lift visibly off it.
        surface: {
          app:      '#F5F7FA',  // portal page background
          card:     '#FFFFFF',  // primary card surface
          elevated: '#FFFFFF',  // dashboard hero cards (relies on shadow, not tint)
        },
      },
      fontFamily: {
        sans:    ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        display: ['var(--font-noto-serif)', 'Georgia', 'serif'],
        serif:   ['var(--font-noto-serif)', 'Georgia', 'serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config
