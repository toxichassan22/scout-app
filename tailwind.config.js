/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--green)',
          light: 'var(--green)',
          dark: 'var(--green)',
        },
        accent: {
          DEFAULT: 'var(--amber)',
          light: 'var(--amber)',
          dark: 'var(--amber)',
        },
        signal: 'var(--green)',
        magenta: 'var(--amber)',
        danger: 'var(--danger)',
        background: 'var(--ink)',
        surface: {
          DEFAULT: 'var(--ink-2)',
          light: 'var(--ink-2)',
        },
      },
      fontFamily: {
        sans: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px var(--green-soft), 0 12px 32px -12px var(--green-soft)',
        'glow-green': '0 0 0 1px var(--green-soft), 0 10px 28px -12px var(--green-soft)',
        'glow-amber': '0 0 0 1px var(--amber-soft), 0 10px 28px -12px var(--amber-soft)',
      },
    },
  },
  plugins: [],
}
