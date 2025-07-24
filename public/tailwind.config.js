/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#01522F',    // CBRT Green
          secondary: '#4A4A4A',   // Slate Gray
          accent: '#A0B5C1',      // Light Steel Blue
          neutral: '#F8F8F8',     // Off-White
          alert: '#FF7F00',       // Safety Orange
        },
      },
      fontFamily: {
        sans: ['"Open Sans"', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
    },
  },
  plugins: [],
}
