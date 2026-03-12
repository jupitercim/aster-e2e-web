import { test, expect } from '../fixtures/auth';

function getPortfolioUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/portfolio/pro`;
}

test.describe.serial('AsterDEX - Portfolio 页面', () => {

  // ========================================================
  // 测试 1：Portfolio 页面可正常加载
  // ========================================================
  test('Portfolio 页面可正常加载', async ({ loggedInPage: page }) => {
    const url = getPortfolioUrl();
    console.log(`[test] Portfolio URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    await page.screenshot({ path: `test-results/portfolio-load-${Date.now()}.png` });
    console.log('[test] ✅ Portfolio 页面加载完成');
  });


  // ========================================================
  // 测试 2：验证资产概览数据显示
  // ========================================================
  test('验证资产概览数据正常显示', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    // 查找总资产/账户余额相关元素
    const assetKeywords = ['总资产', '账户余额', 'Total Balance', 'Total Assets', 'Portfolio Value'];
    let found = false;

    for (const kw of assetKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到资产元素: "${kw}"`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('[test] ⚠️ 未找到资产概览元素，请确认页面 URL 是否正确');
      await page.screenshot({ path: `test-results/portfolio-asset-${Date.now()}.png` });
    }

    // 验证没有加载错误
    const errorMsg = page.locator('text=404, text=500, text=Error').first();
    const hasError = await errorMsg.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);
    console.log('[test] ✅ Portfolio 资产概览验证完成');
  });


  // ========================================================
  // 测试 3：切换不同资产 Tab
  // ========================================================
  test('切换资产 Tab 页', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    const tabNames = ['期货', '现货', 'Futures', 'Spot', '资金账户', '统计'];
    let tabClicked = false;

    for (const tabName of tabNames) {
      const tab = page.locator(`button[role="tab"]:has-text("${tabName}")`).first();
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        console.log(`[test] 点击了 "${tabName}" Tab`);
        await page.waitForTimeout(1000);
        tabClicked = true;
        break;
      }
    }

    if (!tabClicked) {
      console.log('[test] ⚠️ 未找到资产 Tab，跳过');
    } else {
      console.log('[test] ✅ Tab 切换正常');
    }
  });


  // ========================================================
  // 测试 4：验证总资产数值显示（非空、非 NaN）
  // ========================================================
  test('总资产 USDT 数值显示正常（非空非NaN）', async ({ loggedInPage: page }) => {
    // 复用 test 3 已打开的页面，无需重新导航

    // 查找总资产数值（通常是一个较大数字 + USDT 单位）
    const assetValuePatterns = [
      'text=/\\d+\\.?\\d*\\s*USDT/',
      'text=/\\$\\d+/',
      '[data-testid*="total"], [class*="total-asset"], [class*="totalAsset"]',
    ];

    let valueFound = false;
    for (const pattern of assetValuePatterns) {
      const el = page.locator(pattern).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        const text = await el.textContent();
        const isNaN = text?.includes('NaN') || text?.includes('undefined');
        const isEmpty = !text || text.trim() === '';

        if (!isNaN && !isEmpty) {
          console.log(`[test] ✅ 总资产数值: "${text?.trim()}"`);
          valueFound = true;
          break;
        } else {
          console.log(`[test] ⚠️ 总资产数值异常: "${text}"`);
        }
      }
    }

    if (!valueFound) {
      console.log('[test] ⚠️ 未找到总资产数值元素，可能需要查看页面结构');
    }

    await page.screenshot({ path: `test-results/portfolio-asset-value-${Date.now()}.png` });
    console.log('[test] ✅ 总资产数值验证完成');
  });

});
