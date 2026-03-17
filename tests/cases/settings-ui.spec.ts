import { test, expect } from '../fixtures/auth';

function getSettingsUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/api-management`;
}

test.describe.serial('AsterDEX - 设置页面 UI', () => {

  // ========================================================
  // 测试 1：设置页面能正常打开
  // ========================================================
  test('设置页面能正常打开', async ({ extensionContext }) => {
    const page = await extensionContext.newPage();
    const url = getSettingsUrl();
    console.log(`[settings] 访问 URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 验证页面标题不为空
    const title = await page.title();
    console.log(`[settings] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // 验证没有出现错误页（仅检查 h1 标签避免误匹配）
    const errorPage = page.locator([
      'h1:text-is("404")',
      'h1:text-is("500")',
      'h1:has-text("Not Found")',
      'h1:has-text("Internal Server Error")',
    ].join(', '));
    const hasErrorPage = await errorPage.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasErrorPage).toBe(false);

    // 验证页面有可见内容（body 下存在至少一个可见元素）
    const bodyVisible = await page.locator('body').isVisible({ timeout: 3000 }).catch(() => false);
    expect(bodyVisible).toBe(true);

    await page.screenshot({ path: `test-results/settings-ui-open-${Date.now()}.png` });
    console.log('[settings] ✅ 设置页面正常打开');
    await page.close();
  });

  // ========================================================
  // 测试 2：有语言切换选项
  // ========================================================
  test('有语言切换选项', async ({ extensionContext }) => {
    const page = await extensionContext.newPage();
    await page.goto(getSettingsUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 查找语言切换入口（文本或按钮）
    const langKeywords = ['语言', 'Language', '中文', 'English', 'lang', 'locale'];
    let langEl = null;
    let matchedKw = '';

    for (const kw of langKeywords) {
      const el = page.locator(
        `button:has-text("${kw}"), a:has-text("${kw}"), [aria-label*="${kw}"], text=${kw}`
      ).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        langEl = el;
        matchedKw = kw;
        console.log(`[settings] 找到语言选项入口: "${kw}"`);
        break;
      }
    }

    // 硬断言：页面上必须存在语言切换相关元素
    expect.soft(langEl !== null).toBe(true);

    if (langEl) {
      // 点击语言入口，验证弹出选项列表
      await langEl.click();
      await page.waitForTimeout(1000);

      const langOptions = ['中文', '简体中文', 'English', '한국어', '日本語', 'Türkçe'];
      let optionFound = false;

      for (const lang of langOptions) {
        const option = page.locator(`text=${lang}`).first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`[settings] ✅ 找到语言选项: "${lang}"`);
          optionFound = true;
          break;
        }
      }

      expect.soft(optionFound).toBe(true);

      // 关闭弹出面板，不实际切换语言
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log(`[settings] ⚠️ 未找到语言切换元素（关键词: ${langKeywords.join(', ')}）`);
    }

    await page.screenshot({ path: `test-results/settings-ui-language-${Date.now()}.png` });
    console.log('[settings] ✅ 语言切换选项检查完成');
    await page.close();
  });

  // ========================================================
  // 测试 3：有主题切换（暗黑 / 明亮模式）
  // ========================================================
  test('有主题切换（暗黑/明亮模式）', async ({ extensionContext }) => {
    const page = await extensionContext.newPage();
    await page.goto(getSettingsUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 查找主题切换入口（文本 / aria-label / data 属性）
    const themeKeywords = ['主题', 'Theme', '暗黑', 'Dark', '明亮', 'Light', '夜间', '日间', 'Night', 'Day'];
    let themeEl = null;
    let matchedThemeKw = '';

    for (const kw of themeKeywords) {
      const el = page.locator(
        `button:has-text("${kw}"), [aria-label*="${kw}"], [title*="${kw}"], text=${kw}`
      ).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        themeEl = el;
        matchedThemeKw = kw;
        console.log(`[settings] 找到主题切换入口: "${kw}"`);
        break;
      }
    }

    // 软断言：主题切换元素应当存在
    expect.soft(themeEl !== null).toBe(true);

    if (themeEl) {
      // 记录点击前背景色，用于验证切换是否生效
      const bgBefore = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor
      );
      console.log(`[settings] 切换前背景色: ${bgBefore}`);

      await themeEl.click();
      await page.waitForTimeout(1000);

      const bgAfter = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor
      );
      console.log(`[settings] 切换后背景色: ${bgAfter}`);

      // 软断言：切换后页面背景色或 class 有变化（任意一种方式均算通过）
      const bodyClass = await page.locator('body').getAttribute('class') ?? '';
      const htmlClass = await page.locator('html').getAttribute('class') ?? '';
      const hasDarkClass = /dark|night/i.test(bodyClass + htmlClass);
      const hasLightClass = /light|day/i.test(bodyClass + htmlClass);
      const colorChanged = bgBefore !== bgAfter;

      console.log(`[settings] body class: "${bodyClass}", html class: "${htmlClass}"`);
      console.log(`[settings] 颜色变化: ${colorChanged}, dark class: ${hasDarkClass}, light class: ${hasLightClass}`);

      // 至少有一种变化可观测
      expect.soft(colorChanged || hasDarkClass || hasLightClass).toBe(true);
    } else {
      console.log(`[settings] ⚠️ 未找到主题切换元素（关键词: ${themeKeywords.join(', ')}）`);
    }

    await page.screenshot({ path: `test-results/settings-ui-theme-${Date.now()}.png` });
    console.log('[settings] ✅ 主题切换检查完成');
    await page.close();
  });

});
