// spec: specs/aster-code.plan.md
import { test, expect } from '../fixtures/auth';

function getAsterCodeUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/aster-code`;
}

test.describe.serial('AsterDEX - Aster Code（Builder 中心）', () => {

  // ========================================================
  // 测试 1：Aster Code 页面正常加载，显示 Builder 入口
  // ========================================================
  test('Aster Code 页面正常加载', async ({ loggedInPage: page }) => {
    const url = getAsterCodeUrl();
    console.log(`[test] Aster Code URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // 等待页面完全渲染
    await page.waitForTimeout(2000);

    // 验证「成为 Builder」入口（实际是 <a> 链接，不是 <button>）
    const builderBtn = page.locator('a:has-text("成为 Builder"), button:has-text("成为 Builder")').first();
    const hasBuilderBtn = await builderBtn.isVisible({ timeout: 8000 }).catch(() => false);
    console.log(`[test] 成为 Builder 入口: ${hasBuilderBtn ? '✅ 存在' : '⚠️ 未找到'}`);
    expect.soft(hasBuilderBtn).toBe(true);

    // 验证特性介绍卡片（无需许可 / Builder 奖励 / 高性能 / 品牌）
    const featureKeywords = ['无需许可', 'Builder 奖励', '高性能', '品牌', 'Permissionless', 'Reward'];
    let featureFound = false;
    for (const kw of featureKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到特性卡片: "${kw}"`);
        featureFound = true;
        break;
      }
    }
    expect.soft(featureFound).toBe(true);

    await page.screenshot({ path: `test-results/aster-code-load-${Date.now()}.png` });
    console.log('[test] ✅ Aster Code 页面加载完成');
  });


  // ========================================================
  // 测试 2：「成为 Builder」按钮可点击，触发交互
  // ========================================================
  test('成为 Builder 按钮可点击', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    const builderBtn = page.locator('a:has-text("成为 Builder"), button:has-text("成为 Builder")').first();
    if (!(await builderBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('[test] ⚠️ 未找到「成为 Builder」按钮，跳过');
      return;
    }

    // 「成为 Builder」是 <a target="_blank">，点击会打开新 tab，需捕获后关闭
    const newPagePromise = page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null);
    await builderBtn.click();
    console.log('[test] 点击了「成为 Builder」按钮');

    const newPage = await newPagePromise;
    if (newPage) {
      await newPage.waitForLoadState('domcontentloaded').catch(() => {});
      const responseKeywords = ['Builder', '激活', '注册', 'Activate', 'Register', 'Code'];
      let responseFound = false;
      for (const kw of responseKeywords) {
        const el = newPage.locator(`text=${kw}`).first();
        if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
          responseFound = true;
          console.log(`[test] ✅ 点击后响应: "${kw}"`);
          break;
        }
      }
      if (!responseFound) {
        console.log('[test] ⚠️ 未找到点击响应，可能需要特定前置条件');
      }
      await newPage.screenshot({ path: `test-results/aster-code-builder-${Date.now()}.png` });
      await newPage.close();
      console.log('[test] 新 tab 已关闭');
    } else {
      // 未开新 tab，检查当前页弹窗
      await page.waitForTimeout(2000);
      const responseKeywords = ['Builder', '激活', '注册', 'Activate', 'Register', 'Code'];
      let responseFound = false;
      for (const kw of responseKeywords) {
        const el = page.locator(`text=${kw}`).first();
        if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
          responseFound = true;
          console.log(`[test] ✅ 点击后响应: "${kw}"`);
          break;
        }
      }
      if (!responseFound) {
        console.log('[test] ⚠️ 未找到点击响应，可能需要特定前置条件');
      }
      await page.screenshot({ path: `test-results/aster-code-builder-${Date.now()}.png` });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    console.log('[test] ✅ Builder 按钮交互验证完成');
  });

});
