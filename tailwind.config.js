/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './*.tsx',
    './components/**/*.tsx',
    './hooks/**/*.ts',
    './context/**/*.tsx',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Modern Violet-Cyan Theme
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        secondary: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        // Warm neutral palette
        cream: {
          50: '#fffbf5',
          100: '#fef5eb',
          200: '#fbebdd',
          300: '#f5dcc5',
          400: '#ecc8a4',
          500: '#e0ad7d',
        },
        // Deep violet dark palette
        midnight: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#0f0d23', // Deep violet black
          950: '#0c0a1e', // Deepest
        },
      },
      fontFamily: {
        sans: ['Outfit', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'gradient': 'gradient 8s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
