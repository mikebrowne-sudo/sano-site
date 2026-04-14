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
          300: '#7EC87A',
          500: '#076653',
          600: '#5C6B64',
          800: '#06231D',
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
