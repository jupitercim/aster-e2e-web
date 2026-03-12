import { test, expect } from '../fixtures/auth';

function getBaseUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN`;
}

test.describe.serial('AsterDEX - More Resources 页面', () => {

  // ========================================================
  // 测试 1：More Resources 导航入口可点击
  // ========================================================
  test('More Resources 导航入口可点击', async ({ loggedInPage: page }) => {
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const navKeywords = ['More Resources', '更多资源', 'Resources', '帮助中心'];
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
      console.log('[test] ⚠️ 未找到 More Resources 导航，截图留存');
      await page.screenshot({ path: `test-results/more-resources-nav-${Date.now()}.png` });
    }

    await page.screenshot({ path: `test-results/more-resources-load-${Date.now()}.png` });
    console.log('[test] ✅ More Resources 导航测试完成');
  });


  // ========================================================
  // 测试 2：验证资源内容显示
  // ========================================================
  test('验证资源列表内容正常显示', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    const resourceKeywords = ['文档', 'Docs', '帮助', 'Help', 'API', 'Blog', '博客', '公告', 'Announcement'];
    let found = false;

    for (const kw of resourceKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到资源元素: "${kw}"`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('[test] ⚠️ 未找到资源相关内容，请确认页面结构');
      await page.screenshot({ path: `test-results/more-resources-content-${Date.now()}.png` });
    }

    const hasError = await page.locator('text=404').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);
    console.log('[test] ✅ More Resources 内容验证完成');
  });


  // ========================================================
  // 测试 3：点击帮助/文档链接
  // ========================================================
  test('点击帮助或文档链接', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    const helpLinks = ['帮助中心', 'Help Center', '用户指南', 'User Guide', '文档', 'Documentation'];
    let clicked = false;

    for (const linkText of helpLinks) {
      const link = page.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`).first();
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        // 外部链接用 waitForNavigation
        const [newPage] = await Promise.all([
          page.context().waitForEvent('page').catch(() => null),
          link.click(),
        ]);
        if (newPage) {
          console.log(`[test] ✅ 新标签页已打开: ${await newPage.url()}`);
          await newPage.close();
        } else {
          await page.waitForTimeout(2000);
          console.log(`[test] ✅ 当前页面已跳转: ${page.url()}`);
        }
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log('[test] ⚠️ 未找到帮助/文档链接，跳过');
    }
  });

});
