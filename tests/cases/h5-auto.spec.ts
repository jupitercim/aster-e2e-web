import { test, expect } from '../fixtures/auth';

function getBaseUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN`;
}

// H5 移动端视口尺寸
const MOBILE_VIEWPORT = { width: 390, height: 844 };   // iPhone 14
const TABLET_VIEWPORT  = { width: 768, height: 1024 };  // iPad

test.describe.serial('AsterDEX - H5 页面兼容测试', () => {

  // ========================================================
  // 测试 1：移动端（390px）主页加载
  // ========================================================
  test('移动端视口（390px）主页可正常加载', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    console.log(`[test] 视口已设置为 ${MOBILE_VIEWPORT.width}×${MOBILE_VIEWPORT.height}`);

    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    await page.screenshot({ path: `test-results/h5-mobile-home-${Date.now()}.png` });
    console.log('[test] ✅ 移动端主页加载正常');
  });


  // ========================================================
  // 测试 2：移动端合约交易页加载
  // ========================================================
  test('移动端视口合约交易页可正常加载', async ({ loggedInPage: page }) => {
    // 复用 test 1 的视口设置，无需重新设置

    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 验证关键交易元素在移动端可见
    const tradeElements = [
      page.locator('button:text("限价")').first(),
      page.locator('button:text("市价")').first(),
      page.locator('input[placeholder="数量"]').first(),
    ];

    let visibleCount = 0;
    for (const el of tradeElements) {
      const isVisible = await el.isVisible({ timeout: 5000 }).catch(() => false);
      if (isVisible) visibleCount++;
    }

    console.log(`[test] 移动端交易元素可见数量: ${visibleCount}/${tradeElements.length}`);
    await page.screenshot({ path: `test-results/h5-mobile-trade-${Date.now()}.png` });

    // 至少 1 个关键元素可见
    expect(visibleCount).toBeGreaterThan(0);
    console.log('[test] ✅ 移动端合约交易页加载正常');
  });


  // ========================================================
  // 测试 3：平板（768px）布局验证
  // ========================================================
  test('平板视口（768px）页面布局正常', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，切换为平板视口
    await page.setViewportSize(TABLET_VIEWPORT);
    console.log(`[test] 视口已切换为 ${TABLET_VIEWPORT.width}×${TABLET_VIEWPORT.height}`);

    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    expect(title).toBeTruthy();

    await page.screenshot({ path: `test-results/h5-tablet-trade-${Date.now()}.png` });
    console.log('[test] ✅ 平板视口布局验证完成');
  });


  // ========================================================
  // 测试 4：恢复桌面视口
  // ========================================================
  test('恢复桌面视口（1440px）验证正常', async ({ loggedInPage: page }) => {
    // 复用 test 3 已打开的页面，恢复桌面视口
    await page.setViewportSize({ width: 1440, height: 900 });
    console.log('[test] 视口已恢复为 1440×900');

    await page.waitForTimeout(1000);

    const title = await page.title();
    expect(title).toBeTruthy();

    await page.screenshot({ path: `test-results/h5-desktop-restore-${Date.now()}.png` });
    console.log('[test] ✅ 桌面视口恢复正常');
  });

});
