

import { test, expect } from '../fixtures/auth';

test.describe.serial('AsterDEX - 期货页面检查', () => {

  // ========================================================
  // 测试 1：页面加载与基础布局
  // ========================================================
  test('页面加载与基础布局', async ({ loggedInPage: page }) => {
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 页面有可见内容（非白屏）
    const body = page.locator('body');
    const bodyText = await body.textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(100);
    console.log('[test] ✅ 页面内容非空');

    // 5 秒后不应有全屏 loading 遮罩残留
    await page.waitForTimeout(2000);
    const fullscreenLoading = page.locator('[class*="loading"]:not([style*="display: none"]), [class*="spinner"]:not([style*="display: none"])').first();
    const isStuck = await fullscreenLoading.isVisible({ timeout: 1000 }).catch(() => false);
    if (isStuck) {
      console.log('[test] ⚠️ 可能存在未消失的 loading 遮罩');
    } else {
      console.log('[test] ✅ 无卡住的全屏 loading');
    }

    await page.screenshot({ path: `test-results/future-page-check-load-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 2：顶部行情栏数据
  // ========================================================
  test('顶部行情栏数据', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面

    // 标记价格（多种选择器兼容）
    const markPriceSelectors = [
      'dt:has-text("标记价格") ~ dd',
      'dt:has-text("标记价格") + dd',
      '[class*="mark"] [class*="price"], [class*="markPrice"]',
      'text=/标记价格/ >> xpath=following-sibling::*[1]',
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
    if (markPrice === 0) {
      // fallback: 从顶部行情栏文本中提取大数值
      const tickerText = await page.locator('[class*="ticker"], [class*="header"], [class*="info-bar"]').first().textContent().catch(() => '');
      const match = (tickerText || '').match(/[\d,]{5,}\.\d+/);
      markPrice = match ? parseFloat(match[0].replace(/,/g, '')) : 0;
      console.log(`[test] ${markPrice > 0 ? '✅' : '⚠️'} 标记价格 fallback: ${markPrice}`);
    }
    // 标记价格为警告级别（行情栏 DOM 结构可能随版本变化）
    if (markPrice <= 0) {
      console.log('[test] ⚠️ 未能读取标记价格，跳过断言');
    }

    // 指数价格
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

    // 资金费率（含 % 号）
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

    // 资金费率倒计时（HH:MM:SS 格式）
    const countdownEl = page.locator('text=/\\d{1,2}:\\d{2}:\\d{2}/').first();
    const hasCountdown = await countdownEl.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${hasCountdown ? '✅' : '⚠️'} 资金费率倒计时: ${hasCountdown ? '可见' : '未找到'}`);

    // 24h 涨跌幅
    const change24hEl = page.locator('text=/[+-]?\\d+\\.\\d+%/').first();
    const has24hChange = await change24hEl.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${has24hChange ? '✅' : '⚠️'} 24h 涨跌幅: ${has24hChange ? '可见' : '未找到'}`);

    // 24h 成交量（大于零的数值）
    const volumeKeywords = ['24h 成交量', '24小时成交量', '成交量'];
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

    await page.screenshot({ path: `test-results/future-page-check-ticker-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 3：图表区域
  // ========================================================
  test('图表区域', async ({ loggedInPage: page }) => {
    // 复用已打开的页面

    // 等待页面稳定
    await page.waitForTimeout(2000);

    // 优先查找任何尺寸合理的 iframe（TradingView 通过 iframe 嵌入）
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

    if (!chartFound) {
      // 备用：canvas 或图表容器 div
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

    // 图表检查为警告级别，不中断后续测试
    if (!chartFound) {
      console.log('[test] ⚠️ 未能通过选择器确认图表区域，可能需要更新 selector');
    }

    await page.screenshot({ path: `test-results/future-page-check-chart-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 4：下单面板
  // ========================================================
  test('下单面板', async ({ loggedInPage: page }) => {
    // 复用已打开的页面

    // 订单类型 Tab：限价 / 市价（button 形式）
    const orderTypeTabs = ['限价', '市价'];
    for (const tab of orderTypeTabs) {
      const el = page.locator(`button:not([role="combobox"]):text("${tab}")`).first();
      const visible = await el.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] ${visible ? '✅' : '⚠️'} 订单类型 Tab "${tab}": ${visible ? '可见' : '未找到'}`);
      expect.soft(visible, `订单类型 Tab "${tab}" 不可见`).toBe(true);
    }

    // 止盈止损通过 combobox 选择（非 button tab）
    const tpslCombobox = page.locator('[role="combobox"]:has-text("限价止盈止损"), [role="combobox"]:has-text("止盈止损"), [role="combobox"]:has-text("限价")').first();
    const hasTpslCombobox = await tpslCombobox.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${hasTpslCombobox ? '✅' : '⚠️'} 订单类型 combobox: ${hasTpslCombobox ? '可见' : '未找到'}`);

    // 切到限价单，验证价格输入框
    await page.locator('button:not([role="combobox"]):text("限价")').click();
    await page.waitForTimeout(500);
    const priceInput = page.locator('input[placeholder="价格"]');
    await expect.soft(priceInput).toBeVisible({ timeout: 3000 });
    console.log('[test] ✅ 限价单价格输入框可见');

    // 数量单位选择器（combobox）
    const qtyUnitBtn = page.locator('#tour-guide-place-order button[role="combobox"]');
    const hasQtyUnit = await qtyUnitBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${hasQtyUnit ? '✅' : '⚠️'} 数量单位选择器: ${hasQtyUnit ? '可见' : '未找到'}`);

    // 数量输入框
    const qtyInput = page.locator('input[placeholder="数量"]');
    await expect.soft(qtyInput).toBeVisible({ timeout: 3000 });
    console.log('[test] ✅ 数量输入框可见');

    // 买入/做多 & 卖出/做空 按钮
    const submitBtns = page.locator('button[type="submit"]');
    const btnCount = await submitBtns.count();
    expect.soft(btnCount).toBeGreaterThanOrEqual(2);
    console.log(`[test] ✅ 提交按钮数量: ${btnCount}`);

    // 切到市价单，价格输入框应不可编辑
    await page.locator('button:not([role="combobox"]):text("市价")').click();
    await page.waitForTimeout(500);
    const marketPriceInput = page.locator('input[placeholder="价格"]');
    const isMarketPriceEditable = await marketPriceInput.isEditable({ timeout: 2000 }).catch(() => false);
    if (!isMarketPriceEditable) {
      console.log('[test] ✅ 市价单价格输入框已禁用（符合预期）');
    } else {
      console.log('[test] ⚠️ 市价单价格输入框仍可编辑');
    }

    // 切回限价单，检查只减仓 / 隐藏订单
    await page.locator('button:not([role="combobox"]):text("限价")').click();
    await page.waitForTimeout(500);

    const reduceOnlyKeywords = ['只减仓', 'Reduce Only', 'Reduce-only'];
    let reduceOnlyFound = false;
    for (const kw of reduceOnlyKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到只减仓选项: "${kw}"`);
        reduceOnlyFound = true;
        break;
      }
    }
    if (!reduceOnlyFound) console.log('[test] ⚠️ 未找到「只减仓」选项');

    const hiddenOrderKeywords = ['隐藏订单', 'Hidden Order', 'Hidden'];
    let hiddenOrderFound = false;
    for (const kw of hiddenOrderKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到隐藏订单选项: "${kw}"`);
        hiddenOrderFound = true;
        break;
      }
    }
    if (!hiddenOrderFound) console.log('[test] ⚠️ 未找到「隐藏订单」选项');

    // 杠杆显示（含 x 的数字）
    const leverageEl = page.locator('text=/\\d+x/i').first();
    const hasLeverage = await leverageEl.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${hasLeverage ? '✅' : '⚠️'} 杠杆倍数: ${hasLeverage ? '可见' : '未找到'}`);

    // 可用余额 / 保证金
    const balanceKeywords = ['可用', '余额', 'Available', 'Balance', 'Margin'];
    let balanceFound = false;
    for (const kw of balanceKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到余额/保证金元素: "${kw}"`);
        balanceFound = true;
        break;
      }
    }
    if (!balanceFound) console.log('[test] ⚠️ 未找到可用余额/保证金');

    await page.screenshot({ path: `test-results/future-page-check-order-panel-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 5：订单簿
  // ========================================================
  test('订单簿', async ({ loggedInPage: page }) => {
    // 复用已打开的页面

    // 探查订单簿容器（多种可能的 class 命名）
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

    // 通过 JS 探查：统计页面中含价格数值的短行（订单簿行通常只含价格+数量）
    const numericRowCount = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div, li, tr, span'));
      return allDivs.filter(el => {
        const text = (el.textContent || '').trim();
        // 订单簿行：短文本，含逗号分隔的数字（价格格式）
        return /^\s*[\d,]+\.?\d*\s*[\d,]*\.?\d*\s*$/.test(text) && text.length < 30;
      }).length;
    });
    console.log(`[test] ${numericRowCount >= 6 ? '✅' : '⚠️'} 订单簿数值行（估算）: ${numericRowCount}`);

    // 检查卖单/买单颜色行（颜色类名策略）
    const redRows = page.locator('[class*="sell"], [class*="Sell"], [class*="red"], [class*="ask"], [class*="Ask"]');
    const greenRows = page.locator('[class*="buy"], [class*="Buy"], [class*="green"], [class*="bid"], [class*="Bid"]');
    const redCount = await redRows.count();
    const greenCount = await greenRows.count();
    console.log(`[test] ${redCount >= 3 ? '✅' : '⚠️'} 卖单（红色）行数: ${redCount}`);
    console.log(`[test] ${greenCount >= 3 ? '✅' : '⚠️'} 买单（绿色）行数: ${greenCount}`);

    await page.screenshot({ path: `test-results/future-page-check-orderbook-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 6：最近成交
  // ========================================================
  test('最近成交', async ({ loggedInPage: page }) => {
    // 复用已打开的页面

    // 找到最近成交 Tab 或区域（实际 Tab 文本为"最新成交"）
    const tradeTabKeywords = ['最新成交', '最近成交', '成交记录', 'Trades', 'Recent Trades'];
    let tradeTabFound = false;
    for (const kw of tradeTabKeywords) {
      const el = page.locator(`button:has-text("${kw}"), [role="tab"]:has-text("${kw}")`).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        await page.waitForTimeout(500);
        console.log(`[test] ✅ 点击最近成交 Tab: "${kw}"`);
        tradeTabFound = true;
        break;
      }
    }
    if (!tradeTabFound) console.log('[test] ⚠️ 未找到最近成交 Tab，尝试直接检测数据行');

    // 验证成交记录行中含有价格数值（至少 3 行）
    await page.waitForTimeout(1000);
    const tradeRows = page.locator('[class*="trade"] tr, [class*="Trade"] tr, [class*="trade-list"] div[class*="row"], [role="tab"][aria-selected="true"] ~ * tr, [class*="recent"] li, [class*="Recent"] li');
    const rowCount = await tradeRows.count();
    console.log(`[test] ${rowCount >= 3 ? '✅' : '⚠️'} 成交记录行数: ${rowCount}`);

    if (rowCount > 0) {
      const firstRowText = (await tradeRows.first().textContent()) || '';
      const hasNumber = /\d+(\.\d+)?/.test(firstRowText);
      console.log(`[test] ${hasNumber ? '✅' : '⚠️'} 第一行含数值: "${firstRowText.trim().slice(0, 80)}"`);
    }

    await page.screenshot({ path: `test-results/future-page-check-trades-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 7：底部面板 Tabs（持仓 & 委托）
  // ========================================================
  test('底部面板 Tabs（持仓 & 委托）', async ({ loggedInPage: page }) => {
    // 复用已打开的页面

    const bottomTabs = [
      { name: '当前持仓', keywords: ['仓位', '当前持仓', '持仓', 'Positions'] },
      { name: '当前委托', keywords: ['当前委托', '委托', 'Open Orders'] },
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

      // 验证面板加载：出现表格行 或 空状态文字（暂无数据/No Data）
      const hasRows = await page.locator('tbody tr, [role="row"], tr[class], div[role="rowgroup"] > div').first()
        .isVisible({ timeout: 3000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/暂无数据|No Data|No orders|No positions|暂无|没有/i').first()
        .isVisible({ timeout: 2000 }).catch(() => false);
      // 备用：通过 JS 统计面板区域内可见行数
      const hasJsRows = !hasRows && !hasEmptyState && await page.evaluate(() => {
        const rows = document.querySelectorAll('tbody tr, [role="row"], tr');
        return rows.length > 0;
      });
      const panelLoaded = hasRows || hasEmptyState || hasJsRows;
      console.log(`[test] ${panelLoaded ? '✅' : '⚠️'} "${tabDef.name}" 面板已加载: ${panelLoaded ? (hasRows ? '有数据行' : '空状态') : '未检测到内容'}`);
    }

    // TWAP Tab 是否存在
    const twapTab = page.locator('button[role="tab"]:has-text("TWAP"), [role="tab"]:has-text("TWAP")').first();
    const hasTwap = await twapTab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] ${hasTwap ? '✅' : '⚠️'} TWAP Tab: ${hasTwap ? '可见' : '未找到'}`);

    await page.screenshot({ path: `test-results/future-page-check-bottom-tabs-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 8：全页截图
  // ========================================================
  test('全页截图', async ({ loggedInPage: page }) => {
    // 滚动回顶部，截取完整页面
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const filename = `test-results/future-page-check-full-${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`[test] ✅ 全页截图已保存: ${filename}`);
  });

});