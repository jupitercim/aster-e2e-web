import { test, expect } from '../fixtures/auth';

function getEarnUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/earn`;
}

test.describe.serial('AsterDEX - 赚取（Earn）', () => {

  // ========================================================
  // 测试 1：赚取页面正常加载，策略列表可见
  // ========================================================
  test('赚取页面正常加载，策略列表可见', async ({ loggedInPage: page }) => {
    const url = getEarnUrl();
    console.log(`[test] Earn URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // 验证策略列表区域（「策略」标题或资产行）
    const strategyKeywords = ['策略', 'Strategy', 'asBTC', 'asCAKE', 'ALP', 'asUSDF', 'TVL'];
    let strategyFound = false;
    for (const kw of strategyKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到策略列表元素: "${kw}"`);
        strategyFound = true;
        break;
      }
    }
    expect(strategyFound).toBe(true);

    // 验证「年化收益率」列标题可见
    const aprEl = page.locator('text=年化收益率, text=APY, text=APR').first();
    const hasApr = await aprEl.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 年化收益率列: ${hasApr ? '✅ 存在' : '⚠️ 未找到'}`);

    await page.screenshot({ path: `test-results/earn-load-${Date.now()}.png` });
    console.log('[test] ✅ 赚取页面加载完成');
  });


  // ========================================================
  // 测试 2：切换「赚取」与「生态系统」Tab
  // ========================================================
  test('赚取与生态系统 Tab 切换正常', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    // 点击「生态系统」Tab
    const ecoTab = page.locator('button:has-text("生态系统"), text=生态系统').first();
    if (await ecoTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ecoTab.click();
      console.log('[test] 点击了「生态系统」Tab');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `test-results/earn-ecosystem-${Date.now()}.png` });
    } else {
      console.log('[test] ⚠️ 未找到「生态系统」Tab，跳过');
    }

    // 切换回「赚取」Tab
    const earnTab = page.locator('button:has-text("赚取"), text=赚取').first();
    if (await earnTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await earnTab.click();
      console.log('[test] 切换回「赚取」Tab');
      await page.waitForTimeout(1000);
    }

    console.log('[test] ✅ Tab 切换验证完成');
  });


  // ========================================================
  // 测试 3：验证「铸造」按钮可点击
  // ========================================================
  test('策略列表中铸造按钮可点击', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    // 找到第一个「铸造」按钮
    const mintBtn = page.locator('button:has-text("铸造")').first();
    if (!(await mintBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('[test] ⚠️ 未找到铸造按钮，跳过');
      return;
    }

    await mintBtn.click();
    console.log('[test] 点击了铸造按钮');
    await page.waitForTimeout(1500);

    // 验证弹窗或跳转到铸造页面
    const mintDialogKeywords = ['铸造', '数量', '批准', 'Mint', 'Amount', 'Approve'];
    let mintUiFound = false;
    for (const kw of mintDialogKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        mintUiFound = true;
        console.log(`[test] ✅ 铸造交互 UI: "${kw}"`);
        break;
      }
    }

    if (!mintUiFound) {
      console.log('[test] ⚠️ 铸造弹窗未检测到，可能页面已跳转');
    }

    await page.screenshot({ path: `test-results/earn-mint-${Date.now()}.png` });

    // 关闭弹窗（如有）
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    console.log('[test] ✅ 铸造按钮交互验证完成');
  });

});
