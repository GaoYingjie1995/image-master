/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#08080a',
          primary: '#0e0e12',
          secondary: '#16161c',
          tertiary: '#1e1e26',
          hover: '#262630'
        },
        accent: {
          DEFAULT: '#d4a574',
          dim: 'rgba(212,165,116,0.15)',
          glow: 'rgba(212,165,116,0.08)'
        },
        text: {
          primary: '#e8e4df',
          secondary: '#8a8690',
          muted: '#5a5660'
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['DM Sans', 'sans-serif']
      }
    }
  },
  plugins: []
}
