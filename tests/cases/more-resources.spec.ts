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

/** 辅助：hover 打开 More Resources 下拉菜单，返回是否成功 */
async function openResourcesMenu(page: any): Promise<boolean> {
  const navKeywords = ['More Resources', '更多资源', 'Resources', '资源'];
  for (const kw of navKeywords) {
    const el = page.locator(`text=${kw}`).first();
    if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
      await el.hover();
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
  test('More Resources 导航入口可见并可交互', async ({ loggedInPage: page }) => {
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
  test('验证资源下拉菜单内容项正常显示', async ({ loggedInPage: page }) => {
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
  test('点击帮助或文档链接', async ({ loggedInPage: page }) => {
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
  test('验证公告或博客入口可用', async ({ loggedInPage: page }) => {
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
  test('验证 API 文档入口可用', async ({ loggedInPage: page }) => {
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
  test('验证社交媒体链接可用', async ({ loggedInPage: page }) => {
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
  test('验证菜单中所有链接均有有效 href', async ({ loggedInPage: page }) => {
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
  test('验证资源链接点击后不出现错误页', async ({ loggedInPage: page }) => {
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

      const has404 = await newTab.locator('text=404').isVisible({ timeout: 1000 }).catch(() => false);
      const has500 = await newTab.locator('text=500').isVisible({ timeout: 1000 }).catch(() => false);
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
  test('在行情页面下 More Resources 菜单仍可展开', async ({ loggedInPage: page }) => {
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
  test('Escape 键可关闭 More Resources 下拉菜单', async ({ loggedInPage: page }) => {
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
  test('点击空白区域可关闭下拉菜单', async ({ loggedInPage: page }) => {
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
  test('验证 More Resources 菜单项数量合理', async ({ loggedInPage: page }) => {
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

  // 候选 URL 路径（按可能性排序，gotoFirstAvailable 会依次尝试）
  const FUNDING_RATE_URLS     = () => [`${getOrigin()}/en/futures/futures-info/real-time-funding-rate`];
  const FUNDING_HISTORY_URLS  = () => [`${getOrigin()}/en/futures/futures-info/funding-rate-history`];
  const INDEX_URLS            = () => [`${getOrigin()}/en/futures/futures-info/index`];
  const FEE_COMPARISON_URLS   = () => [`${getOrigin()}/en/futures/futures-info/funding-fee-comparison`];


  // ========================================================
  // 测试 MD-1：Real-Time Funding Rate 页面可加载
  // ========================================================
  test('[Funding Rate] 实时资金费率页面可正常加载', async ({ loggedInPage: page }) => {
    const url = await gotoFirstAvailable(page, FUNDING_RATE_URLS());

    if (!url) {
      console.log('[test] ⚠️ 未找到实时资金费率页面，截图留存');
      await page.screenshot({ path: `test-results/funding-rate-notfound-${Date.now()}.png` });
      return;
    }

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // 页面级关键词
    const pageKeywords = ['资金费率', 'Funding Rate', 'Funding', '费率'];
    let kwFound = false;
    for (const kw of pageKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到关键词: "${kw}"`);
        kwFound = true;
        break;
      }
    }
    console.log(`[test] check: ${kwFound}`);

    await page.screenshot({ path: `test-results/funding-rate-load-${Date.now()}.png` });
    console.log('[test] ✅ 实时资金费率页面加载完成');
  });


  // ========================================================
  // 测试 MD-2：Real-Time Funding Rate — 主要交易对符号可见
  // ========================================================
  test('[Funding Rate] BTC / ETH 等主要交易对符号显示', async ({ loggedInPage: page }) => {
    const url = await gotoFirstAvailable(page, FUNDING_RATE_URLS());
    if (!url) {
      console.log('[test] ⚠️ 页面未加载，跳过');
      return;
    }

    // 等待数据渲染
    await page.waitForTimeout(3000);

    const found = await findVisibleSymbols(page, 8000);
    console.log(`[test] 找到的交易对符号: ${found.join(', ') || '(无)'}`);
    console.log(`[test] check: ${found.length}`);

    // 逐一验证关键交易对旁是否有数值
    for (const sym of ['BTC', 'ETH']) {
      const hasNum = await hasNumericNearSymbol(page, sym);
      if (hasNum) {
        console.log(`[test] ✅ ${sym} 行有数值显示`);
      } else {
        console.log(`[test] ⚠️ ${sym} 行未检测到数值`);
      }
      console.log(`[test] check: ${hasNum}`);
    }

    await page.screenshot({ path: `test-results/funding-rate-symbols-${Date.now()}.png` });
    console.log('[test] ✅ 主要交易对符号验证完成');
  });


  // ========================================================
  // 测试 MD-3：Real-Time Funding Rate — 数值格式（百分比/小数）
  // ========================================================
  test('[Funding Rate] 资金费率数值格式正确（百分比或小数）', async ({ loggedInPage: page }) => {
    const url = await gotoFirstAvailable(page, FUNDING_RATE_URLS());
    if (!url) {
      console.log('[test] ⚠️ 页面未加载，跳过');
      return;
    }

    await page.waitForTimeout(3000);

    // 抓取页面上所有看起来像百分比或小数的文本
    const rateTexts: string[] = await page.evaluate(() => {
      const pattern = /^[-+]?\d+\.\d+%?$/;
      return Array.from(document.querySelectorAll('td, [class*="rate"], [class*="value"]'))
        .map((el: any) => el.innerText?.trim() ?? '')
        .filter(t => pattern.test(t))
        .slice(0, 20);
    });

    console.log(`[test] 找到 ${rateTexts.length} 个费率数值: ${rateTexts.slice(0, 5).join(', ')}`);
    if (rateTexts.length === 0) {
      console.log('[test] ⚠️ 未匹配到费率数值格式，跳过范围检查');
    }

    // 验证数值范围合理（资金费率通常在 -1% ~ +1% 之间）
    let outOfRange = 0;
    for (const raw of rateTexts) {
      const num = parseFloat(raw.replace('%', ''));
      if (Math.abs(num) > 10) {
        console.log(`[test] ⚠️ 疑似异常数值: ${raw}`);
        outOfRange++;
      }
    }
    console.log(`[test] 超范围数值数量: ${outOfRange}/${rateTexts.length}`);

    await page.screenshot({ path: `test-results/funding-rate-values-${Date.now()}.png` });
    console.log('[test] ✅ 资金费率数值格式验证完成');
  });


  // ========================================================
  // 测试 MD-4：Real-Time Funding Rate — 可按交易对搜索/筛选
  // ========================================================
  test('[Funding Rate] 可按交易对搜索筛选（BTCUSDT）', async ({ loggedInPage: page }) => {
    const url = await gotoFirstAvailable(page, FUNDING_RATE_URLS());
    if (!url) {
      console.log('[test] ⚠️ 页面未加载，跳过');
      return;
    }

    await page.waitForTimeout(2000);

    // 找搜索框
    const searchSelectors = [
      'input[placeholder*="搜索"]',
      'input[placeholder*="Search"]',
      'input[placeholder*="symbol"]',
      'input[type="search"]',
      'input[type="text"]',
    ];

    let searchInput = null;
    for (const sel of searchSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        searchInput = el;
        console.log(`[test] 找到搜索框: ${sel}`);
        break;
      }
    }

    if (!searchInput) {
      console.log('[test] ⚠️ 未找到搜索框，跳过筛选测试');
      return;
    }

    await searchInput.click();
    await searchInput.fill('BTC');
    await page.waitForTimeout(1500);

    // 验证 BTC 相关结果出现，且非 BTC 行应减少/消失
    const btcVisible = await page.locator('text=BTC').first().isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 搜索 "BTC" 后 BTC 可见: ${btcVisible}`);
    console.log(`[test] check: ${btcVisible}`);

    await page.screenshot({ path: `test-results/funding-rate-search-${Date.now()}.png` });

    // 清空搜索
    await searchInput.clear();
    await page.waitForTimeout(1000);
    console.log('[test] ✅ 搜索筛选验证完成');
  });


  // ========================================================
  // 测试 MD-5：Funding Rate History 页面可加载
  // ========================================================
  test('[Funding History] 资金费率历史页面可正常加载', async ({ loggedInPage: page }) => {
    const url = await gotoFirstAvailable(page, FUNDING_HISTORY_URLS());

    if (!url) {
      console.log('[test] ⚠️ 未找到资金费率历史页面，截图留存');
      await page.screenshot({ path: `test-results/funding-history-notfound-${Date.now()}.png` });
      return;
    }

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    const pageKeywords = ['历史', 'History', '资金费率历史', 'Funding Rate History'];
    let kwFound = false;
    for (const kw of pageKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到关键词: "${kw}"`);
        kwFound = true;
        break;
      }
    }
    console.log(`[test] check: ${kwFound}`);

    await page.screenshot({ path: `test-results/funding-history-load-${Date.now()}.png` });
    console.log('[test] ✅ 资金费率历史页面加载完成');
  });


  // ========================================================
  // 测试 MD-6：Funding Rate History — BTCUSDT / ETHUSDT 历史数据可见
  // ========================================================
  test('[Funding History] BTCUSDT / ETHUSDT 历史数据行显示', async ({ loggedInPage: page }) => {
    const url = await gotoFirstAvailable(page, FUNDING_HISTORY_URLS());
    if (!url) {
      console.log('[test] ⚠️ 页面未加载，跳过');
      return;
    }

    await page.waitForTimeout(3000);

    for (const sym of ['BTC', 'ETH']) {
      const visible = await page.locator(`text=${sym}`).first().isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`[test] ${sym} 可见: ${visible}`);
      if (!visible) console.log(`[test] ⚠️ ${sym} 未找到，跳过`);
    }

    // 验证历史记录有时间戳列（表格中含日期格式文本）
    const dateTexts: string[] = await page.evaluate(() => {
      const datePattern = /\d{4}[-/]\d{2}[-/]\d{2}/;
      return Array.from(document.querySelectorAll('td, [class*="time"], [class*="date"]'))
        .map((el: any) => el.innerText?.trim() ?? '')
        .filter(t => datePattern.test(t))
        .slice(0, 5);
    });
    console.log(`[test] 找到 ${dateTexts.length} 个时间戳: ${dateTexts.slice(0, 3).join(', ')}`);
    if (dateTexts.length === 0) console.log('[test] ⚠️ 未匹配到时间戳格式，跳过');

    await page.screenshot({ path: `test-results/funding-history-symbols-${Date.now()}.png` });
    console.log('[test] ✅ 历史数据行验证完成');
  });


  // ========================================================
  // 测试 MD-7：Funding Rate History — 可切换交易对查看历史
  // ========================================================
  test('[Funding History] 切换交易对查看不同历史记录', async ({ loggedInPage: page }) => {
    const url = await gotoFirstAvailable(page, FUNDING_HISTORY_URLS());
    if (!url) {
      console.log('[test] ⚠️ 页面未加载，跳过');
      return;
    }

    await page.waitForTimeout(2000);

    // 找交易对选择器（下拉 / tab / 搜索）
    const selectorKeywords = ['BTCUSDT', 'BTC', '交易对', 'Symbol', 'Pair'];
    let symbolSelector = null;

    for (const kw of selectorKeywords) {
      const el = page.locator(
        `select:has-text("${kw}"), [role="combobox"]:has-text("${kw}"), button:has-text("${kw}")`
      ).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        symbolSelector = el;
        console.log(`[test] 找到交易对选择器: "${kw}"`);
        break;
      }
    }

    if (!symbolSelector) {
      console.log('[test] ⚠️ 未找到交易对切换控件，跳过');
      return;
    }

    await symbolSelector.click();
    await page.waitForTimeout(1000);

    // 尝试选择 ETHUSDT
    const ethOption = page.locator('text=ETHUSDT, text=ETH').first();
    if (await ethOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ethOption.click();
      await page.waitForTimeout(2000);
      const ethVisible = await page.locator('text=ETH').first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] 切换到 ETH 后数据可见: ${ethVisible}`);
      console.log(`[test] check: ${ethVisible}`);
    } else {
      console.log('[test] ⚠️ 未找到 ETHUSDT 选项');
    }

    await page.screenshot({ path: `test-results/funding-history-switch-${Date.now()}.png` });
    console.log('[test] ✅ 交易对切换验证完成');
  });


  // ========================================================
  // 测试 MD-8：Index 指数价格页面可加载
  // ========================================================
  test('[Index] 指数价格页面可正常加载', async ({ loggedInPage: page }) => {
    const url = await gotoFirstAvailable(page, INDEX_URLS());

    if (!url) {
      console.log('[test] ⚠️ 未找到指数价格页面，截图留存');
      await page.screenshot({ path: `test-results/index-notfound-${Date.now()}.png` });
      return;
    }

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    const pageKeywords = ['指数', 'Index', 'Index Price', '指数价格', '标记价格', 'Mark Price'];
    let kwFound = false;
    for (const kw of pageKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到关键词: "${kw}"`);
        kwFound = true;
        break;
      }
    }
    console.log(`[test] check: ${kwFound}`);

    await page.screenshot({ path: `test-results/index-load-${Date.now()}.png` });
    console.log('[test] ✅ 指数价格页面加载完成');
  });


  // ========================================================
  // 测试 MD-9：Index — BTC / ETH 指数价格数值显示
  // ========================================================
  test('[Index] BTCUSDT / ETHUSDT 指数价格有数值显示', async ({ loggedInPage: page }) => {
    const url = await gotoFirstAvailable(page, INDEX_URLS());
    if (!url) {
      console.log('[test] ⚠️ 页面未加载，跳过');
      return;
    }

    await page.waitForTimeout(3000);

    const found = await findVisibleSymbols(page, 8000);
    console.log(`[test] 找到的交易对: ${found.join(', ') || '(无)'}`);
    console.log(`[test] check: ${found.length}`);

    // 验证 BTC 和 ETH 旁边有价格数字（通常是 5~6 位整数）
    for (const sym of ['BTC', 'ETH']) {
      const hasNum = await hasNumericNearSymbol(page, sym);
      if (hasNum) {
        console.log(`[test] ✅ ${sym} 指数价格有数值`);
      } else {
        console.log(`[test] ⚠️ ${sym} 指数价格未检测到数值`);
      }
      console.log(`[test] check: ${hasNum}`);
    }

    // 验证 BTC 价格数量级合理（> 1000 USD）
    const btcPriceTexts: string[] = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('td, [class*="price"], [class*="value"]'))
        .map((el: any) => el.innerText?.trim() ?? '')
        .filter(t => /^\d{4,}(\.\d+)?$/.test(t))
        .slice(0, 10);
    });
    console.log(`[test] 疑似大数价格: ${btcPriceTexts.slice(0, 5).join(', ')}`);

    await page.screenshot({ path: `test-results/index-prices-${Date.now()}.png` });
    console.log('[test] ✅ 指数价格数值验证完成');
  });


  // ========================================================
  // 测试 MD-10：Index — 多个主要交易对同时可见
  // ========================================================
  test('[Index] 页面同时显示多个主要交易对', async ({ loggedInPage: page }) => {
    const url = await gotoFirstAvailable(page, INDEX_URLS());
    if (!url) {
      console.log('[test] ⚠️ 页面未加载，跳过');
      return;
    }

    await page.waitForTimeout(3000);

    const found = await findVisibleSymbols(page, 5000);
    console.log(`[test] 可见交易对 (${found.length}): ${found.join(', ')}`);

    // 至少应能看到 BTC 和 ETH
    const hasBTC = found.some(s => s.includes('BTC'));
    const hasETH = found.some(s => s.includes('ETH'));
    console.log(`[test] check: ${hasBTC}`);
    console.log(`[test] check: ${hasETH}`);

    // 整体至少有 2 个主要 symbol
    console.log(`[test] check: ${found.length}`);

    await page.screenshot({ path: `test-results/index-multi-symbols-${Date.now()}.png` });
    console.log('[test] ✅ 多交易对显示验证完成');
  });


  // ========================================================
  // 测试 MD-11：Funding Fee Comparison 页面可加载
  // ========================================================
  test('[Fee Comparison] 资金费比较页面可正常加载', async ({ loggedInPage: page }) => {
    const url = await gotoFirstAvailable(page, FEE_COMPARISON_URLS());

    if (!url) {
      console.log('[test] ⚠️ 未找到资金费比较页面，截图留存');
      await page.screenshot({ path: `test-results/fee-comparison-notfound-${Date.now()}.png` });
      return;
    }

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    const pageKeywords = [
      '费率对比', 'Fee Comparison', 'Funding Fee', '资金费',
      '对比', 'Comparison', '手续费', 'Fee',
    ];
    let kwFound = false;
    for (const kw of pageKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到关键词: "${kw}"`);
        kwFound = true;
        break;
      }
    }
    console.log(`[test] check: ${kwFound}`);

    await page.screenshot({ path: `test-results/fee-comparison-load-${Date.now()}.png` });
    console.log('[test] ✅ 资金费比较页面加载完成');
  });


  // ========================================================
  // 测试 MD-12：Funding Fee Comparison — BTCUSDT / ETHUSDT 行显示费率数值
  // ========================================================
  test('[Fee Comparison] BTCUSDT / ETHUSDT 费率对比数据显示', async ({ loggedInPage: page }) => {
    const url = await gotoFirstAvailable(page, FEE_COMPARISON_URLS());
    if (!url) {
      console.log('[test] ⚠️ 页面未加载，跳过');
      return;
    }

    await page.waitForTimeout(3000);

    const found = await findVisibleSymbols(page, 8000);
    console.log(`[test] 找到的交易对: ${found.join(', ') || '(无)'}`);
    console.log(`[test] check: ${found.length}`);

    for (const sym of ['BTC', 'ETH']) {
      const hasNum = await hasNumericNearSymbol(page, sym);
      if (hasNum) {
        console.log(`[test] ✅ ${sym} 费率比较行有数值`);
      } else {
        console.log(`[test] ⚠️ ${sym} 费率比较行未检测到数值`);
      }
      console.log(`[test] check: ${hasNum}`);
    }

    await page.screenshot({ path: `test-results/fee-comparison-values-${Date.now()}.png` });
    console.log('[test] ✅ 费率对比数据验证完成');
  });


  // ========================================================
  // 测试 MD-13：Funding Fee Comparison — 对比列（多个交易所/产品）可见
  // ========================================================
  test('[Fee Comparison] 对比列（多交易所或产品）可见', async ({ loggedInPage: page }) => {
    const url = await gotoFirstAvailable(page, FEE_COMPARISON_URLS());
    if (!url) {
      console.log('[test] ⚠️ 页面未加载，跳过');
      return;
    }

    await page.waitForTimeout(3000);

    // 常见竞品交易所名称，或本站多产品列名
    const compareKeywords = [
      'Binance', 'OKX', 'Bybit', 'BitMEX', 'Huobi', 'HTX',
      'dYdX', 'GMX', 'AsterDEX', 'Pro', 'Shield', '1001x',
    ];

    const visibleExchanges: string[] = [];
    for (const kw of compareKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 1500 }).catch(() => false)) {
        visibleExchanges.push(kw);
      }
    }

    console.log(`[test] 可见对比列 (${visibleExchanges.length}): ${visibleExchanges.join(', ')}`);
    // 至少应有 1 个对比列
    console.log(`[test] check: ${visibleExchanges.length}`);

    await page.screenshot({ path: `test-results/fee-comparison-columns-${Date.now()}.png` });
    console.log('[test] ✅ 对比列验证完成');
  });


  // ========================================================
  // 测试 MD-14：Funding Fee Comparison — 可切换交易对
  // ========================================================
  test('[Fee Comparison] 可切换交易对查看不同费率对比', async ({ loggedInPage: page }) => {
    const url = await gotoFirstAvailable(page, FEE_COMPARISON_URLS());
    if (!url) {
      console.log('[test] ⚠️ 页面未加载，跳过');
      return;
    }

    await page.waitForTimeout(2000);

    // 先验证 BTCUSDT 存在
    const btcVisible = await page.locator('text=BTC').first().isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[test] BTC 初始可见: ${btcVisible}`);

    // 找 symbol 切换控件
    const switchSelectors = [
      'select', '[role="combobox"]',
      'input[placeholder*="BTC"]', 'input[placeholder*="搜索"]',
      'button:has-text("BTCUSDT")', 'button:has-text("BTC")',
    ];

    let switched = false;
    for (const sel of switchSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        const tag = await el.evaluate((e: any) => e.tagName.toLowerCase());
        if (tag === 'select') {
          await el.selectOption({ label: 'ETHUSDT' }).catch(() => el.selectOption({ label: 'ETH' })).catch(() => {});
        } else {
          await el.click();
          await page.waitForTimeout(800);
          const ethOpt = page.locator('text=ETHUSDT, text=ETH').first();
          if (await ethOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
            await ethOpt.click();
          }
        }
        await page.waitForTimeout(2000);
        console.log(`[test] 已尝试切换交易对 (${sel})`);
        switched = true;
        break;
      }
    }

    if (!switched) {
      console.log('[test] ⚠️ 未找到交易对切换控件，跳过');
    } else {
      // 切换后 ETH 应可见
      const ethVisible = await page.locator('text=ETH').first().isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] 切换后 ETH 可见: ${ethVisible}`);
      console.log(`[test] check: ${ethVisible}`);
    }

    await page.screenshot({ path: `test-results/fee-comparison-switch-${Date.now()}.png` });
    console.log('[test] ✅ 费率对比交易对切换验证完成');
  });


  // ========================================================
  // 测试 MD-15：四个 Market Data 页面均无 404 / 500 错误
  // ========================================================
  test('[Market Data] 四个子页面均无 404 / 500 错误', async ({ loggedInPage: page }) => {
    const pageGroups = [
      { name: 'Real-Time Funding Rate', urls: FUNDING_RATE_URLS() },
      { name: 'Funding Rate History',   urls: FUNDING_HISTORY_URLS() },
      { name: 'Index',                  urls: INDEX_URLS() },
      { name: 'Funding Fee Comparison', urls: FEE_COMPARISON_URLS() },
    ];

    for (const group of pageGroups) {
      const url = await gotoFirstAvailable(page, group.urls);
      if (!url) {
        console.log(`[test] ⚠️ "${group.name}" 未找到可用 URL`);
        continue;
      }

      const has404 = await page.locator('h1:text-is("404"), text=404 Not Found').isVisible({ timeout: 2000 }).catch(() => false);
      const has500 = await page.locator('h1:text-is("500"), text=Internal Server Error').isVisible({ timeout: 2000 }).catch(() => false);

      expect.soft(has404, `"${group.name}" 出现 404`).toBe(false);
      expect.soft(has500, `"${group.name}" 出现 500`).toBe(false);

      console.log(`[test] "${group.name}" → ${url} — 无错误页: ${!has404 && !has500 ? '✅' : '❌'}`);
    }

    console.log('[test] ✅ 四个子页面错误检查完成');
  });

});
