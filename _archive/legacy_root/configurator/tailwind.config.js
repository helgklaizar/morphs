/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#08080A',
        surface: 'rgba(20, 20, 25, 0.65)',
        borderBase: 'rgba(255, 255, 255, 0.08)',
        primary: '#FF6B00', // Orange elements
        primaryGlow: 'rgba(255, 107, 0, 0.25)',
        textMain: '#F2F2F2',
        textMuted: '#8F8F99'
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
      }
    },
  },
  plugins: [],
}
