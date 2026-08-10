/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: 'var(--night-0)',
          1: 'var(--night-1)',
          2: 'var(--night-2)',
          3: 'var(--night-3)',
        },
        scout: {
          DEFAULT: 'var(--violet)',
          deep: 'var(--violet-deep)',
        },
        ember: {
          DEFAULT: 'var(--ember)',
          deep: 'var(--ember-deep)',
        },
        fern: {
          DEFAULT: 'var(--fern)',
        },
        danger: 'var(--danger)',
        // Referenced across the admin screens but never defined, so those
        // utilities emitted nothing. Declared as channels rather than
        // var(--hex) so opacity modifiers such as bg-primary/10 resolve.
        primary: {
          DEFAULT: 'rgb(16 185 129 / <alpha-value>)',
          light: 'rgb(52 211 153 / <alpha-value>)',
          dark: 'rgb(4 120 87 / <alpha-value>)',
        },
        surface: 'rgb(7 28 20 / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Cairo', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
