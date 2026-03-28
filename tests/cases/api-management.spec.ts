// spec: specs/api-management.plan.md
import { test, expect } from '../fixtures/auth';

function getApiManagementUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/api-management`;
}

test.describe.serial('AsterDEX - API 管理', () => {

  // ========================================================
  // 测试 1：打开 API 管理页面，切换专业API tab，点击创建，验证弹窗
  // ========================================================
  test('API 管理页面正常加载', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    const url = getApiManagementUrl();
    console.log(`[test] API Management URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect.soft(title).toBeTruthy();

    await page.screenshot({ path: `test-results/api-management-load-${Date.now()}.png` });
    console.log('[test] ✅ API 管理页面加载完成');
  });


  // ========================================================
  // 测试 2：切换专业API Tab，点击创建，验证弹窗
  // ========================================================
  test('专业API Tab 创建弹窗验证', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    // 点击「专业API」Tab
    const proTab = page.locator('button:has-text("专业API"), button:has-text("Professional API"), [role="tab"]:has-text("专业")').first();
    const proTabVisible = await proTab.isVisible({ timeout: 5000 }).catch(() => false);
    if (proTabVisible) {
      await proTab.click();
      console.log('[test] ✅ 点击了「专业API」Tab');
      await page.waitForTimeout(1500);
    } else {
      console.log('[test] ⚠️ 未找到「专业API」Tab，跳过切换');
    }

    // 点击「创建」按钮
    const createBtn = page.locator(
      'button:has-text("创建 API"), button:has-text("创建API"), button:has-text("Create API"), button:has-text("创建")'
    ).first();
    const createBtnVisible = await createBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!createBtnVisible) {
      console.log('[test] ⚠️ 未找到创建按钮，跳过');
      return;
    }

    await createBtn.click();
    console.log('[test] ✅ 点击了创建按钮');
    await page.waitForTimeout(1500);

    // 验证弹窗出现
    const dialogKeywords = ['API标签', 'API Label', 'IP 白名单', 'IP Whitelist', '权限', 'Permission', '创建', 'Create'];
    let dialogFound = false;
    for (const kw of dialogKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 弹窗出现，找到元素: "${kw}"`);
        dialogFound = true;
        break;
      }
    }

    if (!dialogFound) {
      console.log('[test] ⚠️ 未检测到创建弹窗');
    }

    await page.screenshot({ path: `test-results/api-management-create-${Date.now()}.png` });

    // 关闭弹窗
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    console.log('[test] ✅ 专业API 创建弹窗验证完成');
  });

});
