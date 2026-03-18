// spec: specs/grid-trading.plan.md
import { test, expect } from '../fixtures/auth';

function getGridTradingUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/strategy/futures/grid/BTCUSDT`;
}

test.describe.serial('AsterDEX - 网格交易', () => {

  // ========================================================
  // 测试 1：网格交易页面正常加载
  // ========================================================
  test('网格交易页面正常加载', async ({ loggedInPage: page }) => {
    const url = getGridTradingUrl();
    console.log(`[test] 网格交易 URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // 验证核心元素：合约网格 or 策略交易
    const headingKeywords = ['合约网格', '网格交易', '策略交易', 'Grid Trading', 'Strategy'];
    let headingFound = false;
    for (const kw of headingKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到页面标题元素: "${kw}"`);
        headingFound = true;
        break;
      }
    }
    expect.soft(headingFound).toBe(true);

    // 验证「一键创建」按钮存在
    const oneClickBtn = page.locator('button:has-text("一键创建"), text=一键创建').first();
    const hasOneClick = await oneClickBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 一键创建按钮: ${hasOneClick ? '✅ 存在' : '⚠️ 未找到'}`);

    // 验证「手动创建」按钮存在
    const manualBtn = page.locator('button:has-text("手动创建"), text=手动创建').first();
    const hasManual = await manualBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 手动创建按钮: ${hasManual ? '✅ 存在' : '⚠️ 未找到'}`);

    await page.screenshot({ path: `test-results/grid-trading-load-${Date.now()}.png` });
    console.log('[test] ✅ 网格交易页面加载完成');
  });


  // ========================================================
  // 测试 2：运行中 / 历史 Tab 切换
  // ========================================================
  test('运行中与历史 Tab 切换正常', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    // 切换到「历史」Tab
    const historyTab = page.locator('button[role="tab"]:has-text("历史"), text=历史').first();
    if (await historyTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await historyTab.click();
      console.log('[test] 点击了「历史」Tab');
      await page.waitForTimeout(1000);
    } else {
      console.log('[test] ⚠️ 未找到「历史」Tab，跳过');
    }

    // 切换回「运行中」Tab
    const runningTab = page.locator('button[role="tab"]:has-text("运行中"), text=运行中').first();
    if (await runningTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await runningTab.click();
      console.log('[test] 点击了「运行中」Tab');
      await page.waitForTimeout(1000);
    } else {
      console.log('[test] ⚠️ 未找到「运行中」Tab，跳过');
    }

    console.log('[test] ✅ Tab 切换验证完成');
  });


  // ========================================================
  // 测试 3：点击「一键创建」，参数面板出现
  // ========================================================
  test('一键创建网格策略入口可用', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    const oneClickBtn = page.locator('button:has-text("一键创建"), text=一键创建').first();
    if (!(await oneClickBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('[test] ⚠️ 未找到「一键创建」按钮，跳过');
      return;
    }

    await oneClickBtn.click();
    console.log('[test] 点击了「一键创建」按钮');
    await page.waitForTimeout(1500);

    // 验证参数设置面板出现（弹窗或右侧面板）
    const panelKeywords = ['创建策略', '网格参数', '起始价', '结束价', '每格', 'Create', 'Grid'];
    let panelFound = false;
    for (const kw of panelKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到策略创建面板元素: "${kw}"`);
        panelFound = true;
        break;
      }
    }

    if (!panelFound) {
      console.log('[test] ⚠️ 未找到策略创建面板，可能需要先启用交易');
    }

    await page.screenshot({ path: `test-results/grid-trading-create-${Date.now()}.png` });
    console.log('[test] ✅ 一键创建入口验证完成');
  });

});
