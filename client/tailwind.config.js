/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        para: {
          ink: '#35251d',
          brown: '#984826',
          cream: '#FBF6EB',
        },
      },
      fontFamily: {
        bengali: ['Hind Siliguri', 'Noto Sans Bengali', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
