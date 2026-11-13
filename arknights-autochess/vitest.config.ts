import { defineConfig } from 'vitest/config';

// sim 层是纯 TypeScript，不碰 DOM，所以单测跑在 node 环境即可。
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
