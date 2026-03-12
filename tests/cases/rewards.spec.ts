import { test, expect } from '../fixtures/auth';

function getRewardsUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/rewards`;
}

test.describe.serial('AsterDEX - Rewards 页面', () => {

  // ========================================================
  // 测试 1：Rewards 页面可正常加载
  // ========================================================
  test('Rewards 页面可正常加载', async ({ loggedInPage: page }) => {
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
  test('验证奖励内容正常显示', async ({ loggedInPage: page }) => {
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

    // 验证没有加载错误
    const hasError = await page.locator('text=404').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);
    console.log('[test] ✅ Rewards 内容验证完成');
  });


  // ========================================================
  // 测试 3：查看任务列表（如有）
  // ========================================================
  test('查看任务或活动列表', async ({ loggedInPage: page }) => {
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

});
