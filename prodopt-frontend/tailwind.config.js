/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Приятный изумрудный цвет (Emerald-500)
        primary: '#10B981', 
        // При наведении чуть темнее (Emerald-600)
        'primary-hover': '#059669',
      }
    },
  },
  plugins: [],
}