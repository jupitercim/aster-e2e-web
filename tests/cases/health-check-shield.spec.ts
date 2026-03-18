// spec: specs/health-check-shield.plan.md
// seed: tests/cases/seed.spec.ts

import { test, expect } from '../fixtures/auth';

test.describe.serial('AsterDEX - Shield 交易页面检查', () => {

  // ========================================================
  // 测试 1：页面加载与基础布局
  // ========================================================
  test('页面加载与基础布局', async ({ loggedInPage: page }) => {
    // 1. 导航至 Shield 页面，等待 domcontentloaded 后再等待 3 秒
    const base = process.env.EXCHANGE_URL!;
    const shieldUrl = `${new URL(base).origin}/zh-CN/trade/shield/futures/BTCUSDT`;
    await page.goto(shieldUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // expect: 页面 body 文本长度大于 100，说明页面有实际内容（非白屏）
    const body = page.locator('body');
    const bodyText = await body.textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(100);
    console.log('[test] ✅ 页面内容非空');

    // 2. 再等待 2 秒，检查是否有全屏 loading 遮罩残留
    await page.waitForTimeout(2000);
    const fullscreenLoading = page
      .locator('[class*="loading"]:not([style*="display: none"]), [class*="spinner"]:not([style*="display: none"])')
      .first();
    const isStuck = await fullscreenLoading.isVisible({ timeout: 1000 }).catch(() => false);
    if (isStuck) {
      console.log('[test] ⚠️ 可能存在未消失的 loading 遮罩');
    } else {
      console.log('[test] ✅ 无卡住的全屏 loading');
    }

    // 3. 截图
    await page.screenshot({ path: `test-results/shield-page-check-load-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 2：顶部行情栏数据
  // ========================================================
  test('顶部行情栏数据', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面

    // 1. 查找交易对标题，确认显示 BTC/USDT 字样
    const pairTitle = page.locator('h3:has-text("BTC/USDT"), [class*="symbol"]:has-text("BTC")').first();
    const hasPairTitle = await pairTitle.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[test] ${hasPairTitle ? '✅' : '⚠️'} 交易对标题: ${hasPairTitle ? '可见' : '未找到'}`);

    // 2. 查找最新成交价（大数字），解析为浮点数，expect > 0
    const lastPriceEl = page.locator('span.text-body2.font-light').first();
    await expect(lastPriceEl).toBeVisible({ timeout: 10000 });
    const lastPriceText = (await lastPriceEl.textContent()) || '';
    const lastPrice = parseFloat(lastPriceText.replace(/,/g, '').trim());
    expect(lastPrice).toBeGreaterThan(0);
    console.log(`[test] ✅ 最新成交价: ${lastPrice}`);

    // 3. 查找 24h 涨跌幅（含 % 符号）
    const change24hEl = page.locator('text=/[+-]?\\d+\\.\\d+%/').first();
    const has24hChange = await change24hEl.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${has24hChange ? '✅' : '⚠️'} 24h 涨跌幅: ${has24hChange ? '可见' : '未找到'}`);

    // 4. 查找标记价格（mark price）
    const markPriceSelectors = [
      'dt:has-text("标记价格") ~ dd',
      'dt:has-text("标记价格") + dd',
      '[class*="mark"] [class*="price"], [class*="markPrice"]',
    ];
    let markPrice = 0;
    for (const sel of markPriceSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
          const text = (await el.textContent()) || '';
          markPrice = parseFloat(text.replace(/,/g, '').trim());
          if (markPrice > 0) {
            console.log(`[test] ✅ 标记价格: ${markPrice}`);
            break;
          }
        }
      } catch { /* ignore */ }
    }
    if (markPrice === 0) console.log('[test] ⚠️ 未能读取标记价格，跳过断言');

    // 5. 查找指数价格（index price）
    const indexPriceEl = page.locator('dt:has-text("指数价格")').locator('..').locator('dd').first();
    const hasIndexPrice = await indexPriceEl.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasIndexPrice) {
      const indexPriceText = (await indexPriceEl.textContent()) || '';
      const indexPrice = parseFloat(indexPriceText.replace(/,/g, '').trim());
      expect(indexPrice).toBeGreaterThan(0);
      console.log(`[test] ✅ 指数价格: ${indexPrice}`);
    } else {
      console.log('[test] ⚠️ 未找到指数价格，跳过');
    }

    // 6. 查找资金费率（含 % 符号）
    const fundingRateEl = page.locator('dt:has-text("资金费率")').locator('..').locator('dd').first();
    const hasFundingRate = await fundingRateEl.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasFundingRate) {
      const rateText = (await fundingRateEl.textContent()) || '';
      const hasPercent = /%/.test(rateText);
      expect.soft(hasPercent, `资金费率应含 % 符号，实际: "${rateText}"`).toBe(true);
      console.log(`[test] ✅ 资金费率: ${rateText.trim()}`);
    } else {
      console.log('[test] ⚠️ 未找到资金费率，跳过');
    }

    // 7. 查找资金费率倒计时（HH:MM:SS）
    const countdownEl = page.locator('text=/\\d{1,2}:\\d{2}:\\d{2}/').first();
    const hasCountdown = await countdownEl.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${hasCountdown ? '✅' : '⚠️'} 资金费率倒计时: ${hasCountdown ? '可见' : '未找到'}`);

    // 8. 截图
    await page.screenshot({ path: `test-results/shield-page-check-ticker-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 3：图表区域
  // ========================================================
  test('图表区域', async ({ loggedInPage: page }) => {
    // 复用已打开的页面

    // 1. 等待 2 秒，查找 TradingView iframe（宽>200, 高>150）
    await page.waitForTimeout(2000);
    let chartFound = false;
    const iframes = page.locator('iframe');
    const iframeCount = await iframes.count();
    for (let i = 0; i < iframeCount; i++) {
      const frame = iframes.nth(i);
      const box = await frame.boundingBox().catch(() => null);
      if (box && box.width > 200 && box.height > 150) {
        console.log(`[test] ✅ 图表 iframe 可见，尺寸: ${Math.round(box.width)}×${Math.round(box.height)}`);
        chartFound = true;
        break;
      }
    }

    // 2. 备用：canvas、[class*=chart]、[id*=chart]
    if (!chartFound) {
      const candidates = [
        'canvas',
        '[class*="chart"]',
        '[class*="Chart"]',
        '[id*="chart"]',
        '[id*="tv"]',
      ];
      for (const sel of candidates) {
        const el = page.locator(sel).first();
        const box = await el.boundingBox().catch(() => null);
        if (box && box.width > 200 && box.height > 150) {
          console.log(`[test] ✅ 图表区域可见 (${sel})，尺寸: ${Math.round(box.width)}×${Math.round(box.height)}`);
          chartFound = true;
          break;
        }
      }
    }

    if (!chartFound) {
      console.log('[test] ⚠️ 未能通过选择器确认图表区域，可能需要更新 selector');
    }

    // 3. 验证时间周期按钮可见（1H 或 1D）
    const timePeriodBtns = ['1H', '1D'];
    for (const period of timePeriodBtns) {
      const btn = page.locator(`button:has-text("${period}")`).first();
      const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] ${visible ? '✅' : '⚠️'} 时间周期按钮 "${period}": ${visible ? '可见' : '未找到'}`);
    }

    // 4. 截图
    await page.screenshot({ path: `test-results/shield-page-check-chart-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 4：下单面板
  // ========================================================
  test('下单面板', async ({ loggedInPage: page }) => {
    // 复用已打开的页面
    // Shield 页面为特殊 UI：做多/做空方向按钮 + 保证金输入 + 杠杆滑块

    // 1. 验证方向切换按钮：做多 / 做空
    const longBtn = page.locator('button:has-text("做多")').first();
    const shortBtn = page.locator('button:has-text("做空")').first();
    const hasLong = await longBtn.isVisible({ timeout: 5000 }).catch(() => false);
    const hasShort = await shortBtn.isVisible({ timeout: 3000 }).catch(() => false);
    expect.soft(hasLong, '做多按钮不可见').toBe(true);
    expect.soft(hasShort, '做空按钮不可见').toBe(true);
    console.log(`[test] ${hasLong ? '✅' : '⚠️'} 做多按钮: ${hasLong ? '可见' : '未找到'}`);
    console.log(`[test] ${hasShort ? '✅' : '⚠️'} 做空按钮: ${hasShort ? '可见' : '未找到'}`);

    // 2. 验证保证金输入框（Shield 模式用保证金而非价格/数量）
    const marginInput = page.locator('input').first();
    const hasMarginInput = await marginInput.isVisible({ timeout: 3000 }).catch(() => false);
    expect.soft(hasMarginInput, '保证金输入框不可见').toBe(true);
    console.log(`[test] ${hasMarginInput ? '✅' : '⚠️'} 保证金输入框可见`);

    // 3. 验证保证金预设金额按钮（50 / 100 / 500 / 1000）
    const presetAmounts = ['50', '100', '500', '1000'];
    let presetFound = 0;
    for (const amount of presetAmounts) {
      const btn = page.locator(`button:text("${amount}")`).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        presetFound++;
      }
    }
    console.log(`[test] ${presetFound >= 2 ? '✅' : '⚠️'} 保证金预设按钮数量: ${presetFound}/4`);

    // 4. 验证杠杆显示（含 x 的数字，如 200x）
    const leverageEl = page.locator('text=/\\d+x/i').first();
    const hasLeverage = await leverageEl.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasLeverage) {
      const leverageLabel = page.locator('text=/杠杆|Leverage/i').first();
      const hasLeverageLabel = await leverageLabel.isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`[test] ${hasLeverageLabel ? '✅' : '⚠️'} 杠杆标签: ${hasLeverageLabel ? '可见' : '未找到'}`);
    } else {
      const leverageText = (await leverageEl.textContent()) || '';
      console.log(`[test] ✅ 杠杆倍数: ${leverageText.trim()}`);
    }

    // 5. 验证强平价格标签
    const liqKeywords = ['强平价格', '强平价', 'Liq. Price', 'Liq Price'];
    let liqFound = false;
    for (const kw of liqKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到强平价格标签: "${kw}"`);
        liqFound = true;
        break;
      }
    }
    if (!liqFound) console.log('[test] ⚠️ 未找到强平价格标签');

    // 6. 验证盈利分成模式 or 手续费模式 选项
    const modeKeywords = ['利润分成模式', '手续费模式', '盈利分成'];
    let modeFound = false;
    for (const kw of modeKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到交易模式选项: "${kw}"`);
        modeFound = true;
        break;
      }
    }
    if (!modeFound) console.log('[test] ⚠️ 未找到交易模式选项');

    // 7. 验证可用余额区域
    const balanceKeywords = ['可用', 'Available'];
    let balanceFound = false;
    for (const kw of balanceKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到可用余额标签: "${kw}"`);
        balanceFound = true;
        break;
      }
    }
    if (!balanceFound) console.log('[test] ⚠️ 未找到可用余额区域');

    // 8. 截图
    await page.screenshot({ path: `test-results/shield-page-check-order-panel-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 5：订单簿
  // ========================================================
  test('订单簿', async ({ loggedInPage: page }) => {
    // 复用已打开的页面
    // Shield 页面可能不显示传统订单簿，以 warn 方式探测

    // 1. 尝试查找订单簿容器（class 含 orderbook / depth）
    const obSelectors = [
      '[class*="orderbook"]', '[class*="order-book"]', '[class*="OrderBook"]',
      '[class*="order_book"]', '[class*="depth"]', '[class*="Depth"]',
    ];
    let obFound = false;
    for (const sel of obSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 订单簿容器: "${sel}"`);
        obFound = true;
        break;
      }
    }
    if (!obFound) console.log('[test] ⚠️ Shield 页面未检测到订单簿容器（该页面可能不显示订单簿）');

    // 2. 检查卖单/买单颜色行（如有）
    const redRows = page.locator('[class*="sell"], [class*="Sell"], [class*="ask"], [class*="Ask"]');
    const greenRows = page.locator('[class*="buy"], [class*="Buy"], [class*="bid"], [class*="Bid"]');
    const redCount = await redRows.count();
    const greenCount = await greenRows.count();
    console.log(`[test] ${redCount >= 3 ? '✅' : '⚠️'} 卖单行数: ${redCount}`);
    console.log(`[test] ${greenCount >= 3 ? '✅' : '⚠️'} 买单行数: ${greenCount}`);

    // 3. 截图
    await page.screenshot({ path: `test-results/shield-page-check-orderbook-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 6：最新成交
  // ========================================================
  test('最新成交', async ({ loggedInPage: page }) => {
    // 复用已打开的页面

    // 1. 点击 最新成交 Tab，等待 500ms
    const tradeTabKeywords = ['最新成交', '最近成交', '成交记录', 'Trades', 'Recent Trades'];
    let tradeTabFound = false;
    for (const kw of tradeTabKeywords) {
      const el = page.locator(`button:has-text("${kw}"), [role="tab"]:has-text("${kw}")`).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        await page.waitForTimeout(500);
        console.log(`[test] ✅ 点击最新成交 Tab: "${kw}"`);
        tradeTabFound = true;
        break;
      }
    }
    if (!tradeTabFound) console.log('[test] ⚠️ 未找到最新成交 Tab，直接检测数据行');

    // 2. 等待 1 秒，统计成交行数，>= 3 or warn
    await page.waitForTimeout(1000);
    const tradeRows = page.locator(
      '[class*="trade"] tr, [class*="Trade"] tr, [class*="trade-list"] div[class*="row"], ' +
      '[role="tab"][aria-selected="true"] ~ * tr, [class*="recent"] li, [class*="Recent"] li'
    );
    const rowCount = await tradeRows.count();
    console.log(`[test] ${rowCount >= 3 ? '✅' : '⚠️'} 成交记录行数: ${rowCount}`);

    // 3. 验证第一行含数字
    if (rowCount > 0) {
      const firstRowText = (await tradeRows.first().textContent()) || '';
      const hasNumber = /\d+(\.\d+)?/.test(firstRowText);
      console.log(`[test] ${hasNumber ? '✅' : '⚠️'} 第一行含数值: "${firstRowText.trim().slice(0, 80)}"`);
    }

    // 4. 截图
    await page.screenshot({ path: `test-results/shield-page-check-trades-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 7：底部面板 Tabs
  // ========================================================
  test('底部面板 Tabs', async ({ loggedInPage: page }) => {
    // 复用已打开的页面

    // 1. 依次点击 Shield 页面底部 Tabs，每次等待 1 秒
    // Shield 底部 Tabs：持仓、仓位历史、交易历史、充值和提现、资产
    const bottomTabs = [
      { name: '持仓',       keywords: ['持仓', 'Positions'] },
      { name: '仓位历史',   keywords: ['仓位历史', 'Position History'] },
      { name: '交易历史',   keywords: ['交易历史', 'Trade History'] },
      { name: '资产',       keywords: ['资产', 'Assets', 'Balance'] },
    ];

    for (const tabDef of bottomTabs) {
      let clicked = false;
      for (const kw of tabDef.keywords) {
        const tab = page.locator(`button[role="tab"]:has-text("${kw}")`).first();
        if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
          await tab.click();
          await page.waitForTimeout(1000);
          console.log(`[test] ✅ 切换到 Tab: "${kw}"`);
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        console.log(`[test] ⚠️ 未找到 Tab: "${tabDef.name}"`);
        continue;
      }

      // 2. 每个 Tab 验证面板内容（表格行 or 空状态文字）
      const hasRows = await page
        .locator('tbody tr, [role="row"], tr[class], div[role="rowgroup"] > div')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const hasEmptyState = await page
        .locator('text=/暂无数据|No Data|No orders|No positions|暂无|没有/i')
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      const hasJsRows = !hasRows && !hasEmptyState && await page.evaluate(() => {
        const rows = document.querySelectorAll('tbody tr, [role="row"], tr');
        return rows.length > 0;
      });
      const panelLoaded = hasRows || hasEmptyState || hasJsRows;
      console.log(
        `[test] ${panelLoaded ? '✅' : '⚠️'} "${tabDef.name}" 面板已加载: ` +
        `${panelLoaded ? (hasRows ? '有数据行' : '空状态') : '未检测到内容'}`
      );
    }

    // 3. 验证 TWAP Tab 是否存在
    const twapTab = page.locator('button[role="tab"]:has-text("TWAP"), [role="tab"]:has-text("TWAP")').first();
    const hasTwap = await twapTab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${hasTwap ? '✅' : '⚠️'} TWAP Tab: ${hasTwap ? '可见' : '未找到'}`);

    // 4. 截图
    await page.screenshot({ path: `test-results/shield-page-check-bottom-tabs-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 8：全页截图
  // ========================================================
  test('全页截图', async ({ loggedInPage: page }) => {
    // 1. 滚动回顶部，等待 500ms
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // 2. fullPage 截图保存
    const filename = `test-results/shield-page-check-full-${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`[test] ✅ 全页截图已保存: ${filename}`);
  });

});
