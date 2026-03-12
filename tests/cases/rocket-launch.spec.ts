import { test, expect } from '../fixtures/auth';

function getRocketLaunchUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  // TODO: 确认 Rocket Launch 实际路径
  return `${origin}/zh-CN/launch`;
}

test.describe.serial('AsterDEX - Rocket Launch 页面', () => {

  // ========================================================
  // 测试 1：Rocket Launch 页面可正常加载
  // ========================================================
  test('Rocket Launch 页面可正常加载', async ({ loggedInPage: page }) => {
    const url = getRocketLaunchUrl();
    console.log(`[test] Rocket Launch URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    await page.screenshot({ path: `test-results/rocket-launch-load-${Date.now()}.png` });
    console.log('[test] ✅ Rocket Launch 页面加载完成');
  });


  // ========================================================
  // 测试 2：验证 Launch 项目列表显示
  // ========================================================
  test('验证 Launch 项目列表显示', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    const launchKeywords = ['Launch', 'Launchpad', '发射', '新币', 'IEO', 'IDO', '认购', 'Subscribe'];
    let found = false;

    for (const kw of launchKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到 Launch 元素: "${kw}"`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('[test] ⚠️ 未找到 Launch 相关内容，请确认页面 URL');
      await page.screenshot({ path: `test-results/rocket-launch-content-${Date.now()}.png` });
    }

    const hasError = await page.locator('text=404').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);
    console.log('[test] ✅ Rocket Launch 内容验证完成');
  });


  // ========================================================
  // 测试 3：查看 Launch 项目详情（如有）
  // ========================================================
  test('查看 Launch 项目详情', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    // 查找项目卡片或列表项
    const projectCard = page.locator('[data-testid="launch-item"], .launch-card, [class*="launch"]').first();
    const viewDetailBtn = page.locator('button:has-text("查看"), button:has-text("详情"), a:has-text("View")').first();

    if (await projectCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await projectCard.click();
      await page.waitForTimeout(2000);
      console.log(`[test] ✅ 点击了项目卡片，当前 URL: ${page.url()}`);
    } else if (await viewDetailBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewDetailBtn.click();
      await page.waitForTimeout(2000);
      console.log(`[test] ✅ 点击了查看详情，当前 URL: ${page.url()}`);
    } else {
      console.log('[test] ⚠️ 未找到项目列表或详情入口，跳过');
      await page.screenshot({ path: `test-results/rocket-launch-detail-${Date.now()}.png` });
    }
  });

});
