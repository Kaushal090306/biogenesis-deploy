/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6e0',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        surface: {
          900: '#0a0f1e',
          800: '#0f1629',
          750: '#141c33',
          700: '#1a243d',
          600: '#1f2c47',
          500: '#253352',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 1.5s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px theme(colors.brand.500/50%)' },
          '100%': { boxShadow: '0 0 20px theme(colors.brand.400/80%), 0 0 40px theme(colors.brand.500/40%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(20,184,166,0.07) 1px, transparent 1px), linear-gradient(to right, rgba(20,184,166,0.07) 1px, transparent 1px)',
        'hero-gradient': 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.25) 0%, transparent 70%)',
        'card-gradient': 'linear-gradient(135deg, rgba(15,22,41,0.95) 0%, rgba(10,15,30,0.95) 100%)',
      },
    },
  },
  plugins: [],
}
