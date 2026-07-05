/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:     '#0F0F0F',
        card:   '#111111',
        border: '#1E1E1E',
      },
    },
  },
  plugins: [],
};
