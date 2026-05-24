/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{vue,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          deep: 'var(--bg-deep)',
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          hover: 'var(--bg-hover)'
        },
        accent: {
          DEFAULT: '#c0392b',
          dim: 'rgba(192,57,43,0.15)',
          glow: 'rgba(192,57,43,0.08)'
        },
        fuji: {
          red: '#c0392b',
          'red-dim': 'rgba(192,57,43,0.15)',
          warm: '#d4a574',
          'warm-dim': 'rgba(212,165,116,0.12)',
          sepia: '#c4a882',
          cream: '#f5e6c8',
          silver: '#b8b0a8',
          chrome: '#8a8278'
        },
        polaroid: {
          white: '#f2ede6',
          bg: '#e8e0d4',
          shadow: 'rgba(0,0,0,0.25)'
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)'
        }
      },
      fontFamily: {
        hand: ['Caveat', 'Ma Shan Zheng', 'cursive'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'monospace']
      },
      borderColor: {
        film: 'var(--border-film)',
        subtle: 'var(--border-subtle)'
      },
      boxShadow: {
        'polaroid': '0 2px 8px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2)',
        'polaroid-hover': '0 4px 16px rgba(0,0,0,0.4), 0 12px 40px rgba(0,0,0,0.3)',
        'polaroid-light': '0 2px 8px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.06)',
        'polaroid-light-hover': '0 4px 16px rgba(0,0,0,0.15), 0 12px 40px rgba(0,0,0,0.1)',
        'card': '0 1px 4px rgba(0,0,0,0.3)',
        'float': '0 8px 32px rgba(0,0,0,0.5)'
      }
    }
  },
  plugins: []
}
