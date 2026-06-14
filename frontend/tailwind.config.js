/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(45,70%,75%)',
        'primary-dark': 'hsl(45,60%,65%)',
        'dark-bg': 'hsl(150,20%,5%)',
        'dark-surface': 'hsla(150,20%,10%,0.8)',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        anton: ['Anton', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
