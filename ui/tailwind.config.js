/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0a0f',
          surface: '#12121a',
          border: '#2a2a3a',
          text: '#e0e0e8',
          muted: '#6a6a7a',
          cyan: '#00f0ff',
          green: '#00ff6a',
          red: '#ff3366',
          gold: '#ffaa00',
        },
      },
    },
  },
  plugins: [],
};