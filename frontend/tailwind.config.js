/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          white: '#FFFFFF',
          light: '#EBEBEB',
          silver: '#C0C0C0',
          blue: '#3A6EA5',
          dark: '#004E98',
        },
        // Bice blue va Polynesian blue asosida indigo palitrasini yangilaymiz
        indigo: {
          50: '#f0f5fb',
          100: '#e1eaf6',
          200: '#c8dceb',
          300: '#a1c2df',
          400: '#6ea3cb',
          500: '#3A6EA5', // Bice blue (Yon panel, asboblar)
          600: '#004E98', // Polynesian blue (Tugmalar, asosiy urg'u)
          700: '#004485',
          800: '#003970',
          900: '#002f5e',
          950: '#001e40',
        },
        // Anti-flash white va Silver asosida kulrang palitrani yangilaymiz
        gray: {
          50: '#FDFDFD',
          100: '#EBEBEB', // Anti-flash white (Orqa fonlar, hover)
          200: '#D6D6D6',
          300: '#C0C0C0', // Silver (Chegaralar, passiv elementlar)
        }
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
}

