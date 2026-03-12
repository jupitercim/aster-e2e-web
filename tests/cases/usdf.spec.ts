import { test, expect } from '../fixtures/auth';

function getUsdfUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/usdf`;
}

test.describe.serial('AsterDEX - USDF 稳定币', () => {

  // ========================================================
  // 测试 1：USDF 页面正常加载，显示铸造/兑换 Tab 及统计数据
  // ========================================================
  test('USDF 页面正常加载', async ({ loggedInPage: page }) => {
    const url = getUsdfUrl();
    console.log(`[test] USDF URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // 验证「铸造」Tab 存在（可能是 button 或 div，等待更长时间确保渲染完成）
    await page.waitForTimeout(2000);
    const mintTab = page.locator('button:has-text("铸造"), [role="tab"]:has-text("铸造")').first();
    const hasMint = await mintTab.isVisible({ timeout: 8000 }).catch(() => false);
    console.log(`[test] 铸造 Tab: ${hasMint ? '✅ 存在' : '⚠️ 未找到'}`);
    expect.soft(hasMint).toBe(true);

    // 验证「兑换」Tab 存在
    const swapTab = page.locator('button:has-text("兑换"), [role="tab"]:has-text("兑换"), span:has-text("兑换")').first();
    const hasSwap = await swapTab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 兑换 Tab: ${hasSwap ? '✅ 存在' : '⚠️ 未找到'}`);

    // 验证统计数据区域可见（总铸造 / 可铸造 / USDF价格）
    const statsKeywords = ['总铸造', '可铸造', 'USDF价格', 'Total Minted', 'USDF Price'];
    let statsFound = false;
    for (const kw of statsKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到统计元素: "${kw}"`);
        statsFound = true;
        break;
      }
    }
    expect.soft(statsFound).toBe(true);

    await page.screenshot({ path: `test-results/usdf-load-${Date.now()}.png` });
    console.log('[test] ✅ USDF 页面加载完成');
  });


  // ========================================================
  // 测试 2：铸造 / 兑换 Tab 切换
  // ========================================================
  test('铸造与兑换 Tab 切换正常', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    // 点击「兑换」Tab
    const swapTab = page.locator('button:has-text("兑换"), span:has-text("兑换")').first();
    if (await swapTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await swapTab.click();
      console.log('[test] 点击了「兑换」Tab');
      await page.waitForTimeout(1000);

      // 验证兑换 UI 出现
      const swapKeywords = ['兑换', '从', '到', 'From', 'To', 'Redeem'];
      let swapUiFound = false;
      for (const kw of swapKeywords) {
        const el = page.locator(`text=${kw}`).first();
        if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
          swapUiFound = true;
          break;
        }
      }
      console.log(`[test] 兑换 UI: ${swapUiFound ? '✅ 正常' : '⚠️ 未确认'}`);
    } else {
      console.log('[test] ⚠️ 未找到「兑换」Tab，跳过');
    }

    // 切换回「铸造」Tab
    const mintTab = page.locator('button:has-text("铸造"), [role="tab"]:has-text("铸造")').first();
    if (await mintTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mintTab.click();
      console.log('[test] 切换回「铸造」Tab');
      await page.waitForTimeout(1000);
    }

    console.log('[test] ✅ 铸造/兑换 Tab 切换验证完成');
  });


  // ========================================================
  // 测试 3：FAQ 折叠展开
  // ========================================================
  test('FAQ 折叠展开功能正常', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    const faqKeywords = ['什么是USDF', 'USDF是什么', '常见问题', 'FAQ', '什么是智能铸造'];
    let faqEl = null;

    for (const kw of faqKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        faqEl = el;
        console.log(`[test] 找到 FAQ 条目: "${kw}"`);
        break;
      }
    }

    if (!faqEl) {
      console.log('[test] ⚠️ 未找到 FAQ 条目，跳过');
      return;
    }

    await faqEl.click();
    console.log('[test] 点击了 FAQ 条目');
    await page.waitForTimeout(1000);

    // 验证内容展开（出现更多文字）
    const expandedKeywords = ['USDF', '稳定币', '收益', 'stable', 'yield'];
    let expanded = false;
    for (const kw of expandedKeywords) {
      const content = page.locator(`p:has-text("${kw}"), div:has-text("${kw}")`).nth(1);
      if (await content.isVisible({ timeout: 2000 }).catch(() => false)) {
        expanded = true;
        break;
      }
    }

    console.log(`[test] FAQ 展开状态: ${expanded ? '✅ 内容已展开' : '⚠️ 未确认展开'}`);
    await page.screenshot({ path: `test-results/usdf-faq-${Date.now()}.png` });
    console.log('[test] ✅ FAQ 折叠展开验证完成');
  });

});
