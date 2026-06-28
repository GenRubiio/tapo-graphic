/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built dist/ works when opened from any sub-path or file://.
  base: './',
  build: {
    target: 'esnext',
  },
  test: {
    // Pure functions only — no DOM needed for the unit suites.
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.ts'],
  },
});
