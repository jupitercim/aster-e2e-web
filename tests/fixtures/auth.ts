import { test as base, Page, BrowserContext, chromium } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const METAMASK_PATH = path.resolve(__dirname, '../../extensions/metamask');
// 固定 userDataDir：MetaMask 状态在 retry / 多次运行间持久保留
const METAMASK_USER_DATA = path.resolve(__dirname, '../../.metamask-userdata');
const TEST_SEED = process.env.TEST_SEED_PHRASE!;
const TEST_PASSWORD = process.env.METAMASK_PASSWORD || 'Test1234!';

export const test = base.extend<{}, {
  extensionContext: BrowserContext;
  loggedInPage: Page;
}>({
  extensionContext: [async ({}, use) => {
    const context = await chromium.launchPersistentContext(METAMASK_USER_DATA, {
      headless: !!process.env.CHROME_EXECUTABLE,
      executablePath: process.env.CHROME_EXECUTABLE || undefined,
      args: [
        `--disable-extensions-except=${METAMASK_PATH}`,
        `--load-extension=${METAMASK_PATH}`,
        '--no-first-run',
      ],
    });

    // 灰度环境路由：如果设置了 K8S_CLUSTER，给所有请求注入对应 header
    if (process.env.K8S_CLUSTER) {
      await context.setExtraHTTPHeaders({ k8scluster: process.env.K8S_CLUSTER });
      console.log(`[auth] 已注入请求 header: k8scluster=${process.env.K8S_CLUSTER}`);
    }

    await use(context);
    await context.close();
  }, { scope: 'worker' }],

  loggedInPage: [async ({ extensionContext: context }, use) => {
    // ===== 第一步：初始化 MetaMask =====
    // userDataDir 已存在时 MetaMask 不会自动弹出页面，改用短超时 + catch 容错
    let mmPage: Page | undefined = context.pages().find(p => p.url().includes('chrome-extension'));
    if (!mmPage) {
      mmPage = await context.waitForEvent('page', {
        predicate: (p: Page) => p.url().includes('chrome-extension'),
        timeout: 5000,
      }).catch(() => undefined);
    }

    if (mmPage) {
      await mmPage.waitForLoadState();
      await mmPage.waitForTimeout(2000);
    } else {
      console.log('[auth] MetaMask 扩展已就绪，跳过初始化');
    }

    if (mmPage) {
      // ===== 判断是否首次初始化 =====
      const agreeCheckbox = mmPage.locator('[data-testid="onboarding-terms-checkbox"]');
      const isFirstSetup = await agreeCheckbox.isVisible({ timeout: 3000 }).catch(() => false);

      if (isFirstSetup) {
        // ——— 首次运行：完整导入钱包 ———
        await agreeCheckbox.click();

        await mmPage.locator('[data-testid="onboarding-import-wallet"]').click();

        const noThanks = mmPage.locator('[data-testid="metametrics-no-thanks"]');
        if (await noThanks.isVisible({ timeout: 5000 }).catch(() => false)) {
          await noThanks.click();
        }

        await mmPage.waitForSelector('[data-testid="import-srp__srp-word-0"]', { timeout: 15000 });
        const words = TEST_SEED.split(' ');
        for (let i = 0; i < words.length; i++) {
          await mmPage.fill(`[data-testid="import-srp__srp-word-${i}"]`, words[i]);
        }

        await mmPage.locator('[data-testid="import-srp-confirm"]').click();

        await mmPage.waitForSelector('[data-testid="create-password-new"]', { timeout: 10000 });
        await mmPage.fill('[data-testid="create-password-new"]', TEST_PASSWORD);
        await mmPage.fill('[data-testid="create-password-confirm"]', TEST_PASSWORD);
        await mmPage.locator('[data-testid="create-password-terms"]').click();
        await mmPage.locator('[data-testid="create-password-import"]').click();

        await mmPage.locator('[data-testid="onboarding-complete-done"]').click({ timeout: 30000 });

        const nextBtn = mmPage.locator('[data-testid="pin-extension-next"]');
        if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nextBtn.click();
          const doneBtn = mmPage.locator('[data-testid="pin-extension-done"]');
          if (await doneBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await doneBtn.click();
          }
        }

        console.log('[auth] MetaMask 首次初始化完成');
      } else {
        // ——— 非首次：只需解锁 ———
        const unlockInput = mmPage.locator('[data-testid="unlock-password"]');
        if (await unlockInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await unlockInput.fill(TEST_PASSWORD);
          await mmPage.locator('[data-testid="unlock-submit"]').click();
          await mmPage.waitForTimeout(1000);
          console.log('[auth] MetaMask 已解锁（复用已有状态）');
        } else {
          console.log('[auth] MetaMask 已处于解锁状态，跳过初始化');
        }
      }
    }

    // ===== 第二步：连接交易所 =====
    const page = await context.newPage();
    await page.goto(process.env.EXCHANGE_URL || 'https://your-exchange.com');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 先注册弹窗监听，再触发连接
    const popupPromise = context.waitForEvent('page', { timeout: 30000 });

    // 点击"连接钱包"按钮
    await page.locator('text=连接钱包').first().click();
    await page.waitForTimeout(1000);

    // 在弹窗中选择 MetaMask
    await page.locator('text=MetaMask').click();

    // ===== MetaMask 授权连接 =====
    const popup = await popupPromise;
    await popup.waitForLoadState();
    await popup.waitForTimeout(2000);

    // MetaMask 弹窗可能显示解锁界面，先解锁再继续
    const popupUnlockInput = popup.locator('[data-testid="unlock-password"]');
    if (await popupUnlockInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await popupUnlockInput.fill(TEST_PASSWORD);
      await popup.locator('[data-testid="unlock-submit"]').click();
      await popup.waitForTimeout(2000);
      console.log('[auth] MetaMask 弹窗已解锁');
    }

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

    // 用主页等待，避免 popup 已关闭时竞态报错
    await page.waitForTimeout(2000);

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
          // 先检查是否处于解锁界面，解锁后 break 让 while 重试
          try {
            const unlockEl = p.locator('[data-testid="unlock-password"]');
            if (await unlockEl.isVisible({ timeout: 300 }).catch(() => false)) {
              await unlockEl.fill(TEST_PASSWORD);
              await p.locator('[data-testid="unlock-submit"]').click();
              console.log('[auth] MetaMask 扩展页已解锁');
              await new Promise(resolve => setTimeout(resolve, 2000));
              break; // 解锁后跳出 for，让 while 循环重新检查
            }
          } catch { /* 跳过 */ }

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

    // ===== 第四步：启用交易 / 打开交易（如果需要）=====
    await new Promise(resolve => setTimeout(resolve, 3000));

    const enableTradeBtn = page.locator('text=启用交易').first();
    const openTradeBtn = page.locator('text=打开交易').first();
    const enableVisible = await enableTradeBtn.isVisible({ timeout: 500 }).catch(() => false);
    const openVisible = !enableVisible && await openTradeBtn.isVisible({ timeout: 500 }).catch(() => false);

    if (enableVisible || openVisible) {
      const tradeBtn = enableVisible ? enableTradeBtn : openTradeBtn;
      await tradeBtn.click();
      console.log(`[auth] 点击了"${enableVisible ? '启用交易' : '打开交易'}"`);

      // 等待交易所弹出"建立连接"弹窗，点击「连接」
      await new Promise(resolve => setTimeout(resolve, 2000));
      const connectBtnInDialog = page.locator('div >> text=连接').last();
      if (await connectBtnInDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
        await connectBtnInDialog.click();
        console.log('[auth] 点击了启用交易的"连接"按钮');
      }

      // MetaMask 确认签名
      await confirmMetaMask(context);
    } else {
      console.log('[auth] 未检测到启用/打开交易按钮，跳过签名步骤');
    }

    // 等待登录完成
    await page.waitForTimeout(500);
    console.log('[auth] 钱包连接并登录完成');

    await use(page);
  }, { scope: 'worker' }],
});

export { expect } from '@playwright/test';