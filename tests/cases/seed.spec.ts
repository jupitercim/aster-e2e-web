import { test, expect } from '@playwright/test';

test.describe('Test group', () => {
  test('seed', { tag: ['@P0', '@PROD'] }, async ({ page }) => {
    // generate code here.
  });
});
