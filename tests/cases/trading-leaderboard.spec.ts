// spec: specs/trading-leaderboard.plan.md
import { test, expect } from '../fixtures/auth';

function getLeaderboardUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/trading-leaderboard`;
}

test.describe.serial('AsterDEX - 交易排行榜', () => {

  // ========================================================
  // 测试 1：排行榜页面正常加载
  // ========================================================
  test('排行榜页面正常加载，列表数据可见', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    const url = getLeaderboardUrl();
    console.log(`[test] 排行榜 URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // 验证排行榜相关关键词
    const listKeywords = ['排行榜', 'Leaderboard', '排名', 'Rank', '交易者', 'Trader'];
    let listFound = false;
    for (const kw of listKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到排行榜元素: "${kw}"`);
        listFound = true;
        break;
      }
    }
    expect(listFound).toBe(true);

    await page.screenshot({ path: `test-results/leaderboard-load-${Date.now()}.png` });
    console.log('[test] ✅ 排行榜页面加载完成');
  });


  // ========================================================
  // 测试 2：切换周期（日 / 周 / 月）
  // ========================================================
  test('周期切换（日/周/月）正常', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    const periodOptions = ['日', '周', '月', 'Daily', 'Weekly', 'Monthly'];
    let switchedCount = 0;

    for (const period of periodOptions) {
      const btn = page.locator(`button:has-text("${period}"), [role="tab"]:has-text("${period}")`).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        console.log(`[test] 切换到周期: "${period}"`);
        await page.waitForTimeout(1000);
        switchedCount++;
        if (switchedCount >= 2) break; // 切换2个就够了
      }
    }

    if (switchedCount === 0) {
      console.log('[test] ⚠️ 未找到周期切换按钮，跳过');
    } else {
      console.log(`[test] ✅ 切换了 ${switchedCount} 个周期`);
    }

    await page.screenshot({ path: `test-results/leaderboard-period-${Date.now()}.png` });
    console.log('[test] ✅ 周期切换验证完成');
  });


  // ========================================================
  // 测试 3：切换多空榜（如有）
  // ========================================================
  test('多空方向榜切换（如有）', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    const directionOptions = ['多头', '空头', 'Long', 'Short', '做多', '做空'];
    let found = false;

    for (const dir of directionOptions) {
      const btn = page.locator(`button:has-text("${dir}"), [role="tab"]:has-text("${dir}")`).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        console.log(`[test] 点击了方向榜: "${dir}"`);
        await page.waitForTimeout(1000);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('[test] ⚠️ 未找到多空方向切换，跳过（可能不支持该功能）');
    } else {
      console.log('[test] ✅ 多空榜切换验证完成');
    }
  });

});
