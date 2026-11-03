/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        para: {
          ink: '#1a1411',
          brown: '#814124',
          cream: '#ffffff',
        },
      },
      fontFamily: {
        bengali: ['Hind Siliguri', 'Noto Sans Bengali', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
