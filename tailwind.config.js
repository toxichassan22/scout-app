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
          DEFAULT: '#1F7A4D',
          light: '#33A474',
          dark: '#0F2F24',
        },
        accent: {
          DEFAULT: '#F2C14E',
          light: '#FFE08A',
          dark: '#B7791F',
        },
        background: '#08111F',
        signal: '#38BDF8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
