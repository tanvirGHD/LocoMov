/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#38BDF8',
        accentDeep: '#0EA5E9',
        bg: '#04121F',
        card: '#0B2236',
        text: '#E6F4FF',
        muted: '#8FB3C9',
        border: 'rgba(56, 189, 248, 0.18)',
      },
      fontFamily: {
        bengali: ['Hind Siliguri', 'Noto Sans Bengali', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
