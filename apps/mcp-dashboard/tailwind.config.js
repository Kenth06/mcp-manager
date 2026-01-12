/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#056DFF',
        'background-alt': '#FAFAFA',
        success: '#A8E9C0',
        warning: '#FBCDA5',
        error: '#FECCC8',
        info: '#B9D6FF',
      },
    },
  },
  plugins: [],
};





