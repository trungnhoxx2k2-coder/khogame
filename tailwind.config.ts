import type { Config } from 'tailwindcss';

const config: Config = {
  // lib/ cũng được quét vì meta.ts chứa các class màu của từng game
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 700: '#222758', 800: '#161a3a', 900: '#0d0f24' },      // nền chàm tím
        gold: '#ffb547', amber: '#ffb547', coral: '#ff6b6b',           // điểm nhấn ấm
        violet: '#8b6cff', sky: '#4cc9f0', mint: '#34e5b0',            // điểm nhấn mát
        cinnabar: '#b3261e', wood: '#d9a95f', paper: '#f5f3ff',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        han: ['"Noto Serif TC"', 'KaiTi', 'SimSun', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
