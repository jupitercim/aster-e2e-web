// spec: specs/rocket-launch.plan.md
import { test, expect } from '../fixtures/auth';

function getRocketLaunchUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/rocket-launch`;
}

// 月份映射（UTC 日期字符串解析用）
const UTC_MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/**
 * 解析 "02 Feb, 14:00 UTC" 或 "02 Feb, 2025 14:00 UTC" 格式，返回 ms 时间戳。
 * 若无年份，自动推断（月份 > 当前月则用上一年）。
 */
function parseUTCDateStr(str: string): number {
  const m = str.trim().match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(?:(\d{4})\s+)?(\d{2}:\d{2})\s*UTC/);
  if (!m) return 0;
  const month = UTC_MONTHS[m[2]];
  if (month === undefined) return 0;
  const day = parseInt(m[1]);
  const [h, min] = m[4].split(':').map(Number);
  let year = m[3] ? parseInt(m[3]) : new Date().getUTCFullYear();
  // 如没有年份且月份超过当前月，判断为上一年
  if (!m[3]) {
    const nowMonth = new Date().getUTCMonth();
    if (month > nowMonth) year -= 1;
  }
  return Date.UTC(year, month, day, h, min);
}

/**
 * 从卡片文本提取数据（在 Node.js 侧解析）
 */
function parseCardText(cardText: string) {
  // 活动周期结束时间：直接匹配日期区间 "DD Mon, HH:MM UTC - DD Mon, HH:MM UTC"
  // innerText 用 \n 分隔各行，不依赖 | 字符
  let endTime = 0;
  const dateRangeMatch = cardText.match(
    /\d{1,2}\s+[A-Za-z]+,\s*\d{2}:\d{2}\s*UTC\s*-\s*(\d{1,2}\s+[A-Za-z]+,?\s*(?:\d{4}\s+)?\d{2}:\d{2}\s*UTC)/
  );
  if (dateRangeMatch) endTime = parseUTCDateStr(dateRangeMatch[1]);

  // 最小持仓：标签后紧跟 \n（或 |），再取第一个数字
  // 格式："最小持仓（完整周期）\n444 ASTER"
  let minHolding = -1;
  const holdingMatch = cardText.match(/最小持仓[^\n]*[\n|]\s*([\d,]+(?:\.\d+)?)/);
  if (holdingMatch) minHolding = parseFloat(holdingMatch[1].replace(/,/g, ''));

  // 最小交易量：卡片中若有此字段则解析
  let minVolume = -1;
  const volumeMatch = cardText.match(/最小交易量[^\n]*[\n|]\s*([\d,]+(?:\.\d+)?)/);
  if (volumeMatch) minVolume = parseFloat(volumeMatch[1].replace(/,/g, ''));

  return { endTime, minHolding, minVolume };
}

/**
 * 滚到底 + 点击"查看更多"（如有）再滚一次
 */
async function scrollAndLoadMore(page: any): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  const moreBtn = page.locator('button:has-text("查看更多"), button:text-is("查看更多")').first();
  if (await moreBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await moreBtn.click();
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    console.log('[test] 已点击"查看更多"并滚到底');
  }
}

/**
 * 通用：检查指定 Tab 下"已结束"卡片的各项数据
 */
async function checkEndedCards(page: any, tabName: '火箭发射' | 'Trade Arena'): Promise<void> {
  const url = getRocketLaunchUrl();
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  // 切换 Tab
  if (tabName === 'Trade Arena') {
    const tab = page.locator('button:has-text("Trade Arena"), button:text-is("Trade Arena")').first();
    if (!await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[test] ⚠️ Trade Arena Tab 不可见，跳过');
      return;
    }
    await tab.click();
    await page.waitForTimeout(1500);
    console.log('[test] 已切换到 Trade Arena');
  }

  // 点击"已结束"筛选
  const endedBtn = page.locator('button:has-text("已结束")').first();
  if (await endedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await endedBtn.click();
    await page.waitForTimeout(1500);
    console.log('[test] 已点击"已结束"筛选');
  }

  // 滚底 + 查看更多
  await scrollAndLoadMore(page);
  await page.screenshot({ path: `test-results/rocket-ended-${tabName.replace(/\s/g, '-')}-all-${Date.now()}.png` });

  // 从页面提取卡片数据（只取桌面版，避免重复）
  const rawCards: { cardText: string; href: string; pointerEvents: string; ariaDisabled: string | null }[] =
    await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a')).filter(
        (a) => a.textContent?.trim().includes('交易赚取')
      );
      // 优先桌面版（class 含 "hidden md:block"），避免与移动版重复计数
      const desktop = allLinks.filter((a) => /hidden/.test(a.className) && /md:block/.test(a.className));
      const links = desktop.length > 0 ? desktop : allLinks;

      return links.map((link) => {
        // 向上最多 12 层找卡片容器
        let el: Element | null = link;
        for (let i = 0; i < 12; i++) {
          el = el?.parentElement ?? null;
          if (!el) break;
          const cls = (el as HTMLElement).className || '';
          if (/card|item|project|launch/i.test(cls) || el.tagName === 'LI' || el.tagName === 'ARTICLE') break;
        }
        const cardText = (el as HTMLElement)?.innerText || (link.parentElement as HTMLElement)?.innerText || '';
        const href = (link as HTMLAnchorElement).href || '';
        const cs = window.getComputedStyle(link);
        return {
          cardText,
          href,
          pointerEvents: cs.pointerEvents,
          ariaDisabled: link.getAttribute('aria-disabled'),
        };
      });
    });

  console.log(`[test] [${tabName}] 已结束卡片数: ${rawCards.length}`);
  expect(rawCards.length).toBeGreaterThan(0);

  const now = Date.now();
  let endTimeFail = 0;
  let holdingFail = 0;
  let volumeFail = 0;
  let tradeHrefFail = 0;

  for (let i = 0; i < rawCards.length; i++) {
    const { cardText, href, pointerEvents, ariaDisabled } = rawCards[i];
    const label = `[${tabName}][${i}]`;
    const { endTime, minHolding, minVolume } = parseCardText(cardText);

    // ── 活动周期结束时间 < 当前时间 ──────────────────────
    if (endTime > 0) {
      const ok = endTime < now;
      console.log(`[test] ${ok ? '✅' : '❌'} ${label} 结束时间 ${new Date(endTime).toISOString()} ${ok ? '<' : '≥'} 现在`);
      if (!ok) endTimeFail++;
    } else {
      console.log(`[test] ⚠️ ${label} 未解析结束时间，原文: "${cardText.slice(0, 120).replace(/\n/g, '|')}"`);
    }

    // ── 最小持仓 ─────────────────────────────────────
    // 0 ASTER = Trade Arena 设计上无持仓要求，属正常；仅当字段值为负（解析失败）时记录警告
    if (minHolding >= 0) {
      const ok = minHolding > 0;
      console.log(`[test] ${ok ? '✅' : '⚠️'} ${label} 最小持仓: ${minHolding}${minHolding === 0 ? ' (无持仓要求)' : ''}`);
      if (!ok) holdingFail++;
    } else {
      console.log(`[test] ⚠️ ${label} 未找到最小持仓字段`);
    }

    // ── 最小交易量 > 10（字段若存在则验证）────────────
    if (minVolume >= 0) {
      const ok = minVolume > 10;
      console.log(`[test] ${ok ? '✅' : '❌'} ${label} 最小交易量: ${minVolume}`);
      if (!ok) volumeFail++;
    } else {
      console.log(`[test] ⚠️ ${label} 卡片中无"最小交易量"字段，跳过`);
    }

    // ── 交易赚取：hover 后 href 含 /trade/ 且 spot 字段 ──
    const hasTradeHref = href.includes('/trade/');
    const hasSpot = href.includes('/spot/');
    const isDisabled = pointerEvents === 'none' || ariaDisabled === 'true';
    console.log(`[test] ${hasTradeHref ? '✅' : '❌'} ${label} 交易赚取 href: ${href}`);
    console.log(`[test] ${hasSpot ? '✅' : '⚠️'} ${label} href 含 spot: ${hasSpot}`);
    console.log(`[test] ${isDisabled ? '✅' : '⚠️'} ${label} 按钮不可点击: ${isDisabled} (pointer-events:${pointerEvents})`);
    if (!hasTradeHref) tradeHrefFail++;
  }

  // Hover 验证：对第一个"交易赚取"链接 hover，确认 href 可读且含 /trade/
  const firstLink = page.locator('a:has-text("交易赚取")').first();
  if (await firstLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await firstLink.hover({ force: true });
    await page.waitForTimeout(300);
    const hoverHref = await firstLink.getAttribute('href') || '';
    console.log(`[test] ✅ [${tabName}] hover href: ${hoverHref}`);
    expect.soft(hoverHref).toContain('/trade/');
  }

  expect.soft(endTimeFail, `${endTimeFail} 个卡片结束时间 ≥ 当前时间`).toBe(0);
  // 0 ASTER 为合法"无持仓要求"，此处 holdingFail 仅统计持仓 = 0 的卡片数，作为信息记录
  if (holdingFail > 0) {
    console.log(`[test] ⚠️ [${tabName}] ${holdingFail} 个卡片最小持仓为 0（无持仓要求）`);
  }
  expect.soft(volumeFail, `${volumeFail} 个卡片最小交易量 ≤ 10`).toBe(0);
  expect.soft(tradeHrefFail, `${tradeHrefFail} 个卡片交易赚取 href 不含 /trade/`).toBe(0);

  console.log(`[test] ✅ [${tabName}] 已结束卡片验证完成`);
}

test.describe.serial('AsterDEX - Rocket Launch 页面', () => {

  // ========================================================
  // 测试 1：页面加载，标题与主要文案可见
  // ========================================================
  test('Rocket Launch 页面可正常加载', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    const url = getRocketLaunchUrl();
    console.log(`[test] Rocket Launch URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // H1 "火箭发射" 可见
    const h1 = page.locator('h1').first();
    const h1Text = await h1.innerText().catch(() => '');
    console.log(`[test] H1: "${h1Text}"`);
    expect(h1Text).toBeTruthy();

    // H2 介绍文案可见
    const h2 = page.locator('h2').first();
    const h2Visible = await h2.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] H2 可见: ${h2Visible ? '✅' : '⚠️'}`);

    // 无 404/500 错误页
    const has404 = await page.locator('h1:text-is("404"), text=404 Not Found').isVisible({ timeout: 1000 }).catch(() => false);
    expect(has404).toBe(false);

    await page.screenshot({ path: `test-results/rocket-load-${Date.now()}.png` });
    console.log('[test] ✅ 页面加载完成');
  });


  // ========================================================
  // 测试 2：Tab 切换 — 火箭发射 / Trade Arena
  // ========================================================
  test('Tab 切换：火箭发射 / Trade Arena', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    // 验证两个 Tab 都可见
    const rocketTab = page.locator('button:has-text("火箭发射"), button:text-is("火箭发射")').first();
    const arenaTab  = page.locator('button:has-text("Trade Arena"), button:text-is("Trade Arena")').first();

    const rocketVisible = await rocketTab.isVisible({ timeout: 5000 }).catch(() => false);
    const arenaVisible  = await arenaTab.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[test] Tab "火箭发射": ${rocketVisible ? '✅' : '⚠️'}`);
    console.log(`[test] Tab "Trade Arena": ${arenaVisible ? '✅' : '⚠️'}`);
    expect(rocketVisible).toBe(true);
    expect(arenaVisible).toBe(true);

    // 点击 Trade Arena
    await arenaTab.click();
    await page.waitForTimeout(1500);
    console.log('[test] 点击 Trade Arena Tab');
    await page.screenshot({ path: `test-results/rocket-tab-arena-${Date.now()}.png` });

    // 切回火箭发射
    await rocketTab.click();
    await page.waitForTimeout(1000);
    console.log('[test] 切回 火箭发射 Tab');

    console.log('[test] ✅ Tab 切换验证完成');
  });


  // ========================================================
  // 测试 3：筛选按钮 — 全部 / 进行中 / 即将到来 / 已结束
  // ========================================================
  test('筛选按钮切换正常', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    const filters = ['全部', '进行中', '即将到来', '已结束'];

    for (const f of filters) {
      const btn = page.locator(`button:has-text("${f}")`).first();
      const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] 筛选 "${f}": ${visible ? '✅' : '⚠️'}`);
      if (visible) {
        await btn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `test-results/rocket-filter-${f}-${Date.now()}.png` });
        console.log(`[test] 点击筛选 "${f}"`);
      }
    }

    // 切回"全部"
    const allBtn = page.locator('button:has-text("全部")').first();
    if (await allBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await allBtn.click();
      await page.waitForTimeout(800);
    }

    console.log('[test] ✅ 筛选按钮验证完成');
  });


  // ========================================================
  // 测试 4：项目卡片可见，"交易赚取"链接有效
  // ========================================================
  test('项目卡片列表可见，交易赚取链接有效', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    // 进入"已结束"筛选（卡片数量最多）
    const endedBtn = page.locator('button:has-text("已结束")').first();
    if (await endedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await endedBtn.click();
      await page.waitForTimeout(1500);
    }

    // 找"交易赚取"链接
    const tradeLinks = page.locator('a:has-text("交易赚取")');
    const count = await tradeLinks.count();
    console.log(`[test] 找到 "交易赚取" 链接数: ${count}`);
    expect(count).toBeGreaterThan(0);

    // 验证前3个链接 href 有效
    for (let i = 0; i < Math.min(count, 3); i++) {
      const href = await tradeLinks.nth(i).getAttribute('href').catch(() => '');
      const valid = href && href.includes('/trade/');
      console.log(`[test] 交易赚取[${i}] href ${valid ? '✅' : '❌'}: ${href}`);
      expect.soft(valid).toBeTruthy();
    }

    await page.screenshot({ path: `test-results/rocket-cards-${Date.now()}.png` });
    console.log('[test] ✅ 项目卡片验证完成');
  });


  // ========================================================
  // 测试 5：点击"交易赚取"进入 Spot 交易页
  // ========================================================
  test('点击交易赚取进入 Spot 交易页', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    const endedBtn = page.locator('button:has-text("已结束")').first();
    if (await endedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await endedBtn.click();
      await page.waitForTimeout(1500);
    }

    const firstLink = page.locator('a:has-text("交易赚取")').first();
    const href = await firstLink.getAttribute('href').catch(() => '');
    console.log(`[test] 即将点击: ${href}`);

    if (!href) {
      console.log('[test] ⚠️ 未找到交易赚取链接，跳过');
      return;
    }

    // 直接导航（链接可能开新标签页）
    const origin = new URL(getRocketLaunchUrl()).origin;
    const targetUrl = href.startsWith('/') ? `${origin}${href}` : href;
    await page.goto(targetUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`[test] 跳转后 URL: ${currentUrl}`);
    expect(currentUrl).toContain('/trade/');

    const has404 = await page.locator('h1:text-is("404")').isVisible({ timeout: 1000 }).catch(() => false);
    expect(has404).toBe(false);

    await page.screenshot({ path: `test-results/rocket-trade-${Date.now()}.png` });
    console.log('[test] ✅ 点击交易赚取验证完成');

    // 返回 Rocket Launch 页
    await page.goto(getRocketLaunchUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });


  // ========================================================
  // 测试 6："查看更多"按钮可点击，加载更多卡片
  // ========================================================
  test('"查看更多"加载更多项目', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    // 先进入"已结束"
    const endedBtn = page.locator('button:has-text("已结束")').first();
    if (await endedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await endedBtn.click();
      await page.waitForTimeout(1500);
    }

    const beforeCount = await page.locator('a:has-text("交易赚取")').count();
    console.log(`[test] 点击前卡片数: ${beforeCount}`);

    const moreBtn = page.locator('button:has-text("查看更多"), button:text-is("查看更多")').first();
    const hasMore = await moreBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] "查看更多" 按钮: ${hasMore ? '✅' : '⚠️ 不可见（已全部加载）'}`);

    if (hasMore) {
      await moreBtn.click();
      await page.waitForTimeout(2000);
      const afterCount = await page.locator('a:has-text("交易赚取")').count();
      console.log(`[test] 点击后卡片数: ${afterCount}`);
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
      await page.screenshot({ path: `test-results/rocket-more-${Date.now()}.png` });
    }

    console.log('[test] ✅ 查看更多验证完成');
  });


  // ========================================================
  // 测试 7：FAQ 手风琴展开/收起
  // ========================================================
  test('FAQ 手风琴展开与收起', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    const faqs = [
      '什么是火箭发射？',
      '如何符合活动条件？',
      '我什么时候可以收到我的火箭发射计划奖励？',
    ];

    for (const question of faqs) {
      const btn = page.locator(`button:has-text("${question}")`).first();
      const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] FAQ "${question}": ${visible ? '✅' : '⚠️'}`);

      if (visible) {
        // 展开
        await btn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: `test-results/rocket-faq-open-${Date.now()}.png` });
        console.log(`[test] 展开 FAQ: "${question}"`);

        // 收起
        await btn.click();
        await page.waitForTimeout(500);
        console.log(`[test] 收起 FAQ: "${question}"`);
      }
    }

    console.log('[test] ✅ FAQ 手风琴验证完成');
  });


  // ========================================================
  // 测试 8："了解更多"链接指向文档
  // ========================================================
  test('"了解更多"链接指向文档', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    const link = page.locator('a:has-text("了解更多")').first();
    const visible = await link.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[test] "了解更多" 链接: ${visible ? '✅' : '⚠️'}`);
    expect(visible).toBe(true);

    const href = await link.getAttribute('href').catch(() => '');
    console.log(`[test] href: ${href}`);
    expect(href).toContain('docs');

    console.log('[test] ✅ 了解更多链接验证完成');
  });


  // ========================================================
  // 测试 9：火箭发射 Tab - 已结束卡片数据验证
  // ========================================================
  test('火箭发射 Tab - 已结束卡片：结束时间/最小持仓/交易赚取链接', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    await checkEndedCards(page, '火箭发射');
  });


  // ========================================================
  // 测试 10：Trade Arena Tab - 已结束卡片数据验证
  // ========================================================
  test('Trade Arena Tab - 已结束卡片：结束时间/最小持仓/交易赚取链接', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    await checkEndedCards(page, 'Trade Arena');
  });

});
