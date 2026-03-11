import { test as base, Page, BrowserContext, chromium } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const METAMASK_PATH = path.resolve(__dirname, '../../extensions/metamask');
const TEST_SEED = process.env.TEST_SEED_PHRASE!;
const TEST_PASSWORD = process.env.METAMASK_PASSWORD || 'Test1234!';

export const test = base.extend<{}, {
  extensionContext: BrowserContext;
  loggedInPage: Page;
}>({
  extensionContext: [async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${METAMASK_PATH}`,
        `--load-extension=${METAMASK_PATH}`,
        '--no-first-run',
      ],
    });
    await use(context);
    await context.close();
  }, { scope: 'worker' }],

  loggedInPage: [async ({ extensionContext: context }, use) => {
    // ===== 第一步：初始化 MetaMask（全部用精确选择器）=====
    const mmPage = await context.waitForEvent('page', {
      predicate: (p: Page) => p.url().includes('chrome-extension'),
      timeout: 30000,
    });
    await mmPage.waitForLoadState();
    await mmPage.waitForTimeout(2000);

    // 勾选同意条款
    const agreeCheckbox = mmPage.locator('[data-testid="onboarding-terms-checkbox"]');
    if (await agreeCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await agreeCheckbox.click();
    }

    // 点击"导入已有钱包"
    await mmPage.locator('[data-testid="onboarding-import-wallet"]').click();

    // 同意改进计划（No thanks / I agree）
    const noThanks = mmPage.locator('[data-testid="metametrics-no-thanks"]');
    if (await noThanks.isVisible({ timeout: 5000 }).catch(() => false)) {
      await noThanks.click();
    }

    // 输入助记词
    await mmPage.waitForSelector('[data-testid="import-srp__srp-word-0"]', { timeout: 15000 });
    const words = TEST_SEED.split(' ');
    for (let i = 0; i < words.length; i++) {
      await mmPage.fill(`[data-testid="import-srp__srp-word-${i}"]`, words[i]);
    }

    // 点击确认助记词
    await mmPage.locator('[data-testid="import-srp-confirm"]').click();

    // 设置密码
    await mmPage.waitForSelector('[data-testid="create-password-new"]', { timeout: 10000 });
    await mmPage.fill('[data-testid="create-password-new"]', TEST_PASSWORD);
    await mmPage.fill('[data-testid="create-password-confirm"]', TEST_PASSWORD);
    await mmPage.locator('[data-testid="create-password-terms"]').click();
    await mmPage.locator('[data-testid="create-password-import"]').click();

    // 等待导入完成，点击"Got it"
    await mmPage.locator('[data-testid="onboarding-complete-done"]').click({ timeout: 30000 });

    // 关闭欢迎页
    const nextBtn = mmPage.locator('[data-testid="pin-extension-next"]');
    if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nextBtn.click();
      const doneBtn = mmPage.locator('[data-testid="pin-extension-done"]');
      if (await doneBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await doneBtn.click();
      }
    }

    console.log('[auth] MetaMask 初始化完成');

    // ===== 第二步：连接交易所（这里用 auto() 自然语言）=====
    const page = await context.newPage();
    await page.goto(process.env.EXCHANGE_URL || 'https://your-exchange.com');
    await page.waitForLoadState('networkidle');

    // 先注册弹窗监听，再触发连接
    const popupPromise = context.waitForEvent('page', { timeout: 30000 });

    // 点击"连接钱包"按钮
    await page.locator('text=连接钱包').first().click();
    await page.waitForTimeout(1000);

    // 在弹窗中选择 MetaMask
    await page.locator('text=MetaMask').click();

    // ===== 第二步：MetaMask 授权连接 =====
    const popup = await popupPromise;
    await popup.waitForLoadState();
    await popup.waitForTimeout(2000);

    // 用 data-testid 精确点击连接按钮（兼容多个版本）
    const connectSelectors = [
      '[data-testid="page-container-footer-next"]',
      '[data-testid="confirmation-submit-button"]',
      '[data-testid="confirm-btn"]',
      'button:has-text("连接")',
      'button:has-text("Connect")',
    ];

    for (const selector of connectSelectors) {
      const btn = popup.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        console.log(`[auth] 点击了连接按钮: ${selector}`);
        break;
      }
    }

    await popup.waitForTimeout(2000);

    // 如果弹窗还在，可能有第二步确认（如切换网络）
    if (!popup.isClosed()) {
      for (const selector of connectSelectors) {
        const btn = popup.locator(selector).first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.click();
          console.log(`[auth] 点击了第二步确认: ${selector}`);
          break;
        }
      }
    }

    // ===== 第三步：交易所"建立连接"弹窗 + MetaMask 签名 =====
    await page.waitForTimeout(2000);

    // 辅助函数：在 MetaMask 扩展页面中找到确认按钮并点击
    async function confirmMetaMask(ctx: BrowserContext, timeout = 1500) {
      const signSelectors = [
        '[data-testid="confirmation-submit-button"]',
        '[data-testid="page-container-footer-next"]',
        '[data-testid="request-signature__sign"]',
        '[data-testid="confirm-footer-button"]',
        'button:has-text("确认")',
        'button:has-text("签名")',
        'button:has-text("Sign")',
        'button:has-text("Confirm")',
      ];

      // 同时监听新弹窗
      let newPopup: Page | null = null;
      const popupHandler = (p: Page) => { newPopup = p; };
      ctx.on('page', popupHandler);

      const start = Date.now();
      while (Date.now() - start < timeout) {
        // 检查是否有新弹窗
        if (newPopup) {
          try {
            // @ts-ignore
            await newPopup.waitForLoadState();
            await new Promise(resolve => setTimeout(resolve, 1500));
            for (const selector of signSelectors) {
              // @ts-ignore
              const btn = newPopup.locator(selector).first();
              if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await btn.click();
                console.log(`[auth] MetaMask 新弹窗确认: ${selector}`);
                ctx.off('page', popupHandler);
                return true;
              }
            }
          } catch { /* 弹窗可能已关闭 */ }
          newPopup = null;
        }

        // 遍历所有 chrome-extension 页面
        const extPages = ctx.pages().filter(p => {
          try { return p.url().startsWith('chrome-extension://') && !p.isClosed(); }
          catch { return false; }
        });

        for (const p of extPages) {
          for (const selector of signSelectors) {
            try {
              const btn = p.locator(selector).first();
              if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
                await btn.click();
                console.log(`[auth] MetaMask 确认: ${selector} (${p.url().slice(0, 10)})`);
                ctx.off('page', popupHandler);
                return true;
              }
            } catch { /* 跳过 */ }
          }
        }

        await new Promise(resolve => setTimeout(resolve, 200));
        console.log(`[auth] 等待 MetaMask 确认... (已有${extPages.length}个扩展页面)`);
      }

      ctx.off('page', popupHandler);
      console.warn('[auth] MetaMask 确认超时');
      return false;
    }

    // 点击交易所"建立连接"弹窗的「连接」按钮
    const exchangeConnectBtn = page.locator('div >> text=连接').last();
    if (await exchangeConnectBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await exchangeConnectBtn.click();
      console.log('[auth] 点击了交易所"建立连接"弹窗的连接按钮');
    }

    // 在 MetaMask 中确认签名（兼容新弹窗和已有页面）
    await confirmMetaMask(context);

    // ===== 第四步：启用交易（如果需要）=====
    await new Promise(resolve => setTimeout(resolve, 3000));

    const enableTradeBtn = page.locator('text=启用交易').first();
    if (await enableTradeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await enableTradeBtn.click();
      console.log('[auth] 点击了"启用交易"');

      // 等待交易所弹出"建立连接"弹窗，点击「连接」
      await new Promise(resolve => setTimeout(resolve, 2000));
      const connectBtnInDialog = page.locator('div >> text=连接').last();
      if (await connectBtnInDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
        await connectBtnInDialog.click();
        console.log('[auth] 点击了启用交易的"连接"按钮');
      }

      // MetaMask 确认签名
      await confirmMetaMask(context);
    }

    // 等待登录完成
    await page.waitForTimeout(500);
    console.log('[auth] 钱包连接并登录完成');

    await use(page);
  }, { scope: 'worker' }],
});

export { expect } from '@playwright/test';