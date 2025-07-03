// tailwind.config.ts
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    'backdrop-blur-sm',
    'bg-red-400/40',
    'bg-blue-400/40',
    'bg-white/60',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Assistant', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
