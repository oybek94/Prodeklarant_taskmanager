import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // API marshruta logikasi testlari src/routes/ da, hisob-kitob yordamchilari
    // src/services/ da joylashgan — vitest ularni topishi uchun ikkalasini qo'shamiz.
    include: [
      'src/__tests__/**/*.test.ts',
      'src/routes/**/*.test.ts',
      'src/services/**/*.test.ts',
    ],
    environment: 'node',
  },
});
