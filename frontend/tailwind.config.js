/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // クラスベースのダークモードを有効化
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      // ダークモード用の色定義を追加
      backgroundColor: theme => ({
        ...theme('colors'),
        'dark-primary': '#0F172A', // slate-900
        'dark-secondary': '#1E293B', // slate-800
        'dark-tertiary': '#334155', // slate-700
      }),
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
