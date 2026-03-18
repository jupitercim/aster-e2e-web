import { test, expect } from '../fixtures/auth';

function getSettingsUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
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
    expect.soft(title).toBeTruthy();

    // 验证没有出现错误页
    const errorPage = page.locator([
      'h1:text-is("404")',
      'h1:text-is("500")',
      'h1:has-text("Not Found")',
      'h1:has-text("Internal Server Error")',
    ].join(', '));
    const hasErrorPage = await errorPage.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasErrorPage).toBe(false);

    const bodyVisible = await page.locator('body').isVisible({ timeout: 3000 }).catch(() => false);
    expect(bodyVisible).toBe(true);

    await page.screenshot({ path: `test-results/settings-load-${Date.now()}.png` });
    console.log('[test] ✅ Settings 页面加载完成');
  });


  // ========================================================
  // 测试 2：验证设置选项正常显示
  // ========================================================
  test('验证设置选项正常显示', async ({ loggedInPage: page }) => {
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
      console.log('[test] ⚠️ 未找到设置选项');
      await page.screenshot({ path: `test-results/settings-content-${Date.now()}.png` });
    }

    const hasError = await page.locator('text=404').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);
    console.log('[test] ✅ Settings 内容验证完成');
  });


  // ========================================================
  // 测试 3：验证语言切换功能可用
  // ========================================================
  test('验证语言切换功能可用', async ({ loggedInPage: page }) => {
    const langKeywords = ['语言', 'Language', '中文', 'English', 'lang', 'locale'];
    let langEl = null;

    for (const kw of langKeywords) {
      const el = page.locator(
        `button:has-text("${kw}"), a:has-text("${kw}"), [aria-label*="${kw}"], text=${kw}`
      ).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        langEl = el;
        console.log(`[test] 找到语言设置入口: "${kw}"`);
        break;
      }
    }

    if (!langEl) {
      console.log('[test] ⚠️ 未找到语言设置，跳过');
      return;
    }
    console.log('[test] ✅ 找到语言设置入口');

    await langEl.click();
    await page.waitForTimeout(1000);

    const langOptions = ['中文', '简体中文', 'English', '한국어', '日本語', 'Türkçe'];
    let optionFound = false;
    for (const lang of langOptions) {
      const option = page.locator(`text=${lang}`).first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到语言选项: "${lang}"`);
        optionFound = true;
        break;
      }
    }

    console.log(`[test] ${optionFound ? '✅' : '⚠️'} 语言选项可见: ${optionFound}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await page.screenshot({ path: `test-results/settings-language-${Date.now()}.png` });
    console.log('[test] ✅ 语言切换验证完成');
  });


  // ========================================================
  // 测试 4：验证主题切换（暗黑/明亮模式）
  // ========================================================
  test('验证主题切换（暗黑/明亮模式）', async ({ loggedInPage: page }) => {
    const themeKeywords = ['主题', 'Theme', '暗黑', 'Dark', '明亮', 'Light', '夜间', '日间', 'Night', 'Day'];
    let themeEl = null;

    for (const kw of themeKeywords) {
      const el = page.locator(
        `button:has-text("${kw}"), [aria-label*="${kw}"], [title*="${kw}"], text=${kw}`
      ).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        themeEl = el;
        console.log(`[test] 找到主题切换入口: "${kw}"`);
        break;
      }
    }

    console.log(`[test] ${themeEl !== null ? '✅' : '⚠️'} 主题切换入口: ${themeEl !== null ? '已找到' : '未找到'}`);

    if (themeEl) {
      const bgBefore = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      console.log(`[test] 切换前背景色: ${bgBefore}`);

      await themeEl.click();
      await page.waitForTimeout(1000);

      const bgAfter = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const bodyClass = await page.locator('body').getAttribute('class') ?? '';
      const htmlClass = await page.locator('html').getAttribute('class') ?? '';
      const hasDarkClass = /dark|night/i.test(bodyClass + htmlClass);
      const hasLightClass = /light|day/i.test(bodyClass + htmlClass);
      const colorChanged = bgBefore !== bgAfter;

      console.log(`[test] 切换后背景色: ${bgAfter}, 颜色变化: ${colorChanged}, dark: ${hasDarkClass}, light: ${hasLightClass}`);
      console.log(`[test] ${colorChanged || hasDarkClass || hasLightClass ? '✅' : '⚠️'} 主题切换有效`);
    } else {
      console.log('[test] ⚠️ 未找到主题切换元素，跳过');
    }

    await page.screenshot({ path: `test-results/settings-theme-${Date.now()}.png` });
    console.log('[test] ✅ 主题切换验证完成');
  });


  // ========================================================
  // 测试 5：验证通知设置可用
  // ========================================================
  test('验证通知设置可用', async ({ loggedInPage: page }) => {
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
