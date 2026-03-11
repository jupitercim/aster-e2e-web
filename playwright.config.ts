import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// 保留 dotenv 加载，供 spot/futures 测试读取 MetaMask 相关变量
dotenv.config();

// 各环境域名配置，新增环境在此添加即可
const ENVIRONMENTS: Record<string, string> = {
  qa:      'https://www.astherusqa.finance',
  prod:    'https://www.asterdex.com',
  gray:    'https://www.asterdex.com',  // 与 prod 同域，通过请求头区分灰度集群
};

export default defineConfig({
  testDir: './tests/cases',
  timeout: 120000,
  retries: 3,
  reporter: [['html', { open: 'never' }]],
  use: {
    headless: false,
    viewport: { width: 1440, height: 900 },
    screenshot: 'on',
    trace: 'on-first-retry',
    actionTimeout: 15000,
  },
  projects: [
    // ── 静态检查：多环境 ─────────────────────────────────────────
    {
      name: 'static-qa',
      testMatch: '**/page-static.spec.ts',
      use: { baseURL: ENVIRONMENTS.qa },
    },
    {
      name: 'static-prod',
      testMatch: '**/page-static.spec.ts',
      use: { baseURL: ENVIRONMENTS.prod },
    },
    {
      name: 'static-gray',
      testMatch: '**/page-static.spec.ts',
      use: {
        baseURL: ENVIRONMENTS.gray,
        extraHTTPHeaders: { 'k8scluster': 'gray' },
      },
    },

    // ── 交易测试：沿用 .env 的 EXCHANGE_URL（保持原有行为）────────
    {
      name: 'chromium',
      testMatch: ['**/spot-order.spec.ts', '**/futures-order.spec.ts'],
      use: { browserName: 'chromium' },
    },
  ],
});
