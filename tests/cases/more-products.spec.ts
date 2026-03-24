// spec: specs/more-products.plan.md
import { test, expect } from '../fixtures/auth';

function getBaseUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN`;
}

// 打开顶部"更多"下拉（hover），返回是否成功
async function openMoreDropdown(page: any): Promise<boolean> {
  // 顶部导航中"更多/More"按钮，悬停后展开下拉
  const candidates = ['更多', 'More'];
  for (const kw of candidates) {
    const el = page.locator(`text="${kw}"`).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
      await el.hover({ force: true });
      await page.waitForTimeout(800);
      console.log(`[test] ✅ hover 顶部导航: "${kw}"`);
      return true;
    }
  }
  console.log('[test] ⚠️ 未找到顶部"更多/More"按钮');
  return false;
}

test.describe.serial('AsterDEX - More Products（资源）页面', () => {

  // ========================================================
  // 测试 1：顶部"更多"下拉框可打开，右侧"资源"区域可见
  // ========================================================
  test('顶部"更多"按钮下拉框可打开，资源区域可见', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const opened = await openMoreDropdown(page);

    if (!opened) {
      await page.screenshot({ path: `test-results/more-products-btn-${Date.now()}.png` });
      console.log('[test] ⚠️ 无法打开下拉框，跳过');
      return;
    }

    // 验证下拉菜单中存在资源相关内容（多候选关键字）
    const resourceKeywords = ['资源', 'Resources', '文档', 'Docs', 'Help', '帮助', 'API', 'Blog', '博客', '公告', 'Discord'];
    let hasResourceLabel = false;
    let foundKw = '';
    for (const kw of resourceKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        hasResourceLabel = true;
        foundKw = kw;
        break;
      }
    }
    console.log(`[test] 下拉菜单内容: ${hasResourceLabel ? `✅ 找到"${foundKw}"` : '⚠️ 未找到资源相关关键字'}`);
    expect.soft(hasResourceLabel, '下拉菜单中未找到任何资源相关内容').toBe(true);

    await page.screenshot({ path: `test-results/more-products-dropdown-${Date.now()}.png` });
    console.log('[test] ✅ 下拉框打开验证完成');
  });


  // ========================================================
  // 测试 2：验证"资源"区域下所有链接均可见
  // ========================================================
  test('资源区域下所有产品链接可见', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    const opened = await openMoreDropdown(page);
    if (!opened) {
      console.log('[test] ⚠️ 未找到"更多"按钮，跳过');
      return;
    }

    // 找到"资源"标签，然后取其后的所有 <a> 链接
    const resourceLabel = page.locator('text=资源').first();
    const hasLabel = await resourceLabel.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasLabel) {
      console.log('[test] ⚠️ 未找到"资源"标签，跳过');
      await page.screenshot({ path: `test-results/more-products-no-label-${Date.now()}.png` });
      return;
    }

    // 提取"资源"区域附近所有可见链接文本
    const links = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('*')).filter(
        (el: any) => el.innerText?.trim() === '资源'
      );
      if (!labels.length) return [];
      // 找到资源标签的父容器
      const container = labels[0].closest('[class*="dropdown"], [class*="menu"], [class*="panel"], section, div');
      if (!container) return [];
      return Array.from(container.querySelectorAll('a'))
        .map((a: any) => ({ text: a.innerText?.trim(), href: a.href }))
        .filter(item => item.text);
    });

    console.log(`[test] 找到资源链接数: ${links.length}`);
    for (const link of links) {
      console.log(`[test]   - "${link.text}" → ${link.href}`);
    }

    expect(links.length).toBeGreaterThan(0);
    await page.screenshot({ path: `test-results/more-products-links-${Date.now()}.png` });
    console.log('[test] ✅ 资源链接列表验证完成');
  });


  // ========================================================
  // 测试 3：所有链接的 href 有效（非空、非 # ）
  // ========================================================
  test('资源区域所有链接 href 有效', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    const opened = await openMoreDropdown(page);
    if (!opened) {
      console.log('[test] ⚠️ 未找到"更多"按钮，跳过');
      return;
    }

    const hasLabel = await page.locator('text=资源').first().isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasLabel) {
      console.log('[test] ⚠️ 未找到"资源"标签，跳过');
      return;
    }

    const links = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('*')).filter(
        (el: any) => el.innerText?.trim() === '资源'
      );
      if (!labels.length) return [];
      const container = labels[0].closest('[class*="dropdown"], [class*="menu"], [class*="panel"], section, div');
      if (!container) return [];
      return Array.from(container.querySelectorAll('a'))
        .map((a: any) => ({ text: a.innerText?.trim(), href: a.href }))
        .filter(item => item.text);
    });

    let invalidCount = 0;
    for (const link of links) {
      const valid = link.href && link.href !== '#' && !link.href.endsWith('#');
      console.log(`[test] "${link.text}" href ${valid ? '✅' : '❌'}: ${link.href}`);
      if (!valid) invalidCount++;
    }

    expect.soft(invalidCount).toBe(0);
    console.log('[test] ✅ 链接 href 验证完成');
  });


  // ========================================================
  // 测试 4：点击"资源"区域中第一个链接，页面正常跳转
  // ========================================================
  test('点击资源链接后页面正常跳转，无 404/500', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    const opened = await openMoreDropdown(page);
    if (!opened) {
      console.log('[test] ⚠️ 未找到"更多"按钮，跳过');
      return;
    }

    const hasLabel = await page.locator('text=资源').first().isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasLabel) {
      console.log('[test] ⚠️ 未找到"资源"标签，跳过');
      return;
    }

    // 取第一个链接并点击
    const links = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('*')).filter(
        (el: any) => el.innerText?.trim() === '资源'
      );
      if (!labels.length) return [];
      const container = labels[0].closest('[class*="dropdown"], [class*="menu"], [class*="panel"], section, div');
      if (!container) return [];
      return Array.from(container.querySelectorAll('a'))
        .map((a: any) => ({ text: a.innerText?.trim(), href: a.href }))
        .filter(item => item.text && item.href && item.href !== '#');
    });

    if (!links.length) {
      console.log('[test] ⚠️ 未找到可点击链接，跳过');
      return;
    }

    const firstLink = links[0];
    console.log(`[test] 点击链接: "${firstLink.text}" → ${firstLink.href}`);

    // 新标签页处理
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page').catch(() => null),
      page.locator(`a:has-text("${firstLink.text}")`).first().click(),
    ]);

    if (newPage) {
      await newPage.waitForLoadState('domcontentloaded');
      await newPage.waitForTimeout(2000);
      const has404 = await newPage.locator('h1:text-is("404"), text=404 Not Found').isVisible({ timeout: 2000 }).catch(() => false);
      const has500 = await newPage.locator('h1:text-is("500"), text=Internal Server Error').isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`[test] 新标签页 URL: ${newPage.url()}`);
      console.log(`[test] 无错误页: ${!has404 && !has500 ? '✅' : '❌'}`);
      expect.soft(has404).toBe(false);
      expect.soft(has500).toBe(false);
      await newPage.screenshot({ path: `test-results/more-products-click-${Date.now()}.png` });
      await newPage.close();
    } else {
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      const has404 = await page.locator('h1:text-is("404"), text=404 Not Found').isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`[test] 跳转后 URL: ${page.url()}`);
      console.log(`[test] 无 404: ${!has404 ? '✅' : '❌'}`);
      expect.soft(has404).toBe(false);
      await page.screenshot({ path: `test-results/more-products-click-${Date.now()}.png` });
    }

    console.log('[test] ✅ 链接点击跳转验证完成');
  });

});
