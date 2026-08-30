/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'SF Pro Display',
          'system-ui',
          'Segoe UI',
          'Inter',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        royal: {
          DEFAULT: '#0A84FF',
          hover: '#0071E3',
        },
      },
    },
  },
  plugins: [],
}
