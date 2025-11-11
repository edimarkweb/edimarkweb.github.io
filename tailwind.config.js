/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './*.js',
    './locales/**/*.json',
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
