import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dce5ff',
          500: '#4f6ef7',
          600: '#3a56e8',
          700: '#2d44d0',
          900: '#1a2980',
        },
      },
    },
  },
  plugins: [],
};

export default config;
