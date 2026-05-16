import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Tests laufen sequenziell, weil sie eine globale dbHelper-Instanz teilen.
    // Parallelität würde zu Race Conditions zwischen den Test-DBs führen.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
