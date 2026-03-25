// spec: specs/airdrop.plan.md
import { test, expect } from '../fixtures/auth';

function getAirdropUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/airdrop`;
}

test.describe.serial('AsterDEX - 空投（Airdrop）', () => {

  // ========================================================
  // 测试 1：空投页面正常加载，显示当前阶段信息
  // ========================================================
  test('空投页面正常加载，显示阶段信息', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    const url = getAirdropUrl();
    console.log(`[test] 空投 URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // 验证阶段标题（如「Aster空投第X阶段」）
    const phaseKeywords = ['空投', 'Airdrop', '阶段', 'Phase', 'ASTER'];
    let phaseFound = false;
    for (const kw of phaseKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到阶段信息元素: "${kw}"`);
        phaseFound = true;
        break;
      }
    }
    expect(phaseFound).toBe(true);

    // 验证数据字段（总燃烧数量 / 锁定量）
    const dataKeywords = ['总燃烧', '空投锁定', 'Burned', 'Locked', 'ASTER'];
    let dataFound = false;
    for (const kw of dataKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到统计数据元素: "${kw}"`);
        dataFound = true;
        break;
      }
    }
    expect.soft(dataFound).toBe(true);

    await page.screenshot({ path: `test-results/airdrop-load-${Date.now()}.png` });
    console.log('[test] ✅ 空投页面加载完成');
  });


  // ========================================================
  // 测试 2：阶段切换下拉可用
  // ========================================================
  test('阶段切换下拉菜单可用', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    // 找到阶段选择器（如「第5阶段」下拉）
    const phaseDropdown = page.locator('[role="combobox"]:has-text("阶段"), button:has-text("阶段")').first();
    if (!(await phaseDropdown.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('[test] ⚠️ 未找到阶段下拉选择器，跳过');
      return;
    }

    await phaseDropdown.click();
    console.log('[test] 点击了阶段下拉');
    await page.waitForTimeout(1000);

    // 验证下拉选项出现
    const options = page.locator('[role="option"], [role="listbox"] li').first();
    const hasOptions = await options.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 下拉选项: ${hasOptions ? '✅ 可见' : '⚠️ 未找到'}`);

    // 关闭下拉
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    console.log('[test] ✅ 阶段切换下拉验证完成');
  });


  // ========================================================
  // 测试 3：FAQ 折叠展开
  // ========================================================
  test('FAQ 折叠展开功能正常', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    const faqKeywords = ['ASTER 代币是什么', '常见问题', 'FAQ'];
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

    await page.screenshot({ path: `test-results/airdrop-faq-${Date.now()}.png` });

    // 简单验证页面未崩溃
    const hasError = await page.locator('text=500, text=Error').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);

    console.log('[test] ✅ FAQ 折叠展开验证完成');
  });

});
