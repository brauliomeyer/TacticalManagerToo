import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: '#0f9d58',
        panel: '#27272a'
      }
    }
  },
  plugins: []
} satisfies Config;
