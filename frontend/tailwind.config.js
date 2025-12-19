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
          primary: '#1e40af',    // PRO blue (dark)
          secondary: '#3b82f6',  // DEKLARANT blue (medium)
          light: '#60a5fa',      // Tagline blue (light)
          bg: '#f3f4f6',         // Background gray
        },
      },
    },
  },
  plugins: [],
}

