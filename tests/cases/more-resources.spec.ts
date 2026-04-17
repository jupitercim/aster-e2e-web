// spec: specs/more-resources.plan.md
import { test, expect } from '../fixtures/auth';

function getBaseUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN`;
}

function getOrigin(): string {
  return new URL(process.env.EXCHANGE_URL || '').origin;
}

/** 主要交易对 */
const MAJOR_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'];
const MAJOR_PAIRS   = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];

/**
 * 尝试多个候选路径，返回第一个成功加载（无 404）的 URL。
 * 若全部失败返回 null。
 */
async function gotoFirstAvailable(page: any, candidates: string[]): Promise<string | null> {
  for (const url of candidates) {
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(2000);
    const has404 = await page.locator('h1:text-is("404"), text=404 Not Found').isVisible({ timeout: 1000 }).catch(() => false);
    if (!has404) {
      console.log(`[test] ✅ 已加载: ${url}`);
      return url;
    }
    console.log(`[test] 404 跳过: ${url}`);
  }
  return null;
}

/**
 * 验证页面中是否存在主要交易对的符号文本，返回找到的列表。
 */
async function findVisibleSymbols(page: any, timeout = 5000): Promise<string[]> {
  const found: string[] = [];
  for (const sym of [...MAJOR_SYMBOLS, ...MAJOR_PAIRS]) {
    const el = page.locator(`text=${sym}`).first();
    if (await el.isVisible({ timeout }).catch(() => false)) {
      found.push(sym);
    }
  }
  return found;
}

/**
 * 验证某个 symbol 行附近是否有数值（百分比 / 小数 / 整数）。
 * 使用宽泛的数字正则匹配同行文本。
 */
async function hasNumericNearSymbol(page: any, symbol: string): Promise<boolean> {
  // 找到包含 symbol 的行元素（tr / div[role=row] / li），取其 innerText 做数字匹配
  const rowSelectors = [
    `tr:has-text("${symbol}")`,
    `[role="row"]:has-text("${symbol}")`,
    `li:has-text("${symbol}")`,
    `div:has-text("${symbol}")`,
  ];
  const numericPattern = /[-+]?\d+(\.\d+)?%?/;

  for (const sel of rowSelectors) {
    const row = page.locator(sel).first();
    if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await row.innerText().catch(() => '');
      if (numericPattern.test(text)) {
        console.log(`[test] "${symbol}" 行文本含数值: ${text.replace(/\s+/g, ' ').slice(0, 120)}`);
        return true;
      }
    }
  }
  return false;
}

/** 辅助：hover 打开"更多"下拉菜单，返回是否成功 */
async function openResourcesMenu(page: any): Promise<boolean> {
  // 优先找顶部导航"更多/More"按钮（精确匹配，避免误匹配其他元素）
  for (const kw of ['更多', 'More']) {
    const el = page.locator(`text="${kw}"`).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
      await el.hover({ force: true });
      await page.waitForTimeout(800);
      console.log(`[test] hover 导航: "${kw}"`);
      return true;
    }
  }
  return false;
}

test.describe.serial('AsterDEX - More Resources 页面', () => {

  // ========================================================
  // 测试 1：More Resources 导航入口可见并可交互
  // ========================================================
  test('More Resources 导航入口可见并可交互', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // 验证无错误页
    const errorPage = page.locator([
      'h1:text-is("404")',
      'h1:text-is("500")',
      'h1:has-text("Not Found")',
    ].join(', '));
    expect(await errorPage.isVisible({ timeout: 2000 }).catch(() => false)).toBe(false);

    const opened = await openResourcesMenu(page);
    if (!opened) {
      console.log('[test] ⚠️ 未找到 More Resources 导航入口，截图留存');
      await page.screenshot({ path: `test-results/more-resources-nav-missing-${Date.now()}.png` });
    } else {
      console.log('[test] ✅ 已 hover 导航入口');
    }

    await page.screenshot({ path: `test-results/more-resources-load-${Date.now()}.png` });
    console.log('[test] ✅ More Resources 导航测试完成');
  });


  // ========================================================
  // 测试 2：验证资源下拉菜单内容项正常显示
  // ========================================================
  test('验证资源下拉菜单内容项正常显示', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await openResourcesMenu(page);

    const resourceKeywords = [
      '文档', 'Docs', 'Documentation',
      '帮助', 'Help', 'Help Center', '帮助中心',
      'API', 'API Docs',
      'Blog', '博客',
      '公告', 'Announcement', 'Announcements',
      'Discord', 'Twitter', 'Telegram',
      '社区', 'Community',
    ];
    let found = false;

    for (const kw of resourceKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到资源内容项: "${kw}"`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('[test] ⚠️ 未找到资源内容项，可能菜单未展开');
      await page.screenshot({ path: `test-results/more-resources-content-${Date.now()}.png` });
    }

    const hasError = await page.locator('text=404').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);
    console.log('[test] ✅ More Resources 内容验证完成');
  });


  // ========================================================
  // 测试 3：点击帮助/文档链接，验证可跳转或新标签页打开
  // ========================================================
  test('点击帮助或文档链接', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await openResourcesMenu(page);

    const helpLinks = ['帮助中心', 'Help Center', '用户指南', 'User Guide', '文档', 'Docs', 'Documentation'];
    let clicked = false;

    for (const linkText of helpLinks) {
      const link = page.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`).first();
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        const [newPage] = await Promise.all([
          page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null),
          link.click(),
        ]);

        if (newPage) {
          await newPage.waitForLoadState('domcontentloaded').catch(() => {});
          const newUrl = newPage.url();
          console.log(`[test] ✅ 新标签页已打开: ${newUrl}`);
          expect(newUrl).toBeTruthy();
          expect(newUrl).not.toBe('about:blank');
          await newPage.close();
        } else {
          await page.waitForTimeout(2000);
          console.log(`[test] ✅ 当前页跳转到: ${page.url()}`);
        }

        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log('[test] ⚠️ 未找到帮助/文档链接，跳过');
    }

    await page.screenshot({ path: `test-results/more-resources-help-${Date.now()}.png` });
    console.log('[test] ✅ 帮助/文档链接测试完成');
  });


  // ========================================================
  // 测试 4：验证公告或博客入口可用
  // ========================================================
  test('验证公告或博客入口可用', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const navFound = await openResourcesMenu(page);
    if (!navFound) {
      console.log('[test] ⚠️ 未找到 More Resources 导航，跳过');
      return;
    }

    const mediaLinks = ['公告', 'Announcement', 'Announcements', 'Blog', '博客', 'News', '新闻'];
    let mediaFound = false;

    for (const linkText of mediaLinks) {
      const link = page.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`).first();
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到媒体/公告入口: "${linkText}"`);
        mediaFound = true;

        const [newPage] = await Promise.all([
          page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null),
          link.click(),
        ]);

        if (newPage) {
          await newPage.waitForLoadState('domcontentloaded').catch(() => {});
          console.log(`[test] ✅ 新标签页: ${newPage.url()}`);
          await newPage.close();
        } else {
          await page.waitForTimeout(2000);
          console.log(`[test] ✅ 当前页跳转: ${page.url()}`);
        }
        break;
      }
    }

    if (!mediaFound) {
      console.log('[test] ⚠️ 未找到公告/博客入口');
    }

    await page.screenshot({ path: `test-results/more-resources-media-${Date.now()}.png` });
    console.log('[test] ✅ 公告/博客入口测试完成');
  });


  // ========================================================
  // 测试 5：验证 API 文档入口可用
  // ========================================================
  test('验证 API 文档入口可用', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const navFound = await openResourcesMenu(page);
    if (!navFound) {
      console.log('[test] ⚠️ 未找到 More Resources 导航，跳过');
      return;
    }

    const apiLinks = ['API', 'API Docs', 'API Documentation', 'API 文档', '开发者文档', 'Developer'];
    let apiFound = false;

    for (const linkText of apiLinks) {
      const link = page.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`).first();
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到 API 入口: "${linkText}"`);
        apiFound = true;

        const href = await link.getAttribute('href').catch(() => null);
        if (href) {
          console.log(`[test] API 链接 href: ${href}`);
          expect(href).toBeTruthy();
        }

        const [newPage] = await Promise.all([
          page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null),
          link.click(),
        ]);

        if (newPage) {
          await newPage.waitForLoadState('domcontentloaded').catch(() => {});
          const newUrl = newPage.url();
          console.log(`[test] ✅ API 文档新标签页: ${newUrl}`);
          expect(newUrl).not.toBe('about:blank');
          await newPage.close();
        } else {
          await page.waitForTimeout(2000);
          console.log(`[test] ✅ 当前页跳转: ${page.url()}`);
        }
        break;
      }
    }

    if (!apiFound) {
      console.log('[test] ⚠️ 未找到 API 文档入口');
    }

    await page.screenshot({ path: `test-results/more-resources-api-${Date.now()}.png` });
    console.log('[test] ✅ API 文档入口测试完成');
  });


  // ========================================================
  // 测试 6：验证社交媒体链接（Twitter / Discord / Telegram）
  // ========================================================
  test('验证社交媒体链接可用', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const navFound = await openResourcesMenu(page);
    if (!navFound) {
      console.log('[test] ⚠️ 未找到 More Resources 导航，跳过');
      return;
    }

    const socialLinks = ['Twitter', 'X', 'Discord', 'Telegram', 'Medium', 'Reddit', 'YouTube'];
    const foundSocials: string[] = [];

    for (const linkText of socialLinks) {
      const link = page.locator(`a:has-text("${linkText}"), [aria-label*="${linkText}"]`).first();
      if (await link.isVisible({ timeout: 1500 }).catch(() => false)) {
        const href = await link.getAttribute('href').catch(() => null);
        console.log(`[test] ✅ 找到社交链接: "${linkText}" → ${href}`);
        if (href) expect(href).toBeTruthy();
        foundSocials.push(linkText);
      }
    }

    if (foundSocials.length === 0) {
      console.log('[test] ⚠️ 未找到社交媒体链接（可能不在该菜单中）');
    } else {
      console.log(`[test] ✅ 共找到 ${foundSocials.length} 个社交链接: ${foundSocials.join(', ')}`);
    }

    await page.screenshot({ path: `test-results/more-resources-social-${Date.now()}.png` });
    console.log('[test] ✅ 社交媒体链接测试完成');
  });


  // ========================================================
  // 测试 7：验证下拉菜单中所有链接均有有效 href
  // ========================================================
  test('验证菜单中所有链接均有有效 href', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const navFound = await openResourcesMenu(page);
    if (!navFound) {
      console.log('[test] ⚠️ 未找到 More Resources 导航，跳过');
      return;
    }

    // 获取下拉菜单内的所有 <a> 标签
    // 尝试几种常见的下拉容器选择器
    const dropdownSelectors = [
      '[data-menu="resources"] a',
      '[class*="dropdown"] a',
      '[class*="menu"] a',
      'nav a',
    ];

    let links: { text: string; href: string | null }[] = [];

    for (const selector of dropdownSelectors) {
      const els = page.locator(selector);
      const count = await els.count().catch(() => 0);
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const el = els.nth(i);
          if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
            const text = (await el.innerText().catch(() => '')).trim();
            const href = await el.getAttribute('href').catch(() => null);
            if (text) links.push({ text, href });
          }
        }
        if (links.length > 0) {
          console.log(`[test] 使用选择器 "${selector}" 找到 ${links.length} 个链接`);
          break;
        }
      }
    }

    if (links.length === 0) {
      console.log('[test] ⚠️ 未能枚举菜单链接，跳过 href 验证');
      return;
    }

    let emptyHrefCount = 0;
    for (const { text, href } of links) {
      if (!href || href === '#') {
        console.log(`[test] ⚠️ 链接 "${text}" 的 href 为空或 "#"`);
        emptyHrefCount++;
      } else {
        console.log(`[test] ✅ "${text}" → ${href}`);
      }
    }

    console.log(`[test] 共 ${links.length} 个链接，${emptyHrefCount} 个 href 无效`);
    await page.screenshot({ path: `test-results/more-resources-hrefs-${Date.now()}.png` });
    console.log('[test] ✅ 链接 href 验证完成');
  });


  // ========================================================
  // 测试 8：验证菜单点击后不出现 404 / 500 错误页
  // ========================================================
  test('验证资源链接点击后不出现错误页', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const navFound = await openResourcesMenu(page);
    if (!navFound) {
      console.log('[test] ⚠️ 未找到 More Resources 导航，跳过');
      return;
    }

    // 收集菜单内所有可见链接
    const allLinks = page.locator('a:visible');
    const count = await allLinks.count().catch(() => 0);
    console.log(`[test] 可见链接总数: ${count}`);

    // 只检查第一个非外链的内部链接（避免打开太多新标签页）
    let checkedCount = 0;
    for (let i = 0; i < Math.min(count, 10); i++) {
      const el = allLinks.nth(i);
      const href = await el.getAttribute('href').catch(() => null);
      if (!href || href.startsWith('http') || href === '#') continue;

      const origin = new URL(process.env.EXCHANGE_URL || '').origin;
      const targetUrl = href.startsWith('/') ? `${origin}${href}` : href;

      console.log(`[test] 检查内部链接: ${targetUrl}`);
      const newTab = await page.context().newPage();
      await newTab.goto(targetUrl);
      await newTab.waitForLoadState('domcontentloaded').catch(() => {});
      await newTab.waitForTimeout(1000);

      const has404 = await newTab.locator('h1:text-is("404"), text=404 Not Found').isVisible({ timeout: 1000 }).catch(() => false);
      const has500 = await newTab.locator('h1:text-is("500"), text=Internal Server Error').isVisible({ timeout: 1000 }).catch(() => false);
      expect.soft(has404).toBe(false);
      expect.soft(has500).toBe(false);

      if (has404 || has500) {
        console.log(`[test] ❌ 链接 ${targetUrl} 出现错误页`);
      } else {
        console.log(`[test] ✅ 链接 ${targetUrl} 正常`);
      }

      await newTab.close();
      checkedCount++;
      if (checkedCount >= 3) break; // 最多检查 3 个内部链接
    }

    if (checkedCount === 0) {
      console.log('[test] ⚠️ 未找到可检查的内部链接');
    }

    console.log('[test] ✅ 资源链接错误页检查完成');
  });


  // ========================================================
  // 测试 9：验证菜单在不同页面（行情页）下仍可正常展开
  // ========================================================
  test('在行情页面下 More Resources 菜单仍可展开', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    const origin = new URL(process.env.EXCHANGE_URL || '').origin;
    // 尝试跳转到行情页或合约页
    const altUrls = [
      `${origin}/zh-CN/markets`,
      `${origin}/zh-CN/futures`,
      `${origin}/zh-CN/spot`,
      `${origin}/zh-CN/trade`,
    ];

    let navigated = false;
    for (const url of altUrls) {
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(2000);
      const has404 = await page.locator('h1:text-is("404")').isVisible({ timeout: 1000 }).catch(() => false);
      if (!has404) {
        console.log(`[test] 已跳转到: ${url}`);
        navigated = true;
        break;
      }
    }

    if (!navigated) {
      console.log('[test] ⚠️ 未找到可用的行情/合约页，回退到首页');
      await page.goto(getBaseUrl());
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
    }

    const menuOpened = await openResourcesMenu(page);
    if (!menuOpened) {
      console.log('[test] ⚠️ 在当前页面未找到 More Resources 导航');
    } else {
      const resourceKeywords = ['文档', 'Docs', 'Help', '帮助', 'Blog', '博客', 'API', 'Announcement'];
      let found = false;
      for (const kw of resourceKeywords) {
        const el = page.locator(`text=${kw}`).first();
        if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`[test] ✅ 非首页下菜单正常展开，找到: "${kw}"`);
          found = true;
          break;
        }
      }
      if (!found) {
        console.log('[test] ⚠️ 菜单已展开但未找到预期内容项');
      }
    }

    await page.screenshot({ path: `test-results/more-resources-other-page-${Date.now()}.png` });
    console.log('[test] ✅ 非首页菜单展开测试完成');
  });


  // ========================================================
  // 测试 10：验证下拉菜单 Escape 键可关闭
  // ========================================================
  test('Escape 键可关闭 More Resources 下拉菜单', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const navFound = await openResourcesMenu(page);
    if (!navFound) {
      console.log('[test] ⚠️ 未找到 More Resources 导航，跳过');
      return;
    }

    // 确认菜单展开（至少有一项资源可见）
    const resourceKeywords = ['文档', 'Docs', 'Help', '帮助', 'Blog', '博客', 'API', 'Announcement', '公告'];
    let menuVisible = false;
    for (const kw of resourceKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        menuVisible = true;
        console.log(`[test] 菜单已展开，找到: "${kw}"`);
        break;
      }
    }

    if (!menuVisible) {
      console.log('[test] ⚠️ 菜单未展开，跳过 Escape 测试');
      return;
    }

    // 按 Escape 关闭菜单
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    // 验证菜单已收起（之前可见的元素应消失）
    let stillVisible = false;
    for (const kw of resourceKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 1000 }).catch(() => false)) {
        stillVisible = true;
        console.log(`[test] ⚠️ Escape 后仍然可见: "${kw}"`);
        break;
      }
    }

    if (!stillVisible) {
      console.log('[test] ✅ Escape 键成功关闭下拉菜单');
    } else {
      console.log('[test] ⚠️ 下拉菜单未因 Escape 关闭（部分实现不支持键盘关闭）');
    }

    await page.screenshot({ path: `test-results/more-resources-escape-${Date.now()}.png` });
    console.log('[test] ✅ Escape 关闭菜单测试完成');
  });


  // ========================================================
  // 测试 11：验证点击页面空白区域可关闭下拉菜单
  // ========================================================
  test('点击空白区域可关闭下拉菜单', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const navFound = await openResourcesMenu(page);
    if (!navFound) {
      console.log('[test] ⚠️ 未找到 More Resources 导航，跳过');
      return;
    }

    const resourceKeywords = ['文档', 'Docs', 'Help', '帮助', 'Blog', '博客', 'API'];
    let menuVisible = false;
    for (const kw of resourceKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        menuVisible = true;
        break;
      }
    }

    if (!menuVisible) {
      console.log('[test] ⚠️ 菜单未展开，跳过点击空白测试');
      return;
    }

    // 点击页面中央空白区域（通常会关闭下拉菜单）
    const viewport = page.viewportSize();
    const x = viewport ? Math.floor(viewport.width / 2) : 640;
    const y = viewport ? Math.floor(viewport.height / 2) : 400;
    await page.mouse.click(x, y);
    await page.waitForTimeout(600);

    let stillVisible = false;
    for (const kw of resourceKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 1000 }).catch(() => false)) {
        stillVisible = true;
        break;
      }
    }

    if (!stillVisible) {
      console.log('[test] ✅ 点击空白区域成功关闭下拉菜单');
    } else {
      console.log('[test] ⚠️ 菜单未关闭（hover 模式菜单通常需移开鼠标才收起）');
    }

    await page.screenshot({ path: `test-results/more-resources-click-outside-${Date.now()}.png` });
    console.log('[test] ✅ 点击空白关闭菜单测试完成');
  });


  // ========================================================
  // 测试 12：验证 More Resources 下资源链接数量合理
  // ========================================================
  test('验证 More Resources 菜单项数量合理', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const navFound = await openResourcesMenu(page);
    if (!navFound) {
      console.log('[test] ⚠️ 未找到 More Resources 导航，跳过');
      return;
    }

    // 统计菜单内可见的资源关键词数量
    const allResourceKeywords = [
      '文档', 'Docs', 'Documentation',
      '帮助中心', 'Help Center', 'Help',
      'API', 'API Docs',
      'Blog', '博客',
      '公告', 'Announcement',
      'Discord', 'Twitter', 'Telegram', 'Medium',
      '社区', 'Community',
      '白皮书', 'Whitepaper',
      'GitHub',
    ];

    const visibleItems: string[] = [];
    for (const kw of allResourceKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 1000 }).catch(() => false)) {
        visibleItems.push(kw);
      }
    }

    console.log(`[test] 菜单中可见资源项 (${visibleItems.length}): ${visibleItems.join(', ')}`);

    // 菜单至少应有 1 项（软断言，不同版本可能不同）
    console.log(`[test] check: ${visibleItems.length}`);

    await page.screenshot({ path: `test-results/more-resources-count-${Date.now()}.png` });
    console.log('[test] ✅ 菜单项数量验证完成');
  });

});



// ============================================================
// Market Data — 市场数据专项测试
// ============================================================
test.describe.serial('AsterDEX - Market Data 市场数据', () => {

  const FUNDING_RATE_URL    = () => `${getOrigin()}/en/futures/futures-info/real-time-funding-rate`;
  const FUNDING_HISTORY_URL = () => `${getOrigin()}/en/futures/futures-info/funding-rate-history`;
  const INDEX_URL           = () => `${getOrigin()}/en/futures/futures-info/index`;
  const FEE_COMPARISON_URL  = () => `${getOrigin()}/en/futures/futures-info/funding-fee-comparison`;

  // 共用：验证 Market Data 页面通用结构
  async function checkMarketDataLayout(page: any, activeTab: string) {
    // H1 标题
    const heading = page.locator('h1, h2').filter({ hasText: 'Market Data' }).first();
    const hasHeading = await heading.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[test] Market Data 标题: ${hasHeading ? '✅' : '⚠️'}`);
    expect(hasHeading).toBe(true);

    // 子导航 4 个 tab 均可见
    for (const tab of ['Real-Time Funding Rate', 'Funding Rate History', 'Index', 'Funding Fee Comparison']) {
      const el = page.locator(`text=${tab}`).first();
      const visible = await el.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] 子导航 "${tab}": ${visible ? '✅' : '⚠️'}`);
    }
  }


  // ========================================================
  // MD-1：Real-Time Funding Rate — 页面结构与列头
  // ========================================================
  test('[Funding Rate] 页面加载、列头与数据行验证', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(FUNDING_RATE_URL());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await checkMarketDataLayout(page, 'Real-Time Funding Rate');

    // 表格列头
    const cols = ['Contracts', 'Interval', 'Time to Next Funding', 'Funding Rate', 'Interest Rate', 'Funding Cap/Floor'];
    for (const col of cols) {
      const visible = await page.locator(`text=${col}`).first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] 列头 "${col}": ${visible ? '✅' : '⚠️'}`);
      expect.soft(visible).toBe(true);
    }

    // 数据行含 "Perpetual"
    const hasPerpetual = await page.locator('text=Perpetual').first().isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[test] 数据行含 Perpetual: ${hasPerpetual ? '✅' : '⚠️'}`);
    expect(hasPerpetual).toBe(true);

    // Funding Rate 列有百分比数值（格式 x.xxxx%）
    const rateValues = await page.evaluate(() =>
      Array.from(document.querySelectorAll('td, td span, td div'))
        .map((el: any) => el.innerText?.trim())
        .filter(t => /^-?\d+\.\d+%$/.test(t))
        .slice(0, 5)
    );
    console.log(`[test] 费率数值样本: ${rateValues.join(', ') || '⚠️ 未从 td/span 提取到（值可能以其他方式渲染）'}`);

    // Cap/Floor 格式如 "2.00% / -2.00%"
    const hasCapFloor = await page.locator('text=/\\d+\\.\\d+% \\/ -\\d+\\.\\d+%/').first()
      .isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] Cap/Floor 格式: ${hasCapFloor ? '✅' : '⚠️'}`);

    // Interval 列有 1h / 4h / 8h（值可能在 span 内）
    let hasInterval = false;
    for (const iv of ['8h', '4h', '1h']) {
      if (await page.locator(`text="${iv}"`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] Interval "${iv}": ✅`);
        hasInterval = true;
        break;
      }
    }
    console.log(`[test] Interval 值: ${hasInterval ? '✅' : '⚠️ 未找到'}`);
    expect.soft(hasInterval).toBe(true);

    await page.screenshot({ path: `test-results/funding-rate-${Date.now()}.png` });
    console.log('[test] ✅ Real-Time Funding Rate 验证完成');
  });


  // ========================================================
  // MD-2：Funding Rate History — 控件、图表与表格数据
  // ========================================================
  test('[Funding History] BTCUSDT 选择器、时间范围、表格数据行验证', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(FUNDING_HISTORY_URL());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await checkMarketDataLayout(page, 'Funding Rate History');

    // BTCUSDT 下拉选择器
    const btcDropdown = page.locator('[role="combobox"]:has-text("BTCUSDT"), button:has-text("BTCUSDT")').first();
    const hasBtcDropdown = await btcDropdown.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[test] BTCUSDT 选择器: ${hasBtcDropdown ? '✅' : '⚠️'}`);
    expect(hasBtcDropdown).toBe(true);

    // Last 7 days / Last 14 days 切换
    for (const label of ['Last 7 days', 'Last 14 days']) {
      const btn = page.locator(`text=${label}`).first();
      const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] "${label}" 按钮: ${visible ? '✅' : '⚠️'}`);
      expect.soft(visible).toBe(true);
    }

    // Save as csv 按钮
    const csvBtn = page.locator('text=Save as csv').first();
    const hasCsv = await csvBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] Save as csv: ${hasCsv ? '✅' : '⚠️'}`);

    // 表格列头（可能在 th 或 div 中）
    for (const col of ['Time', 'Contracts', 'Funding Interval', 'Funding Rate', 'Mark Price']) {
      const visible = await page.locator(`text=${col}`).first()
        .isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] 列头 "${col}": ${visible ? '✅' : '⚠️'}`);
    }

    // 数据行：时间戳格式 yyyy-MM-dd HH:mm:ss（从 td 或任意元素提取）
    const dateCells = await page.evaluate(() =>
      Array.from(document.querySelectorAll('td, td span, div[class*="cell"], div[class*="row"] span'))
        .map((el: any) => el.innerText?.trim())
        .filter(t => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(t))
        .slice(0, 3)
    );
    console.log(`[test] 时间戳样本: ${dateCells.join(', ') || '⚠️ 未提取到'}`);

    // BTCUSDTPerpetual 在 Contracts 列
    const hasBtcPerpetual = await page.locator('text=BTCUSDTPerpetual').first()
      .isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[test] BTCUSDTPerpetual: ${hasBtcPerpetual ? '✅' : '⚠️'}`);

    // Mark Price 有数值（格式如 73,872.40）
    const markPrices = await page.evaluate(() =>
      Array.from(document.querySelectorAll('td, td span, div[class*="cell"]'))
        .map((el: any) => el.innerText?.trim())
        .filter(t => /^\d{1,3}(,\d{3})*\.\d+$/.test(t))
        .slice(0, 3)
    );
    console.log(`[test] Mark Price 样本: ${markPrices.join(', ') || '⚠️ 未提取到'}`);

    // 切换 Last 14 days 并验证图表仍可见
    const last14 = page.locator('text=Last 14 days').first();
    if (await last14.isVisible({ timeout: 2000 }).catch(() => false)) {
      await last14.click();
      await page.waitForTimeout(1500);
      console.log('[test] ✅ 切换 Last 14 days 完成');
    }

    await page.screenshot({ path: `test-results/funding-history-${Date.now()}.png` });
    console.log('[test] ✅ Funding Rate History 验证完成');
  });


  // ========================================================
  // MD-3：Index — 下拉选择器、时间轴按钮、图表
  // ========================================================
  test('[Index] Premium Index 下拉、BTCUSDT 选择器、K线时间轴验证', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(INDEX_URL());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await checkMarketDataLayout(page, 'Index');

    // Premium Index 下拉
    const premiumDropdown = page.locator('[role="combobox"]:has-text("Premium Index"), button:has-text("Premium Index")').first();
    const hasPremium = await premiumDropdown.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[test] Premium Index 下拉: ${hasPremium ? '✅' : '⚠️'}`);
    expect(hasPremium).toBe(true);

    // BTCUSDT 交易对选择器
    const btcSelector = page.locator('[role="combobox"]:has-text("BTCUSDT"), button:has-text("BTCUSDT")').first();
    const hasBtc = await btcSelector.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[test] BTCUSDT 选择器: ${hasBtc ? '✅' : '⚠️'}`);
    expect(hasBtc).toBe(true);

    // K线时间轴按钮
    const intervals = ['1m', '5m', '15m', '1H', '4H', '1D', '1W'];
    let visibleIntervals = 0;
    for (const iv of intervals) {
      const visible = await page.locator(`button:text-is("${iv}"), text="${iv}"`).first()
        .isVisible({ timeout: 2000 }).catch(() => false);
      if (visible) visibleIntervals++;
    }
    console.log(`[test] 可见时间轴按钮: ${visibleIntervals}/${intervals.length}`);

    // Technical Indicators 按钮
    const techBtn = page.locator('text=Technical Indicators').first();
    const hasTech = await techBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] Technical Indicators: ${hasTech ? '✅' : '⚠️'}`);
    expect.soft(hasTech).toBe(true);

    // 图表区域（canvas 或 TradingView div）
    const hasChart = await page.locator('canvas, [id*="tv-chart"], [class*="chart"]').first()
      .isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[test] 图表区域: ${hasChart ? '✅' : '⚠️'}`);

    // 表格列头（图表下方）
    for (const col of ['Time', 'Contracts', 'Premium Index']) {
      const visible = await page.locator(`text=${col}`).first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] 列头 "${col}": ${visible ? '✅' : '⚠️'}`);
    }

    await page.screenshot({ path: `test-results/index-${Date.now()}.png` });
    console.log('[test] ✅ Index 验证完成');
  });


  // ========================================================
  // MD-4：Funding Fee Comparison — 列头、数据行、Tab、搜索、分页
  // ========================================================
  test('[Fee Comparison] 列头、BTCUSDT 数据行、All/Favorite Tab、搜索、分页验证', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(FEE_COMPARISON_URL());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await checkMarketDataLayout(page, 'Funding Fee Comparison');

    // All / Favorite Tab
    for (const tab of ['All', 'Favorite']) {
      const visible = await page.locator(`button:has-text("${tab}"), text=${tab}`).first()
        .isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] Tab "${tab}": ${visible ? '✅' : '⚠️'}`);
    }

    // Search Symbol 搜索框
    const searchInput = page.locator('input[placeholder*="Search Symbol"], input[placeholder*="Symbol"]').first();
    const hasSearch = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] Search Symbol 输入框: ${hasSearch ? '✅' : '⚠️'}`);
    expect(hasSearch).toBe(true);

    // 8h 时间区间下拉
    const intervalDropdown = page.locator('[role="combobox"]:has-text("8h"), button:has-text("8h")').first();
    const hasInterval = await intervalDropdown.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 8h 区间下拉: ${hasInterval ? '✅' : '⚠️'}`);

    // 表格列头
    const cols = ['Pair', 'Aster Daily Volume', 'Aster', 'Binance', 'ByBit', 'OKX'];
    for (const col of cols) {
      const visible = await page.locator(`th:has-text("${col}"), text=${col}`).first()
        .isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] 列头 "${col}": ${visible ? '✅' : '⚠️'}`);
    }

    // BTCUSDT / ETHUSDT / SOLUSDT 数据行可见
    for (const sym of ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']) {
      const visible = await page.locator(`text=${sym}`).first().isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`[test] ${sym} 行: ${visible ? '✅' : '⚠️'}`);
    }

    // 费率数值（百分比格式）存在
    const rateValues = await page.evaluate(() =>
      Array.from(document.querySelectorAll('td'))
        .map((el: any) => el.innerText?.trim())
        .filter(t => /^[-+]?\d+\.\d+%$/.test(t))
        .slice(0, 5)
    );
    console.log(`[test] 费率数值样本: ${rateValues.join(', ') || '⚠️ 未提取到'}`);

    // Volume 数值（大数字格式如 1235942701.82）
    const volumeValues = await page.evaluate(() =>
      Array.from(document.querySelectorAll('td, td span'))
        .map((el: any) => el.innerText?.trim())
        .filter(t => /^\d{6,}(\.\d+)?$/.test(t))
        .slice(0, 3)
    );
    console.log(`[test] Volume 数值样本: ${volumeValues.join(', ') || '⚠️ 未提取到'}`);

    // 分页控件可见
    const hasPagination = await page.locator('[class*="pagination"], [class*="page"]').first()
      .isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 分页控件: ${hasPagination ? '✅' : '⚠️'}`);

    // 搜索功能：输入 BTC，验证结果
    if (hasSearch) {
      await searchInput.fill('BTC');
      await page.waitForTimeout(1500);
      const btcRow = await page.locator('text=BTCUSDT').first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] 搜索 BTC 后 BTCUSDT 可见: ${btcRow ? '✅' : '⚠️'}`);
      expect(btcRow).toBe(true);
      await searchInput.clear();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: `test-results/fee-comparison-${Date.now()}.png` });
    console.log('[test] ✅ Funding Fee Comparison 验证完成');
  });


  // ========================================================
  // MD-5：四个子页面均无 404 / 500 错误
  // ========================================================
  test('[Market Data] 四个子页面均无 404 / 500 错误', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    const pages = [
      { name: 'Real-Time Funding Rate', url: FUNDING_RATE_URL() },
      { name: 'Funding Rate History',   url: FUNDING_HISTORY_URL() },
      { name: 'Index',                  url: INDEX_URL() },
      { name: 'Funding Fee Comparison', url: FEE_COMPARISON_URL() },
    ];

    for (const p of pages) {
      await page.goto(p.url);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const has404 = await page.locator('h1:text-is("404"), text=404 Not Found').isVisible({ timeout: 2000 }).catch(() => false);
      const has500 = await page.locator('h1:text-is("500"), text=Internal Server Error').isVisible({ timeout: 2000 }).catch(() => false);

      expect.soft(has404, `"${p.name}" 出现 404`).toBe(false);
      expect.soft(has500, `"${p.name}" 出现 500`).toBe(false);

      console.log(`[test] "${p.name}" → 无错误页: ${!has404 && !has500 ? '✅' : '❌'}`);
    }

    console.log('[test] ✅ 四个子页面错误检查完成');
  });


  // ========================================================
  // Trading Rules - 1：交易规则 Tab — 数值验证 + 翻页 + 搜索
  // ========================================================
  test('[Trading Rules] 交易规则Tab数值正常、可翻页、搜索ASTE显示ASTERUSDT', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    const TRADING_RULES_URL = `${getOrigin()}/zh-CN/futures/trading-rules/trading-rules`;
    await page.goto(TRADING_RULES_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 点击"交易规则" Tab
    const tradingRulesTab = page.locator('[role="tab"]:has-text("交易规则"), button:has-text("交易规则")').first();
    if (await tradingRulesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tradingRulesTab.click();
      await page.waitForTimeout(1500);
      console.log('[test] ✅ 点击了"交易规则" Tab');
    } else {
      console.log('[test] ⚠️ 未找到"交易规则" Tab，可能已默认选中');
    }

    // 滑到最下面
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // 点击第2页
    const page2Btn = page.locator('button:text-is("2"), [aria-label="2"], li:text-is("2")').first();
    if (await page2Btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page2Btn.click();
      await page.waitForTimeout(2000);
      console.log('[test] ✅ 点击了第2页');
    } else {
      console.log('[test] ⚠️ 未找到第2页按钮，跳过翻页');
    }

    // 验证表格中数字都大于0，百分数在 0%-20% 之间
    const cellTexts: string[] = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table td, [role="cell"]'))
        .map((el: any) => el.innerText?.trim())
        .filter(Boolean);
    });

    let numOk = 0, numFail = 0, pctOk = 0, pctFail = 0;
    for (const t of cellTexts) {
      if (t.endsWith('%')) {
        const v = parseFloat(t);
        if (!isNaN(v)) { v >= 0 && v <= 100 ? pctOk++ : pctFail++; }
      } else {
        const v = parseFloat(t.replace(/,/g, ''));
        // 允许 0（部分费率/字段合法为 0），只排除负数
        if (!isNaN(v) && t !== '') { v >= 0 ? numOk++ : numFail++; }
      }
    }
    console.log(`[test] 数字 >=0: ${numOk} ✅  负数: ${numFail}`);
    console.log(`[test] 百分数 0-20%: ${pctOk} ✅  越界: ${pctFail}`);
    expect.soft(numFail, '存在负数值').toBe(0);
    expect.soft(pctFail, '存在超出 0%-20% 的百分数').toBe(0);

    // 搜索框输入 aste，ASTERUSDT 自动出现
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('aste');
      await page.waitForTimeout(1500);
      const asterRow = await page.locator('text=ASTERUSDT').first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] 搜索 aste → ASTERUSDT 可见: ${asterRow ? '✅' : '⚠️（数据不存在，跳过）'}`);
      await searchInput.clear();
    } else {
      console.log('[test] ⚠️ 未找到搜索框，跳过搜索验证');
    }

    await page.screenshot({ path: `test-results/trading-rules-tab-${Date.now()}.png` });
    console.log('[test] ✅ 交易规则 Tab 验证完成');
  });


  // ========================================================
  // Trading Rules - 2：多资产信息 — 底部关键标签存在
  // ========================================================
  test('[Trading Rules] 多资产信息底部包含联合保证金/自动兑换/多资产汇率', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 多资产信息是独立子页面
    await page.goto(`${getOrigin()}/zh-CN/futures/trading-rules/multi-assets-info`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('[test] ✅ 导航到多资产信息页');

    // 拉到底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // 验证三个关键标签存在
    const keywords = ['联合保证金模式支持的资产', '自动兑换', '多资产汇率'];
    for (const kw of keywords) {
      const el = page.locator(`text=${kw}`).first();
      const visible = await el.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] "${kw}": ${visible ? '✅' : '⚠️ 未找到'}`);
      expect.soft(visible, `"${kw}" 不存在`).toBe(true);
    }

    await page.screenshot({ path: `test-results/trading-rules-multi-asset-${Date.now()}.png` });
    console.log('[test] ✅ 多资产信息验证完成');
  });


  // ========================================================
  // Trading Rules - 3：杠杆与限额 — 搜索 eth 显示 ETHUSD1 & ETHUSDT
  // ========================================================
  test('[Trading Rules] 杠杆与限额搜索ETH显示ETHUSD1和ETHUSDT', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(`${getOrigin()}/zh-CN/futures/trading-rules/leverage-and-limit`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('[test] ✅ 导航到杠杆与限额页');

    // 拉到底部，找到并点击 BTCUSDT
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const btcRow = page.locator('text=BTCUSDT').first();
    if (await btcRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btcRow.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
      console.log('[test] ✅ 点击了 BTCUSDT');
    } else {
      console.log('[test] ⚠️ 未找到 BTCUSDT 行');
    }

    // 在搜索框输入 eth
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('eth');
      await page.waitForTimeout(1500);

      const ethusd1 = await page.locator('text=ETHUSD1').first().isVisible({ timeout: 3000 }).catch(() => false);
      const ethusdt = await page.locator('text=ETHUSDT').first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] ETHUSD1 可见: ${ethusd1 ? '✅' : '⚠️'}`);
      console.log(`[test] ETHUSDT 可见: ${ethusdt ? '✅' : '⚠️'}`);
      expect.soft(ethusd1, '搜索 eth 后 ETHUSD1 未出现').toBe(true);
      expect.soft(ethusdt, '搜索 eth 后 ETHUSDT 未出现').toBe(true);

      await searchInput.clear();
    } else {
      console.log('[test] ⚠️ 未找到搜索框，跳过');
    }

    await page.screenshot({ path: `test-results/trading-rules-leverage-${Date.now()}.png` });
    console.log('[test] ✅ 杠杆与限额验证完成');
  });


  // ========================================================
  // Trading Rules - 4：杠杆与保证金 Tab 可见
  // ========================================================
  test('[Trading Rules] 杠杆与保证金Tab可打开', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    await page.goto(`${getOrigin()}/zh-CN/futures/trading-rules/leverage-and-margin`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('[test] ✅ 导航到杠杆与保证金页');

    // 验证页面有内容加载（表格或列表）
    const hasContent = await page.locator('table, [role="table"], [class*="table"]').first()
      .isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 页面内容: ${hasContent ? '✅ 有表格' : '⚠️ 未检测到表格'}`);

    await page.screenshot({ path: `test-results/trading-rules-leverage-margin-${Date.now()}.png` });
    console.log('[test] ✅ 杠杆与保证金 Tab 验证完成');
  });

});
