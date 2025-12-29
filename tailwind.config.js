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
        slate: {
          850: '#151f32',
          900: '#0f172a',
          950: '#020617',
        }
      },
      fontFamily: {
        sans: ['Outfit', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
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
      },
    },
  },
  plugins: [],
}
