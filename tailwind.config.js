/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        heading: ['"Nunito Sans"', '"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Dancing Script"', '"Playfair Display"', '"Alex Brush"', 'cursive'],
      },
      colors: {
        brand: {
          50: '#fff7fb',
          100: '#ffe8f2',
          300: '#fc94c3',
          500: '#d43276',
          600: '#cf005e',
          700: '#b94185',
          900: '#4b1738',
        }
      }
    },
  },
  plugins: [],
}
