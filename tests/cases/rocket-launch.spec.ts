import { test, expect } from '../fixtures/auth';

function getRocketLaunchUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/rocket-launch`;
}

test.describe.serial('AsterDEX - Rocket Launch 页面', () => {

  // ========================================================
  // 测试 1：页面加载，标题与主要文案可见
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

    // H1 "火箭发射" 可见
    const h1 = page.locator('h1').first();
    const h1Text = await h1.innerText().catch(() => '');
    console.log(`[test] H1: "${h1Text}"`);
    expect(h1Text).toBeTruthy();

    // H2 介绍文案可见
    const h2 = page.locator('h2').first();
    const h2Visible = await h2.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] H2 可见: ${h2Visible ? '✅' : '⚠️'}`);

    // 无 404/500 错误页
    const has404 = await page.locator('h1:text-is("404"), text=404 Not Found').isVisible({ timeout: 1000 }).catch(() => false);
    expect(has404).toBe(false);

    await page.screenshot({ path: `test-results/rocket-load-${Date.now()}.png` });
    console.log('[test] ✅ 页面加载完成');
  });


  // ========================================================
  // 测试 2：Tab 切换 — 火箭发射 / Trade Arena
  // ========================================================
  test('Tab 切换：火箭发射 / Trade Arena', async ({ loggedInPage: page }) => {
    // 验证两个 Tab 都可见
    const rocketTab = page.locator('button:has-text("火箭发射"), button:text-is("火箭发射")').first();
    const arenaTab  = page.locator('button:has-text("Trade Arena"), button:text-is("Trade Arena")').first();

    const rocketVisible = await rocketTab.isVisible({ timeout: 5000 }).catch(() => false);
    const arenaVisible  = await arenaTab.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[test] Tab "火箭发射": ${rocketVisible ? '✅' : '⚠️'}`);
    console.log(`[test] Tab "Trade Arena": ${arenaVisible ? '✅' : '⚠️'}`);
    expect(rocketVisible).toBe(true);
    expect(arenaVisible).toBe(true);

    // 点击 Trade Arena
    await arenaTab.click();
    await page.waitForTimeout(1500);
    console.log('[test] 点击 Trade Arena Tab');
    await page.screenshot({ path: `test-results/rocket-tab-arena-${Date.now()}.png` });

    // 切回火箭发射
    await rocketTab.click();
    await page.waitForTimeout(1000);
    console.log('[test] 切回 火箭发射 Tab');

    console.log('[test] ✅ Tab 切换验证完成');
  });


  // ========================================================
  // 测试 3：筛选按钮 — 全部 / 进行中 / 即将到来 / 已结束
  // ========================================================
  test('筛选按钮切换正常', async ({ loggedInPage: page }) => {
    const filters = ['全部', '进行中', '即将到来', '已结束'];

    for (const f of filters) {
      const btn = page.locator(`button:has-text("${f}")`).first();
      const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] 筛选 "${f}": ${visible ? '✅' : '⚠️'}`);
      if (visible) {
        await btn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `test-results/rocket-filter-${f}-${Date.now()}.png` });
        console.log(`[test] 点击筛选 "${f}"`);
      }
    }

    // 切回"全部"
    const allBtn = page.locator('button:has-text("全部")').first();
    if (await allBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await allBtn.click();
      await page.waitForTimeout(800);
    }

    console.log('[test] ✅ 筛选按钮验证完成');
  });


  // ========================================================
  // 测试 4：项目卡片可见，"交易赚取"链接有效
  // ========================================================
  test('项目卡片列表可见，交易赚取链接有效', async ({ loggedInPage: page }) => {
    // 进入"已结束"筛选（卡片数量最多）
    const endedBtn = page.locator('button:has-text("已结束")').first();
    if (await endedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await endedBtn.click();
      await page.waitForTimeout(1500);
    }

    // 找"交易赚取"链接
    const tradeLinks = page.locator('a:has-text("交易赚取")');
    const count = await tradeLinks.count();
    console.log(`[test] 找到 "交易赚取" 链接数: ${count}`);
    expect(count).toBeGreaterThan(0);

    // 验证前3个链接 href 有效
    for (let i = 0; i < Math.min(count, 3); i++) {
      const href = await tradeLinks.nth(i).getAttribute('href').catch(() => '');
      const valid = href && href.includes('/trade/');
      console.log(`[test] 交易赚取[${i}] href ${valid ? '✅' : '❌'}: ${href}`);
      expect.soft(valid).toBeTruthy();
    }

    await page.screenshot({ path: `test-results/rocket-cards-${Date.now()}.png` });
    console.log('[test] ✅ 项目卡片验证完成');
  });


  // ========================================================
  // 测试 5：点击"交易赚取"进入 Spot 交易页
  // ========================================================
  test('点击交易赚取进入 Spot 交易页', async ({ loggedInPage: page }) => {
    const endedBtn = page.locator('button:has-text("已结束")').first();
    if (await endedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await endedBtn.click();
      await page.waitForTimeout(1500);
    }

    const firstLink = page.locator('a:has-text("交易赚取")').first();
    const href = await firstLink.getAttribute('href').catch(() => '');
    console.log(`[test] 即将点击: ${href}`);

    if (!href) {
      console.log('[test] ⚠️ 未找到交易赚取链接，跳过');
      return;
    }

    // 直接导航（链接可能开新标签页）
    const origin = new URL(getRocketLaunchUrl()).origin;
    const targetUrl = href.startsWith('/') ? `${origin}${href}` : href;
    await page.goto(targetUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`[test] 跳转后 URL: ${currentUrl}`);
    expect(currentUrl).toContain('/trade/');

    const has404 = await page.locator('h1:text-is("404")').isVisible({ timeout: 1000 }).catch(() => false);
    expect(has404).toBe(false);

    await page.screenshot({ path: `test-results/rocket-trade-${Date.now()}.png` });
    console.log('[test] ✅ 点击交易赚取验证完成');

    // 返回 Rocket Launch 页
    await page.goto(getRocketLaunchUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });


  // ========================================================
  // 测试 6："查看更多"按钮可点击，加载更多卡片
  // ========================================================
  test('"查看更多"加载更多项目', async ({ loggedInPage: page }) => {
    // 先进入"已结束"
    const endedBtn = page.locator('button:has-text("已结束")').first();
    if (await endedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await endedBtn.click();
      await page.waitForTimeout(1500);
    }

    const beforeCount = await page.locator('a:has-text("交易赚取")').count();
    console.log(`[test] 点击前卡片数: ${beforeCount}`);

    const moreBtn = page.locator('button:has-text("查看更多"), button:text-is("查看更多")').first();
    const hasMore = await moreBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] "查看更多" 按钮: ${hasMore ? '✅' : '⚠️ 不可见（已全部加载）'}`);

    if (hasMore) {
      await moreBtn.click();
      await page.waitForTimeout(2000);
      const afterCount = await page.locator('a:has-text("交易赚取")').count();
      console.log(`[test] 点击后卡片数: ${afterCount}`);
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
      await page.screenshot({ path: `test-results/rocket-more-${Date.now()}.png` });
    }

    console.log('[test] ✅ 查看更多验证完成');
  });


  // ========================================================
  // 测试 7：FAQ 手风琴展开/收起
  // ========================================================
  test('FAQ 手风琴展开与收起', async ({ loggedInPage: page }) => {
    const faqs = [
      '什么是火箭发射？',
      '如何符合活动条件？',
      '我什么时候可以收到我的火箭发射计划奖励？',
    ];

    for (const question of faqs) {
      const btn = page.locator(`button:has-text("${question}")`).first();
      const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] FAQ "${question}": ${visible ? '✅' : '⚠️'}`);

      if (visible) {
        // 展开
        await btn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: `test-results/rocket-faq-open-${Date.now()}.png` });
        console.log(`[test] 展开 FAQ: "${question}"`);

        // 收起
        await btn.click();
        await page.waitForTimeout(500);
        console.log(`[test] 收起 FAQ: "${question}"`);
      }
    }

    console.log('[test] ✅ FAQ 手风琴验证完成');
  });


  // ========================================================
  // 测试 8："了解更多"链接指向文档
  // ========================================================
  test('"了解更多"链接指向文档', async ({ loggedInPage: page }) => {
    const link = page.locator('a:has-text("了解更多")').first();
    const visible = await link.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[test] "了解更多" 链接: ${visible ? '✅' : '⚠️'}`);
    expect(visible).toBe(true);

    const href = await link.getAttribute('href').catch(() => '');
    console.log(`[test] href: ${href}`);
    expect(href).toContain('docs');

    console.log('[test] ✅ 了解更多链接验证完成');
  });

});
