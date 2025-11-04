/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'Helvetica', 'Arial'],
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        pointlab: {
          primary: '#4f46e5',
          secondary: '#8b5cf6',
          accent: '#ec4899',
          neutral: '#1f2937',
          'base-100': '#ffffff',
        },
      },
      'light',
    ],
  },
}

