/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef9ff',
          100: '#d6f0ff',
          200: '#b0e2ff',
          300: '#7ccfff',
          400: '#3fb6ff',
          500: '#0a9df7',
          600: '#007ed4',
          700: '#0063a8',
          800: '#004f86',
          900: '#003f6b'
        }
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        fadeInUp: 'fadeInUp 700ms ease-out both',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite'
      },
      boxShadow: {
        soft: '0 10px 30px -10px rgba(2, 12, 27, 0.1)'
      }
    }
  },
  plugins: []
};


