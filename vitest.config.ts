import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
});
