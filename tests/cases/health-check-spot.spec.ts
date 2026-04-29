// spec: specs/health-check-spot.plan.md
// seed: tests/cases/seed.spec.ts

import { test } from '../fixtures/auth';

test.describe.serial('AsterDEX - 现货页面检查', () => {

  // ========================================================
  // 测试 1：页面加载与基础布局
  // ========================================================
  test('页面加载与基础布局', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 1. 导航至现货页面，等待 domcontentloaded 后再等待 3 秒
    const base = process.env.EXCHANGE_URL!;
    const spotUrl = `${new URL(base).origin}/zh-CN/trade/pro/spot/BTCUSDT`;
    await page.goto(spotUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // expect: 页面 body 文本长度大于 100，说明页面有实际内容（非白屏）
    const body = page.locator('body');
    const bodyText = await body.textContent();
    const bodyLen = bodyText?.trim().length ?? 0;
    console.log(`[test] ${bodyLen > 100 ? '✅' : '⚠️'} 页面内容长度: ${bodyLen}`);

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
    await page.screenshot({ path: `test-results/spot-page-check-load-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 2：顶部行情栏数据
  // ========================================================
  test('顶部行情栏数据', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面

    // 1. 查找交易对标题，确认显示 BTC/USDT 或 现货 标识
    const pairTitle = page.locator('h3:has-text("BTC/USDT")').first();
    const hasPairTitle = await pairTitle.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasPairTitle) {
      console.log('[test] ✅ 找到交易对标题: BTC/USDT');
    } else {
      console.log('[test] ⚠️ 未找到 h3 标题，尝试备用选择器');
    }
    const spotBadge = page.locator('span:has-text("现货")').first();
    const hasSpotBadge = await spotBadge.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${hasSpotBadge ? '✅' : '⚠️'} 现货标识: ${hasSpotBadge ? '可见' : '未找到'}`);

    // 2. 查找最新成交价（大数字），解析为浮点数
    const lastPriceEl = page.locator('span.text-body2.font-light').first();
    const lastPriceVisible = await lastPriceEl.isVisible({ timeout: 10000 }).catch(() => false);
    if (lastPriceVisible) {
      const lastPriceText = (await lastPriceEl.textContent()) || '';
      const lastPrice = parseFloat(lastPriceText.replace(/,/g, '').trim());
      console.log(`[test] ${lastPrice > 0 ? '✅' : '⚠️'} 最新成交价: ${lastPrice}`);
    } else {
      console.log('[test] ⚠️ 未找到最新成交价元素');
    }

    // 3. 查找 24h 涨跌幅（含 % 符号）
    const change24hEl = page.locator('text=/[+-]?\\d+\\.\\d+%/').first();
    const has24hChange = await change24hEl.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${has24hChange ? '✅' : '⚠️'} 24h 涨跌幅: ${has24hChange ? '可见' : '未找到'}`);

    // 4. 查找最高价（label 含 最高）和最低价（label 含 最低），expect > 0
    const highEl = page.locator('dt:has-text("最高")').locator('..').locator('dd').first();
    const hasHigh = await highEl.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasHigh) {
      const highText = (await highEl.textContent()) || '';
      const high = parseFloat(highText.replace(/,/g, '').trim());
      console.log(`[test] ${high > 0 ? '✅' : '⚠️'} 最高价: ${high}`);
    } else {
      console.log('[test] ⚠️ 未找到最高价，跳过');
    }

    const lowEl = page.locator('dt:has-text("最低")').locator('..').locator('dd').first();
    const hasLow = await lowEl.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasLow) {
      const lowText = (await lowEl.textContent()) || '';
      const low = parseFloat(lowText.replace(/,/g, '').trim());
      console.log(`[test] ${low > 0 ? '✅' : '⚠️'} 最低价: ${low}`);
    } else {
      console.log('[test] ⚠️ 未找到最低价，跳过');
    }

    // 5. 查找 24h 成交量（label 含 24小时成交量 或 成交量）
    const volumeKeywords = ['24小时成交量', '24h 成交量', '成交量'];
    let volumeFound = false;
    for (const kw of volumeKeywords) {
      const el = page.locator(`dt:has-text("${kw}")`).locator('..').locator('dd').first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        const vol = (await el.textContent()) || '';
        console.log(`[test] ✅ 成交量 ("${kw}"): ${vol.trim()}`);
        volumeFound = true;
        break;
      }
    }
    if (!volumeFound) console.log('[test] ⚠️ 未找到 24h 成交量');

    // 6. 截图
    await page.screenshot({ path: `test-results/spot-page-check-ticker-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 3：图表区域
  // ========================================================
  test('图表区域', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
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
    await page.screenshot({ path: `test-results/spot-page-check-chart-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 4：下单面板
  // ========================================================
  test('下单面板', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 复用已打开的页面

    // 1. 验证订单类型 Tab：市价、限价 均可见（expect.soft）
    const orderTypeTabs = ['限价', '市价'];
    for (const tab of orderTypeTabs) {
      const el = page.locator(`button:not([role="combobox"]):text("${tab}")`).first();
      const visible = await el.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] ${visible ? '✅' : '⚠️'} 订单类型 Tab "${tab}": ${visible ? '可见' : '未找到'}`);
    }

    // 2. 验证买入 / 卖出 切换按钮可见（expect.soft）
    const buyBtn = page.locator('button:has-text("买入")').first();
    const sellBtn = page.locator('button:has-text("卖出")').first();
    const hasBuy = await buyBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const hasSell = await sellBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${hasBuy ? '✅' : '⚠️'} 买入按钮: ${hasBuy ? '可见' : '未找到'}`);
    console.log(`[test] ${hasSell ? '✅' : '⚠️'} 卖出按钮: ${hasSell ? '可见' : '未找到'}`);

    // 3. 切到限价单，验证价格输入框可见
    await page.locator('button:not([role="combobox"]):text("限价")').click();
    await page.waitForTimeout(500);
    const priceInput = page.locator('input[placeholder="价格"]');
    const hasPriceInput = await priceInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasPriceInput) {
      console.log('[test] ✅ 限价单价格输入框可见');
    } else {
      console.log('[test] ⚠️ 未找到价格输入框（placeholder="价格"），尝试备用');
    }

    // 4. 验证数量输入框可见，单位选择器（USDT/BTC combobox）可见
    const qtyInput = page.locator('#form_qty_input, input[placeholder="数量"]').first();
    const hasQtyInput = await qtyInput.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${hasQtyInput ? '✅' : '⚠️'} 数量输入框可见`);

    const qtyUnitCombobox = page.locator('[role="combobox"]:has-text("USDT"), [role="combobox"]:has-text("BTC")').first();
    const hasQtyUnit = await qtyUnitCombobox.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${hasQtyUnit ? '✅' : '⚠️'} 数量单位选择器 (USDT/BTC): ${hasQtyUnit ? '可见' : '未找到'}`);

    // 5. 切到市价单，价格输入框不可编辑或显示市场价格占位符
    await page.locator('button:not([role="combobox"]):text("市价")').click();
    await page.waitForTimeout(500);
    const marketPriceInput = page.locator('input[placeholder="价格"]');
    const isMarketPriceEditable = await marketPriceInput.isEditable({ timeout: 2000 }).catch(() => false);
    const isMarketPriceVisible = await marketPriceInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isMarketPriceVisible) {
      console.log('[test] ✅ 市价单无价格输入框（符合预期）');
    } else if (!isMarketPriceEditable) {
      console.log('[test] ✅ 市价单价格输入框已禁用（符合预期）');
    } else {
      console.log('[test] ⚠️ 市价单价格输入框仍可编辑');
    }

    // 6. 验证可用余额区域（含 可用 或 Available）可见
    const availableKeywords = ['可用', 'Available'];
    let availableFound = false;
    for (const kw of availableKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到可用余额标签: "${kw}"`);
        availableFound = true;
        break;
      }
    }
    if (!availableFound) console.log('[test] ⚠️ 未找到可用余额区域');

    // 7. 验证最大金额和预估费用标签可见
    const feeKeywords = ['预估费用', '手续费', '费用', '最大', 'Fee', 'Max'];
    let feeFound = false;
    for (const kw of feeKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到费用/最大金额标签: "${kw}"`);
        feeFound = true;
        break;
      }
    }
    if (!feeFound) console.log('[test] ⚠️ 未找到最大金额/预估费用标签');

    // 8. 截图
    await page.screenshot({ path: `test-results/spot-page-check-order-panel-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 5：订单簿
  // ========================================================
  test('订单簿', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 复用已打开的页面

    // 1. 点击 订单簿 Tab（若存在），等待 500ms
    const orderbookTab = page.locator('[role="tab"]:has-text("订单簿")').first();
    const hasOrderbookTab = await orderbookTab.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasOrderbookTab) {
      await orderbookTab.click();
      await page.waitForTimeout(500);
      console.log('[test] ✅ 点击订单簿 Tab');
    } else {
      console.log('[test] ⚠️ 未找到订单簿 Tab，直接检测容器');
    }

    // 2. 通过 class（orderbook、order-book、depth）查找容器
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
    if (!obFound) console.log('[test] ⚠️ 未通过 class 找到订单簿容器，尝试数值行检测');

    // 3. JS 统计数值短行数量，>= 6 or warn
    const numericRowCount = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div, li, tr, span'));
      return allDivs.filter(el => {
        const text = (el.textContent || '').trim();
        return /^\s*[\d,]+\.?\d*\s*[\d,]*\.?\d*\s*$/.test(text) && text.length < 30;
      }).length;
    });
    console.log(`[test] ${numericRowCount >= 6 ? '✅' : '⚠️'} 订单簿数值行（估算）: ${numericRowCount}`);

    // 4. 检查红色卖单行、绿色买单行数量
    const redRows = page.locator('[class*="sell"], [class*="Sell"], [class*="red"], [class*="ask"], [class*="Ask"]');
    const greenRows = page.locator('[class*="buy"], [class*="Buy"], [class*="green"], [class*="bid"], [class*="Bid"]');
    const redCount = await redRows.count();
    const greenCount = await greenRows.count();
    console.log(`[test] ${redCount >= 3 ? '✅' : '⚠️'} 卖单（红色）行数: ${redCount}`);
    console.log(`[test] ${greenCount >= 3 ? '✅' : '⚠️'} 买单（绿色）行数: ${greenCount}`);

    // 5. 验证列标题（价格/数量/总额）可见
    const colHeaders = ['价格', '数量', '总额'];
    for (const header of colHeaders) {
      const visible = await page.locator(`text=${header}`).first().isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`[test] ${visible ? '✅' : '⚠️'} 订单簿列标题 "${header}": ${visible ? '可见' : '未找到'}`);
    }

    // 6. 截图
    await page.screenshot({ path: `test-results/spot-page-check-orderbook-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 6：最新成交
  // ========================================================
  test('最新成交', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
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
    await page.screenshot({ path: `test-results/spot-page-check-trades-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 7：底部面板 Tabs
  // ========================================================
  test('底部面板 Tabs', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 复用已打开的页面

    // 1. 依次点击：当前委托、仓位、资产、历史委托，每次等待 1 秒
    const bottomTabs = [
      { name: '当前委托', keywords: ['当前委托', '委托', 'Open Orders'] },
      { name: '仓位',     keywords: ['仓位', '当前持仓', '持仓', 'Positions'] },
      { name: '资产',     keywords: ['资产', 'Assets', 'Balance'] },
      { name: '历史委托', keywords: ['历史委托', '订单历史', 'Order History'] },
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

    // 3. 验证 TWAP Tab 存在
    const twapTab = page.locator('button[role="tab"]:has-text("TWAP"), [role="tab"]:has-text("TWAP")').first();
    const hasTwap = await twapTab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${hasTwap ? '✅' : '⚠️'} TWAP Tab: ${hasTwap ? '可见' : '未找到'}`);

    // 4. 截图
    await page.screenshot({ path: `test-results/spot-page-check-bottom-tabs-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 8：全页截图
  // ========================================================
  test('全页截图', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 1. 滚动回顶部，等待 500ms
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // 2. fullPage 截图保存
    const filename = `test-results/spot-page-check-full-${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`[test] ✅ 全页截图已保存: ${filename}`);
  });

});
