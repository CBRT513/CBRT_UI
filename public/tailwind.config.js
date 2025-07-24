/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { colors: { brand: { primary: '#01522F', secondary: '#4A4A4A', accent: '#A0B5C1', neutral: '#F8F8F8', alert: '#FF7F00' } }, fontFamily: { sans: ['"Open Sans"', 'sans-serif'], serif: ['Merriweather', 'serif'] } } },
  plugins: [],
}