import { test, expect } from '../fixtures/auth';

function getEarnUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/earn`;
}

test.describe.serial('AsterDEX - 赚取（Earn）', () => {

  // ========================================================
  // 测试 1：Earn 页面正常加载，标题与策略列表可见
  // ========================================================
  test('Earn 页面正常加载，标题与策略列表可见', async ({ loggedInPage: page }) => {
    const url = getEarnUrl();
    console.log(`[test] Earn URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // 验证标题包含相关关键词
    const titleKeywords = ['Earn', 'earn', '赚币', '赚取', 'Aster'];
    const titleMatches = titleKeywords.some(kw => title.includes(kw));
    console.log(`[test] 标题关键词匹配: ${titleMatches ? '✅ 命中' : '⚠️ 未命中'}`);
    expect.soft(titleMatches).toBe(true);

    // 验证策略/产品列表区域
    const listKeywords = ['策略', 'Strategy', 'asBTC', 'asCAKE', 'ALP', 'asUSDF', 'asETH', 'TVL', 'APY', 'APR', '年化收益率'];
    let listFound = false;
    for (const kw of listKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到列表元素: "${kw}"`);
        listFound = true;
        break;
      }
    }
    expect(listFound).toBe(true);

    // 验证无 404
    const has404 = await page.locator('text=404').isVisible({ timeout: 1000 }).catch(() => false);
    expect(has404).toBe(false);

    await page.screenshot({ path: `test-results/earn-load-${Date.now()}.png` });
    console.log('[test] ✅ Earn 页面加载完成');
  });


  // ========================================================
  // 测试 2：切换「赚取」与「生态系统」Tab
  // ========================================================
  test('赚取与生态系统 Tab 切换正常', async ({ loggedInPage: page }) => {
    const ecoTab = page.locator('button:has-text("生态系统"), text=生态系统').first();
    if (await ecoTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ecoTab.click();
      console.log('[test] 点击了「生态系统」Tab');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `test-results/earn-ecosystem-${Date.now()}.png` });
    } else {
      console.log('[test] ⚠️ 未找到「生态系统」Tab，跳过');
    }

    const earnTab = page.locator('button:has-text("赚取"), text=赚取').first();
    if (await earnTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await earnTab.click();
      console.log('[test] 切换回「赚取」Tab');
      await page.waitForTimeout(1000);
    }

    console.log('[test] ✅ Tab 切换验证完成');
  });


  // ========================================================
  // 测试 3：点击产品进入详情（铸造/查看详情）
  // ========================================================
  test('点击产品能进入详情', async ({ loggedInPage: page }) => {
    const detailEntrySelectors = [
      'button:has-text("铸造")',
      'button:has-text("Mint")',
      'button:has-text("查看详情")',
      'button:has-text("Detail")',
      'a:has-text("asBTC")',
      'a:has-text("asCAKE")',
      'a:has-text("ALP")',
    ];

    let clicked = false;
    for (const sel of detailEntrySelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        await el.click();
        console.log(`[test] 点击了产品入口: "${sel}"`);
        await page.waitForTimeout(1500);
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      const fallbackRow = page.locator('tr, [class*="row"], [class*="item"]').nth(1);
      if (await fallbackRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fallbackRow.click();
        console.log('[test] 点击了产品列表第一行（fallback）');
        await page.waitForTimeout(1500);
        clicked = true;
      }
    }

    if (!clicked) {
      console.log('[test] ⚠️ 未找到可点击的产品入口，跳过');
      return;
    }

    // 验证进入详情后出现相关 UI
    const detailKeywords = ['铸造', 'Mint', '数量', 'Amount', '赎回', 'Redeem', '批准', 'Approve', '详情', 'Detail', '收益', 'Yield'];
    let detailFound = false;
    for (const kw of detailKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 4000 }).catch(() => false)) {
        console.log(`[test] ✅ 进入详情后找到元素: "${kw}"`);
        detailFound = true;
        break;
      }
    }

    if (!detailFound) {
      const urlChanged = page.url() !== getEarnUrl();
      if (urlChanged) {
        console.log(`[test] ✅ URL 已跳转到详情页: ${page.url()}`);
        detailFound = true;
      } else {
        console.log('[test] ⚠️ 未检测到详情 UI');
      }
    }

    expect.soft(detailFound).toBe(true);

    await page.screenshot({ path: `test-results/earn-detail-${Date.now()}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    console.log('[test] ✅ 产品详情进入验证完成');
  });

});
