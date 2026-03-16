import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests/cases',
  timeout: 60000,   // 单测超时 60s（原 120s）
  retries: 0,
  workers: 1,  // MetaMask userdata 目录只能被一个进程占用，必须串行
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.EXCHANGE_URL || 'https://your-exchange.com',
    headless: false,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'off',
    actionTimeout: 10000,  // 单个动作超时 10s（原 15s）
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
