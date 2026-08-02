import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // API marshruta logikasi testlari src/routes/ da joylashgan bo'ladi,
    // shuning uchun vitest ularni topishi uchun bu katalogni ham qo'shamiz.
    include: ['src/__tests__/**/*.test.ts', 'src/routes/**/*.test.ts'],
    environment: 'node',
  },
});
