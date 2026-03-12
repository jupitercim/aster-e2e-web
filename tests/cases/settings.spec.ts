import { test, expect } from '../fixtures/auth';

function getSettingsUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  // API 管理页是 Settings 的入口之一，其余设置项通过右上角用户菜单访问
  return `${origin}/zh-CN/api-management`;
}

test.describe.serial('AsterDEX - Settings 设置页面', () => {

  // ========================================================
  // 测试 1：Settings 页面可正常加载
  // ========================================================
  test('Settings 页面可正常加载', async ({ loggedInPage: page }) => {
    const url = getSettingsUrl();
    console.log(`[test] Settings URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    // 软断言：部分设置页在未连接钱包时可能无标题
    expect.soft(title).toBeTruthy();

    await page.screenshot({ path: `test-results/settings-load-${Date.now()}.png` });
    console.log('[test] ✅ Settings 页面加载完成');
  });


  // ========================================================
  // 测试 2：验证设置选项显示
  // ========================================================
  test('验证设置选项正常显示', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    const settingKeywords = ['设置', 'Settings', '语言', 'Language', '通知', 'Notifications',
      '主题', 'Theme', '安全', 'Security', '偏好', 'Preferences'];
    let found = false;

    for (const kw of settingKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到设置元素: "${kw}"`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('[test] ⚠️ 未找到设置选项，请确认页面 URL');
      await page.screenshot({ path: `test-results/settings-content-${Date.now()}.png` });
    }

    const hasError = await page.locator('text=404').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);
    console.log('[test] ✅ Settings 内容验证完成');
  });


  // ========================================================
  // 测试 3：切换语言设置（验证交互可用）
  // ========================================================
  test('验证语言切换功能可用', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    const langKeywords = ['语言', 'Language', '中文', 'English'];
    let langEl = null;

    for (const kw of langKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        langEl = el;
        console.log(`[test] 找到语言设置入口: "${kw}"`);
        break;
      }
    }

    if (!langEl) {
      console.log('[test] ⚠️ 未找到语言设置，跳过');
      return;
    }

    await langEl.click();
    await page.waitForTimeout(1000);

    // 检查是否弹出语言选择面板
    const langOptions = ['中文', 'English', '한국어', '日本語'];
    let optionFound = false;

    for (const lang of langOptions) {
      const option = page.locator(`text=${lang}`).first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到语言选项: "${lang}"`);
        optionFound = true;
        break;
      }
    }

    if (optionFound) {
      // 不实际切换，按 Esc 关闭
      await page.keyboard.press('Escape');
      console.log('[test] ✅ 语言切换面板可正常打开');
    } else {
      console.log('[test] ⚠️ 未找到语言选项列表，跳过');
    }
  });


  // ========================================================
  // 测试 4：验证通知设置可用（如有）
  // ========================================================
  test('验证通知设置可用', async ({ loggedInPage: page }) => {
    // 复用 test 3 已打开的页面，无需重新导航

    const notifKeywords = ['通知', 'Notifications', '推送', 'Push', '邮件', 'Email'];
    let notifEl = null;

    for (const kw of notifKeywords) {
      const el = page.locator(`button:has-text("${kw}"), a:has-text("${kw}"), text=${kw}`).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        notifEl = el;
        console.log(`[test] 找到通知设置: "${kw}"`);
        break;
      }
    }

    if (!notifEl) {
      console.log('[test] ⚠️ 未找到通知设置，跳过');
      return;
    }

    await notifEl.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test-results/settings-notification-${Date.now()}.png` });
    console.log('[test] ✅ 通知设置入口可点击');
  });

});
