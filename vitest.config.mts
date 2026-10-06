import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/finance/**', 'lib/stream/hub.ts', 'lib/stream/sse.ts', 'lib/stream/token.ts', 'lib/csv.ts', 'lib/cache.ts', 'lib/rate-limit.ts', 'lib/market-hours.ts', 'lib/format.ts', 'lib/validation.ts'],
      thresholds: { lines: 85, functions: 85, branches: 75 },
    },
  },
});
