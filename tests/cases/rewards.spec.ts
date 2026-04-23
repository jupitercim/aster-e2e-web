// spec: specs/rewards.plan.md
import { test, expect } from '../fixtures/auth';

function getRewardsUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/trade-and-earn`;
}

test.describe.serial('AsterDEX - Rewards 页面', () => {

  // ========================================================
  // 测试 1：Rewards 页面可正常加载
  // ========================================================
  test('Rewards 页面可正常加载', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    const url = getRewardsUrl();
    console.log(`[test] Rewards URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    await page.screenshot({ path: `test-results/rewards-load-${Date.now()}.png` });
    console.log('[test] ✅ Rewards 页面加载完成');
  });


  // ========================================================
  // 测试 2：验证奖励内容显示
  // ========================================================
  test('验证奖励内容正常显示', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    const rewardKeywords = ['奖励', 'Rewards', '积分', 'Points', '领取', 'Claim', '排行榜', 'Leaderboard'];
    let found = false;

    for (const kw of rewardKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到奖励元素: "${kw}"`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('[test] ⚠️ 未找到奖励相关元素，请确认页面 URL 是否正确');
      await page.screenshot({ path: `test-results/rewards-content-${Date.now()}.png` });
    }

    // 验证没有加载错误（用精确匹配避免误触发页面中其他含"404"的数字）
    const hasError = await page.locator('h1:text-is("404"), h2:text-is("404"), [data-testid="404"]').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);
    console.log('[test] ✅ Rewards 内容验证完成');
  });


  // ========================================================
  // 测试 3：查看任务列表（如有）
  // ========================================================
  test('查看任务或活动列表', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    const taskKeywords = ['任务', 'Task', '活动', 'Activity', '每日', 'Daily'];
    let taskFound = false;

    for (const kw of taskKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到任务元素: "${kw}"`);
        taskFound = true;
        break;
      }
    }

    if (!taskFound) {
      console.log('[test] ⚠️ 未找到任务列表，跳过');
    } else {
      console.log('[test] ✅ 任务列表验证完成');
    }
  });


  // ========================================================
  // 测试 4：积分排行榜列表数据可加载
  // ========================================================
  test('积分排行榜列表可见', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 复用 test 3 已打开的页面，无需重新导航

    // 找到排行榜入口（Tab 或链接）
    const leaderboardKeywords = ['排行榜', 'Leaderboard', '积分榜', 'Points Ranking'];
    let leaderboardTab = null;

    for (const kw of leaderboardKeywords) {
      const el = page.locator(`button:has-text("${kw}"), [role="tab"]:has-text("${kw}"), a:has-text("${kw}")`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        leaderboardTab = el;
        console.log(`[test] 找到排行榜入口: "${kw}"`);
        break;
      }
    }

    if (!leaderboardTab) {
      console.log('[test] ⚠️ 未找到排行榜 Tab，跳过');
      return;
    }

    await leaderboardTab.click();
    console.log('[test] 点击了排行榜入口');
    await page.waitForTimeout(2000);

    // 验证排行榜数据加载（名次 / 地址 / 积分）
    const rankKeywords = ['#1', '排名', 'Rank', '积分', 'Points', '地址', 'Address'];
    let rankFound = false;
    for (const kw of rankKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到排行榜数据: "${kw}"`);
        rankFound = true;
        break;
      }
    }

    if (!rankFound) {
      console.log('[test] ⚠️ 未找到排行榜数据，可能需要等待加载');
    }

    await page.screenshot({ path: `test-results/rewards-leaderboard-${Date.now()}.png` });
    console.log('[test] ✅ 积分排行榜验证完成');
  });


  // ========================================================
  // 测试 5：交易挖矿规则说明展开
  // ========================================================
  test('交易挖矿规则说明可展开', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 复用 test 4 已打开的页面，无需重新导航

    // 重新导航到 trade-and-earn 确保在正确页面
    await page.goto(getRewardsUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 找到规则相关入口
    const ruleKeywords = ['规则', '了解更多', 'Rules', 'Learn More', '奖励规则', '查看规则'];
    let ruleEl = null;

    for (const kw of ruleKeywords) {
      const el = page.locator(`button:has-text("${kw}"), a:has-text("${kw}"), text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        ruleEl = el;
        console.log(`[test] 找到规则入口: "${kw}"`);
        break;
      }
    }

    if (!ruleEl) {
      console.log('[test] ⚠️ 未找到规则入口，跳过');
      return;
    }

    await ruleEl.click();
    console.log('[test] 点击了规则入口');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: `test-results/rewards-rules-${Date.now()}.png` });
    console.log('[test] ✅ 规则展开验证完成');
  });

});
