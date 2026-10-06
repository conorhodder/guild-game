import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/guild-game/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
});
