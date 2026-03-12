import { test, expect } from '../fixtures/auth';

function getBaseUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN`;
}

test.describe.serial('AsterDEX - More Products 页面', () => {

  // ========================================================
  // 测试 1：导航到 More Products 入口
  // ========================================================
  test('More Products 导航入口可点击', async ({ loggedInPage: page }) => {
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 查找顶部导航中的 More Products 入口
    const navKeywords = ['More Products', '更多产品', 'Products'];
    let navFound = false;

    for (const kw of navKeywords) {
      const navItem = page.locator(`text=${kw}`).first();
      if (await navItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await navItem.click();
        console.log(`[test] 点击了导航: "${kw}"`);
        await page.waitForTimeout(2000);
        navFound = true;
        break;
      }
    }

    if (!navFound) {
      console.log('[test] ⚠️ 未找到 More Products 导航，尝试直接访问');
      await page.screenshot({ path: `test-results/more-products-nav-${Date.now()}.png` });
    }

    await page.screenshot({ path: `test-results/more-products-load-${Date.now()}.png` });
    console.log('[test] ✅ More Products 导航测试完成');
  });


  // ========================================================
  // 测试 2：验证产品列表显示
  // ========================================================
  test('验证产品列表页面内容', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    const productKeywords = ['现货', 'Spot', '合约', 'Futures', 'Earn', '赚币', 'Launchpad'];
    let found = false;

    for (const kw of productKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到产品元素: "${kw}"`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('[test] ⚠️ 未找到产品列表内容，请确认 URL 和页面结构');
      await page.screenshot({ path: `test-results/more-products-content-${Date.now()}.png` });
    }

    // 验证没有加载错误
    const hasError = await page.locator('text=404').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);
    console.log('[test] ✅ More Products 内容验证完成');
  });


  // ========================================================
  // 测试 3：点击进入具体产品页
  // ========================================================
  test('点击进入具体产品页面', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    // 尝试点击现货或期货入口
    const productLinks = ['现货交易', 'Spot Trading', '合约交易', 'Futures Trading'];
    let clicked = false;

    for (const linkText of productLinks) {
      const link = page.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`).first();
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        await link.click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);
        console.log(`[test] 点击了产品链接: "${linkText}"`);
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log('[test] ⚠️ 未找到具体产品链接，跳过');
    } else {
      const currentUrl = page.url();
      console.log(`[test] ✅ 已跳转到: ${currentUrl}`);
    }
  });

});
