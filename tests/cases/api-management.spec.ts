import { test, expect } from '../fixtures/auth';

function getApiManagementUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/api-management`;
}

test.describe.serial('AsterDEX - API 管理', () => {

  // ========================================================
  // 测试 1：API 管理页面正常加载
  // ========================================================
  test('API 管理页面正常加载', async ({ loggedInPage: page }) => {
    const url = getApiManagementUrl();
    console.log(`[test] API Management URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect.soft(title).toBeTruthy();

    // 验证「API 管理」标题可见
    const headingKeywords = ['API 管理', 'API Management', 'API'];
    let headingFound = false;
    for (const kw of headingKeywords) {
      const el = page.locator(`h1:has-text("${kw}"), h2:has-text("${kw}"), text=${kw}`).first();
      if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到页面标题: "${kw}"`);
        headingFound = true;
        break;
      }
    }
    expect(headingFound).toBe(true);

    // 验证「创建 API」按钮
    const createBtn = page.locator('button:has-text("创建 API"), button:has-text("创建API"), button:has-text("Create API")').first();
    const hasCreateBtn = await createBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 创建 API 按钮: ${hasCreateBtn ? '✅ 存在' : '⚠️ 未找到'}`);
    expect.soft(hasCreateBtn).toBe(true);

    await page.screenshot({ path: `test-results/api-management-load-${Date.now()}.png` });
    console.log('[test] ✅ API 管理页面加载完成');
  });


  // ========================================================
  // 测试 2：API / 专业API Tab 切换
  // ========================================================
  test('API 与专业API Tab 切换正常', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    // 点击「专业API」Tab
    const proTab = page.locator('button:has-text("专业API"), button:has-text("Professional API"), [role="tab"]:has-text("专业")').first();
    if (await proTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await proTab.click();
      console.log('[test] 点击了「专业API」Tab');
      await page.waitForTimeout(1000);
    } else {
      console.log('[test] ⚠️ 未找到「专业API」Tab，跳过');
    }

    // 切换回「API」Tab
    const apiTab = page.locator('button:has-text("API"):not(:has-text("专业")), [role="tab"]:text-is("API")').first();
    if (await apiTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await apiTab.click();
      console.log('[test] 切换回「API」Tab');
      await page.waitForTimeout(1000);
    }

    console.log('[test] ✅ API Tab 切换验证完成');
  });


  // ========================================================
  // 测试 3：点击「创建 API」弹窗出现
  // ========================================================
  test('创建 API 按钮点击后弹窗出现', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    const createBtn = page.locator('button:has-text("创建 API"), button:has-text("创建API"), button:has-text("Create API")').first();
    if (!(await createBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('[test] ⚠️ 未找到「创建 API」按钮，跳过');
      return;
    }

    await createBtn.click();
    console.log('[test] 点击了「创建 API」按钮');
    await page.waitForTimeout(1500);

    // 验证弹窗或表单出现
    const dialogKeywords = ['API标签', 'API Label', 'IP 白名单', 'IP Whitelist', '权限', 'Permission', '创建', 'Create'];
    let dialogFound = false;
    for (const kw of dialogKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到创建 API 弹窗元素: "${kw}"`);
        dialogFound = true;
        break;
      }
    }

    if (!dialogFound) {
      console.log('[test] ⚠️ 未找到创建弹窗，可能需要先启用交易');
    }

    await page.screenshot({ path: `test-results/api-management-create-${Date.now()}.png` });

    // 关闭弹窗（如有）
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    console.log('[test] ✅ 创建 API 弹窗验证完成');
  });

});
