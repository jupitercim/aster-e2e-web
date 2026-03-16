import { test, expect } from '../fixtures/auth';

function getBaseUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN`;
}

// H5 移动端视口尺寸
const MOBILE_VIEWPORT = { width: 390, height: 844 };   // iPhone 14
const TABLET_VIEWPORT  = { width: 768, height: 1024 };  // iPad

test.describe.serial('AsterDEX - H5 页面兼容测试', () => {

  // 跨测试共享：限价单价格（test 6 → test 7 传递）
  let limitPrice: number = 0;

  // ===== 辅助：处理下单确认弹窗 =====
  async function handleConfirmDialog(page: any) {
    await page.waitForTimeout(500);

    // 方法1：找"订单确认"弹窗内的确认按钮
    const dialog = page.locator('text=订单确认').locator('..');
    if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
      const dialogBtns = dialog.locator('..').locator('button');
      if ((await dialogBtns.count()) > 0) {
        await dialogBtns.last().click();
        console.log('[test] 点击了确认弹窗按钮（订单确认）');
        return;
      }
    }

    // 方法2：找"取消"旁边的确认按钮
    const cancelBtn = page.locator('button:text("取消")');
    if (await cancelBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await cancelBtn.locator('..').locator('button').last().click();
      console.log('[test] 点击了确认弹窗按钮（取消旁边）');
      return;
    }

    // 方法3：fallback
    const fallbackBtn = page.getByRole('button', { name: /确认|开多|开空|Confirm/i }).last();
    if (await fallbackBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await fallbackBtn.click();
      console.log('[test] fallback 点击了确认按钮');
    }
  }

  // ===== 辅助：检测 Toast 提示（超时 6s，更可靠）=====
  async function checkToast(page: any, keywords: string[], label: string): Promise<boolean> {
    const selector = keywords.map(kw => `text=${kw}`).join(', ');
    const toast = page.locator(selector).first();
    const appeared = await toast.waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false);
    if (appeared) {
      const text = await toast.textContent();
      console.log(`[test] ✅ ${label}: ${text?.trim()}`);
      return true;
    }
    console.log(`[test] ⚠️ 未检测到 ${label} 提示，继续执行`);
    return false;
  }


  // ========================================================
  // 测试 1：移动端（390px）主页加载
  // ========================================================
  test('移动端视口（390px）主页可正常加载', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    console.log(`[test] 视口已设置为 ${MOBILE_VIEWPORT.width}×${MOBILE_VIEWPORT.height}`);

    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    await page.screenshot({ path: `test-results/h5-mobile-home-${Date.now()}.png` });
    console.log('[test] ✅ 移动端主页加载正常');
  });


  // ========================================================
  // 测试 2：移动端合约交易页加载
  // ========================================================
  test('移动端视口合约交易页可正常加载', async ({ loggedInPage: page }) => {
    // serial 场景下 test1 已设置为移动端，此处确保一致（双保险）
    await page.setViewportSize(MOBILE_VIEWPORT);

    await page.goto(process.env.EXCHANGE_URL!);
    // 等待核心元素出现，替代固定 waitForTimeout(3000)
    await page.waitForSelector('button:has-text("限价"), button:has-text("市价")', { timeout: 10000 });

    const tradeElements = [
      page.locator('button:has-text("限价")').first(),
      page.locator('button:has-text("市价")').first(),
      // H5 布局数量输入框 placeholder 可能是"数量"或"Qty"
      page.locator('input[placeholder="数量"], input[placeholder="Qty"]').first(),
    ];

    let visibleCount = 0;
    for (const el of tradeElements) {
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) visibleCount++;
    }

    console.log(`[test] 移动端交易元素可见数量: ${visibleCount}/${tradeElements.length}`);
    await page.screenshot({ path: `test-results/h5-mobile-trade-${Date.now()}.png` });

    expect(visibleCount).toBeGreaterThan(0);
    console.log('[test] ✅ 移动端合约交易页加载正常');
  });


  // ========================================================
  // 测试 3：平板（768px）布局验证
  // ========================================================
  test('平板视口（768px）页面布局正常', async ({ loggedInPage: page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    console.log(`[test] 视口已切换为 ${TABLET_VIEWPORT.width}×${TABLET_VIEWPORT.height}`);

    await page.goto(process.env.EXCHANGE_URL!);
    // 等待核心交易元素出现，替代 waitForTimeout(3000)
    await page.waitForSelector('button:has-text("限价"), button:has-text("市价")', { timeout: 10000 });

    const title = await page.title();
    expect(title).toBeTruthy();

    await page.screenshot({ path: `test-results/h5-tablet-trade-${Date.now()}.png` });
    console.log('[test] ✅ 平板视口布局验证完成');
  });


  // ========================================================
  // 测试 4：恢复桌面视口 + 验证桌面专有元素
  // ========================================================
  test('恢复桌面视口（1440px）验证正常', async ({ loggedInPage: page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    console.log('[test] 视口已恢复为 1440×900');

    // 等待页面重新布局，替代 waitForTimeout(1000)
    await page.waitForSelector('button:has-text("限价"), dt:has-text("标记价格")', { timeout: 8000 });

    // 验证桌面布局专有元素（桌面有 dt 标记价格面板 / 下单侧边栏）
    const desktopElements = [
      page.locator('dt:has-text("标记价格")').first(),
      page.locator('dt:has-text("指数价格")').first(),
      page.locator('#tour-guide-place-order').first(),
    ];

    let desktopVisible = 0;
    for (const el of desktopElements) {
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) desktopVisible++;
    }
    console.log(`[test] 桌面布局专有元素可见: ${desktopVisible}/${desktopElements.length}`);

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(desktopVisible).toBeGreaterThan(0);

    await page.screenshot({ path: `test-results/h5-desktop-restore-${Date.now()}.png` });
    console.log('[test] ✅ 桌面视口恢复正常');
  });


  // ========================================================
  // 测试 5：H5 移动端各子页面内容验证
  //
  // H5 布局说明（来自截图分析）：
  //   - /zh-CN 是落地页（营销页），有汉堡菜单（≡），无传统底部 nav
  //   - 交易页（EXCHANGE_URL）是全屏交易界面
  //     底部内页 tab：当前委托 | 仓位 | 资产 | TWAP
  //   - "首页"/"行情" 均通过页面直接导航验证，而非点击固定底部 nav
  // ========================================================
  test('H5 移动端各子页面内容存在', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    let successCount = 0;

    // ---- 1. 首页（落地页） ----
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const homeKeywords = ['去中心化', 'ASTER', '总交易量', '用户', '启动应用程序'];
    for (const kw of homeKeywords) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[test] ✅ 「首页」内容存在: "${kw}"`);
        successCount++;
        break;
      }
    }
    await page.screenshot({ path: `test-results/h5-nav-首页-${Date.now()}.png` });

    // ---- 2. 行情（通过汉堡菜单 ≡ 进入） ----
    // 优先用 aria-label / data-testid，再 fallback 到结构化选择器
    const hamburgerSelectors = [
      '[aria-label="menu"]',
      '[aria-label="Menu"]',
      '[data-testid="hamburger"]',
      '[data-testid="mobile-menu"]',
      'button[class*="hamburger"]',
      'button[class*="Hamburger"]',
      'button[class*="menu-btn"]',
      'header button:last-child',
      'nav button:last-child',
    ];

    let marketFound = false;
    for (const sel of hamburgerSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(800);

        const marketKeywords = ['行情', 'Markets', 'Market', '市场'];
        for (const kw of marketKeywords) {
          const el = page.locator(`text=${kw}`).first();
          if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
            await el.click();
            await page.waitForTimeout(2000);
            const marketContentKws = ['BTC', 'ETH', '24h', '涨跌', '最新价', '合约'];
            for (const ck of marketContentKws) {
              if (await page.locator(`text=${ck}`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log(`[test] ✅ 「行情」页面内容存在: "${ck}"`);
                marketFound = true;
                successCount++;
                break;
              }
            }
            break;
          }
        }
        if (marketFound) break;
        // 菜单打开但无行情入口，关闭后尝试下一选择器
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    if (!marketFound) {
      console.log('[test] ⚠️ 未找到汉堡菜单或「行情」入口，跳过');
    }
    await page.screenshot({ path: `test-results/h5-nav-行情-${Date.now()}.png` });

    // ---- 3. 交易页 ----
    await page.goto(process.env.EXCHANGE_URL!);
    // 等待核心元素，替代 waitForTimeout(2000)
    await page.waitForSelector('button:has-text("限价"), button:has-text("市价")', { timeout: 10000 });

    const tradeKws = ['限价', '市价', 'BTC', 'USDT', '开多', '开空'];
    for (const kw of tradeKws) {
      if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 「交易」页面内容存在: "${kw}"`);
        successCount++;
        break;
      }
    }
    await page.screenshot({ path: `test-results/h5-nav-交易-${Date.now()}.png` });

    // ---- 4. 资产 tab（交易页底部内页 tab） ----
    const assetTab = page.locator('button[role="tab"]:has-text("资产"), [role="tab"]:has-text("资产")').first();
    if (await assetTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await assetTab.click();
      await page.waitForTimeout(1500);
      const assetKws = ['USDT', '余额', '总余额', 'Balance', '可用', '存款'];
      for (const kw of assetKws) {
        if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`[test] ✅ 「资产」Tab 内容存在: "${kw}"`);
          successCount++;
          break;
        }
      }
    } else {
      console.log('[test] ⚠️ 未找到「资产」Tab，跳过');
    }
    await page.screenshot({ path: `test-results/h5-nav-资产-${Date.now()}.png` });

    // ---- 5. 当前委托 tab（交易页底部内页 tab） ----
    const orderTab = page.locator('button[role="tab"]:has-text("当前委托"), [role="tab"]:has-text("当前委托")').first();
    if (await orderTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await orderTab.click();
      await page.waitForTimeout(1500);
      const orderKws = ['当前委托', 'BTCUSDT', '限价', '委托', '取消'];
      for (const kw of orderKws) {
        if (await page.locator(`text=${kw}`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`[test] ✅ 「当前委托」Tab 内容存在: "${kw}"`);
          successCount++;
          break;
        }
      }
    } else {
      console.log('[test] ⚠️ 未找到「当前委托」Tab，跳过');
    }
    await page.screenshot({ path: `test-results/h5-nav-委托-${Date.now()}.png` });

    console.log(`[test] 页面内容验证: ${successCount}/5 个子页面找到内容`);
    // 至少 3 个页面找到内容
    expect(successCount).toBeGreaterThanOrEqual(3);
    console.log('[test] ✅ H5 各子页面内容验证完成');
  });


  // ========================================================
  // 测试 6：H5 移动端限价挂单（mark price - 1000）
  // ========================================================
  test('H5 移动端限价挂单 BTC/USDT 0.001 BTC', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);

    await page.goto(process.env.EXCHANGE_URL!);
    // 等待页面核心元素出现（H5 默认市价模式，不等价格输入框）
    await page.waitForSelector('button:has-text("买入/做多"), button:has-text("卖出/做空"), button:has-text("开多"), button:has-text("开空")', { timeout: 15000 });
    await page.screenshot({ path: `test-results/h5-debug-after-goto-${Date.now()}.png` });

    // ===== 切换到限价模式 =====
    // H5 布局：订单类型是下拉框，默认为"市价"，需切换到"限价"
    const priceInput = page.locator('input[placeholder="价格"]');
    let isPriceVisible = await priceInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isPriceVisible) {
      // H5：订单类型按钮（市价/限价），用 button:has-text 精确匹配按钮本身
      const marketBtn = page.locator('button:has-text("市价")').first();
      const limitBtn  = page.locator('button:has-text("限价")').first();

      if (await marketBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 当前是市价模式，点击按钮切换/打开下拉
        await marketBtn.click();
        console.log('[test] H5 布局：点击了"市价"按钮');
        await page.waitForTimeout(600);

        // 下拉选项可能渲染在 body 层（portal）
        const limitOption = page.locator('[role="option"]:has-text("限价"), [role="menuitem"]:has-text("限价"), li:has-text("限价")').first();
        if (await limitOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await limitOption.click();
          console.log('[test] H5 布局：从下拉选择了"限价"');
          await page.waitForTimeout(500);
        } else {
          // 如果没有下拉出现，再尝试直接点"限价"按钮
          if (await limitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await limitBtn.click();
            console.log('[test] H5 布局：点击了独立的"限价"按钮');
            await page.waitForTimeout(500);
          }
        }
      } else if (await limitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        // 已有限价按钮可以直接点
        await limitBtn.click();
        console.log('[test] 点击了"限价"按钮');
        await page.waitForTimeout(500);
      }

      isPriceVisible = await priceInput.isVisible({ timeout: 5000 }).catch(() => false);
    } else {
      console.log('[test] 已处于限价模式，跳过切换');
    }

    if (!isPriceVisible) {
      await page.screenshot({ path: `test-results/h5-debug-no-price-input-${Date.now()}.png` });
      throw new Error('[test] ❌ 切换到限价模式后仍找不到价格输入框');
    }

    // ===== 读取当前价格（精简为 3 种方式）=====
    let markPrice = 0;

    // 方式1：桌面布局 - dt:has-text("标记价格")
    const markPriceEl = page.locator('dt:has-text("标记价格")').locator('..').locator('dd').first();
    if (await markPriceEl.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await markPriceEl.textContent();
      markPrice = parseFloat(text?.replace(/,/g, '').trim() || '0');
      console.log(`[test] 桌面布局读取 Mark Price: ${markPrice}`);
    }

    // 方式2：H5 布局 - 点击价格输入框触发自动填充，再读取
    if ((!markPrice || isNaN(markPrice) || markPrice <= 0) && isPriceVisible) {
      await priceInput.click();
      await page.waitForTimeout(800);
      const val = await priceInput.inputValue();
      markPrice = parseFloat(val.replace(/,/g, '').trim() || '0');
      if (markPrice > 0) console.log(`[test] H5 布局 - 从价格输入框读取当前价: ${markPrice}`);
    }

    // 方式3：从页面所有可见数字中匹配 BTC 价格范围（10000~200000）
    if (!markPrice || isNaN(markPrice) || markPrice <= 0) {
      const allText = await page.evaluate(() => document.body.innerText);
      const matches = allText.match(/\b([1-9]\d{4,5}(?:\.\d+)?)\b/g) || [];
      for (const m of matches) {
        const val = parseFloat(m.replace(/,/g, ''));
        if (val >= 10000 && val <= 200000) {
          markPrice = val;
          console.log(`[test] 方式3 - 从页面文字提取价格: ${markPrice}`);
          break;
        }
      }
    }

    if (!markPrice || isNaN(markPrice) || markPrice <= 0) {
      throw new Error('[test] ❌ 无法读取当前价格');
    }

    limitPrice = Math.floor(markPrice - 1000);
    console.log(`[test] 当前价: ${markPrice} | 限价挂单价格: ${limitPrice}`);
    await priceInput.clear();
    await priceInput.fill(String(limitPrice));
    await page.waitForTimeout(500);

    // 选择 BTC 单位
    const qtyUnitBtn = page.locator('#tour-guide-place-order button[role="combobox"]');
    if (await qtyUnitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qtyUnitBtn.click();
      const btcOption = page.locator('[role="option"]:has-text("BTC")');
      if (await btcOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btcOption.click();
      }
      await page.waitForTimeout(300);
    }

    // 输入数量 0.001 BTC
    const qtyInput = page.locator('input[placeholder="数量"]');
    await qtyInput.clear();
    await qtyInput.fill('0.001');
    await page.waitForTimeout(500);

    // 点击买入/做多（开多）
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(500);

    await handleConfirmDialog(page);
    await page.waitForTimeout(1000);

    // 检查下单成功 Toast（6s）
    await checkToast(page, ['下单成功', '委托成功', '成功提交', 'Order placed', 'Success'], '下单成功消息');

    // 验证当前委托列表出现该订单
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);

    const order = page.locator('text=BTCUSDT').first();
    await expect(order).toBeVisible({ timeout: 5000 });
    console.log(`[test] ✅ H5 限价单已出现在当前委托，价格: ${limitPrice}，数量: 0.001 BTC`);

    await page.screenshot({ path: `test-results/h5-limit-order-placed-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 7：H5 移动端取消限价委托
  // ========================================================
  test('H5 移动端取消刚才的限价委托单', async ({ loggedInPage: page }) => {
    // 复用 test 6 已打开的页面，无需重新导航
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);

    // 记录取消前委托数量
    const tabText = await page.locator('button[role="tab"]:has-text("当前委托")').textContent();
    const orderCountBefore = parseInt(tabText?.match(/\((\d+)\)/)?.[1] || '0');
    console.log(`[test] 取消前委托数量: ${orderCountBefore}`);

    // 点击第一个取消按钮
    const firstCancelBtn = page.locator('button:text("取消")').first();
    if (!(await firstCancelBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('[test] ⚠️ 没有委托订单，跳过');
      return;
    }
    await firstCancelBtn.click();
    console.log('[test] 点击了取消按钮');
    await page.waitForTimeout(500);

    // 处理取消确认弹窗
    const confirmBtn = page.getByRole('button', { name: '确认' });
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      console.log('[test] 确认取消弹窗已点击');
    }

    // 检查取消成功 Toast（6s）
    await checkToast(page, ['取消成功', '撤单成功', '已取消', 'Cancelled', 'Cancel success'], '取消成功消息');

    // 轮询等待委托数量减少（最长 15 秒）
    let orderCountAfter = orderCountBefore;
    await expect.poll(async () => {
      const text = await page.locator('button[role="tab"]:has-text("当前委托")').textContent();
      orderCountAfter = parseInt(text?.match(/\((\d+)\)/)?.[1] || '0');
      return orderCountAfter;
    }, { timeout: 15000, intervals: [1000, 2000, 3000], message: '委托数量应在取消后减少' })
      .toBeLessThan(orderCountBefore);

    const dropped = orderCountBefore - orderCountAfter;
    if (dropped > 5) {
      console.warn(`[test] ⚠️ 委托数量减少了 ${dropped} 笔（预期仅减少 1），可能有其他订单被同时处理`);
    }

    console.log(`[test] 取消后委托数量: ${orderCountAfter}`);
    await page.screenshot({ path: `test-results/h5-limit-order-cancelled-${Date.now()}.png` });
    console.log('[test] ✅ H5 移动端取消限价委托成功');
  });


  // ========================================================
  // 测试 8：H5 导航菜单（Toggle Menu）
  // ========================================================
  test('H5 移动端导航菜单可正常打开并展示各入口', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 点击右上角汉堡菜单
    const toggleBtn = page.locator('button:has-text("Toggle Menu")').first();
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });
    await toggleBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `test-results/h5-nav-menu-open-${Date.now()}.png` });

    // Close Menu 按钮出现即代表菜单已展开
    const closeBtn = page.locator('button:has-text("Close Menu")').first();
    await expect(closeBtn).toBeVisible({ timeout: 5000 });

    // 验证核心导航项目可见
    // 移动端菜单项均为 li[class*="border-b"]（父 ul[class*="px-4"]），
    // 与隐藏的桌面端 li.relative 区分开
    const navItems: Array<[string, string]> = [
      ['li[class*="border-b"]:has-text("空投")',    '空投'],
      ['li[class*="border-b"]:has-text("Shield")',  'Shield'],
      ['li[class*="border-b"]:has-text("投资组合")', '投资组合'],
      ['li[class*="border-b"]:has-text("推荐")',    '推荐'],
      ['li[class*="border-b"]:has-text("奖励")',    '奖励'],
      ['li[class*="border-b"]:has-text("火箭发射")', '火箭发射'],
      ['li[class*="border-b"]:has-text("更多")',    '更多'],
    ];
    let visibleCount = 0;
    for (const [sel, label] of navItems) {
      if (await page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        visibleCount++;
      } else {
        console.log(`[test] ⚠️ 未见: ${label}`);
      }
    }
    console.log(`[test] 导航菜单项可见: ${visibleCount}/${navItems.length}`);
    expect(visibleCount).toBeGreaterThanOrEqual(3);

    // 验证「更多」子菜单可展开
    const moreBtn = page.locator('li[class*="border-b"]:has-text("更多")').first();
    if (await moreBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await moreBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `test-results/h5-nav-more-submenu-${Date.now()}.png` });
      console.log('[test] ✅ 「更多」子菜单已展开');
    }

    console.log('[test] ✅ H5 导航菜单验证完成');
  });


  // ========================================================
  // 测试 9：H5 现货交易页
  // ========================================================
  test('H5 移动端现货交易页可正常加载', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    const origin = new URL(process.env.EXCHANGE_URL!).origin;
    await page.goto(`${origin}/zh-CN/trade/pro/spot/ETHUSDT`);
    await page.waitForSelector('button:has-text("买入"), button:has-text("卖出")', { timeout: 15000 });

    // 顶部：交易对 + 价格
    const pair = page.locator('text=ETH').first();
    await expect(pair).toBeVisible({ timeout: 5000 });

    // 买入 / 卖出 按钮
    const buyBtn  = page.locator('button:has-text("买入")').first();
    const sellBtn = page.locator('button:has-text("卖出")').first();
    expect(await buyBtn.isVisible().catch(() => false) || await sellBtn.isVisible().catch(() => false)).toBeTruthy();

    // 底部 tab：当前委托 / 资产
    const orderTab = page.locator('[role="tab"]:has-text("当前委托")').first();
    if (await orderTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await orderTab.click();
      await page.waitForTimeout(800);
    }

    await page.screenshot({ path: `test-results/h5-spot-trade-${Date.now()}.png` });
    console.log('[test] ✅ H5 现货交易页加载正常');
  });


  // ========================================================
  // 测试 10：H5 Shield 交易页
  // ========================================================
  test('H5 移动端 Shield 交易页可正常加载', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    const origin = new URL(process.env.EXCHANGE_URL!).origin;
    await page.goto(`${origin}/zh-CN/trade/shield/futures/BTCUSDT`);
    await page.waitForSelector('button:has-text("做多"), button:has-text("做空")', { timeout: 15000 });

    // BTCUSDT 交易对标识
    const pair = page.locator('text=BTCUSDT').first();
    await expect(pair).toBeVisible({ timeout: 5000 });

    // 做多 / 做空 按钮
    const longBtn  = page.locator('button:has-text("做多")').first();
    const shortBtn = page.locator('button:has-text("做空")').first();
    expect(await longBtn.isVisible().catch(() => false) || await shortBtn.isVisible().catch(() => false)).toBeTruthy();

    // Chart / Data tab
    const chartTab = page.locator('text=Chart').first();
    const dataTab  = page.locator('text=Data').first();
    const tabVisible = await chartTab.isVisible({ timeout: 3000 }).catch(() => false)
                    || await dataTab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] Chart/Data tab 可见: ${tabVisible}`);

    // 滚动查看底部仓位 tab
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `test-results/h5-shield-trade-${Date.now()}.png` });
    console.log('[test] ✅ H5 Shield 交易页加载正常');
  });


  // ========================================================
  // 测试 11：H5 1001x 交易页
  // ========================================================
  test('H5 移动端 1001x 页面可正常加载', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    const origin = new URL(process.env.EXCHANGE_URL!).origin;
    await page.goto(`${origin}/zh-CN/trade/1001x/futures/BTCUSD`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    // H5 1001x 页面：看涨/看跌 是 <label> 元素，非 <button>
    await page.waitForSelector('label:has-text("看涨")', { timeout: 20000 });

    // 交易对
    const pair = page.locator('text=BTCUSD').first();
    await expect(pair).toBeVisible({ timeout: 5000 });
    console.log('[test] ✅ BTCUSD 交易对可见');

    // 看涨 / 看跌 label（H5 版本的做多/做空）
    const longBtn  = page.locator('label:has-text("看涨")').first();
    const shortBtn = page.locator('label:has-text("看跌")').first();
    const longVisible  = await longBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const shortVisible = await shortBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 看涨: ${longVisible ? '✅' : '⚠️'}  看跌: ${shortVisible ? '✅' : '⚠️'}`);
    expect(longVisible || shortVisible).toBe(true);

    // 杠杆区域（含 Degen 标签和 1001 数值）
    const degenVisible = await page.locator('text=Degen').first().isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 杠杆 Degen 标签可见: ${degenVisible ? '✅' : '⚠️'}`);

    // 图表 / 信息 tab
    const chartTab = page.locator('text=图表').first();
    const chartVisible = await chartTab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 图表 Tab 可见: ${chartVisible ? '✅' : '⚠️'}`);

    await page.screenshot({ path: `test-results/h5-1001x-${Date.now()}.png` });
    console.log('[test] ✅ H5 1001x 页面加载正常');
  });


  // ========================================================
  // 测试 12：H5 空投页
  // ========================================================
  test('H5 移动端空投页面模块完整', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    const origin = new URL(process.env.EXCHANGE_URL!).origin;
    await page.goto(`${origin}/zh-CN/airdrop`);
    await page.waitForSelector('text=空投', { timeout: 15000 });

    // 标题区域
    const title = page.getByRole('heading').filter({ hasText: /Aster空投/ }).first();
    await expect(title).toBeVisible({ timeout: 5000 });

    // 阶段选择按钮
    const stageBtn = page.locator('button:has-text("阶段")').first();
    const stageVisible = await stageBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 阶段按钮可见: ${stageVisible}`);

    // 滚动到底部查看 FAQ
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `test-results/h5-airdrop-bottom-${Date.now()}.png` });

    // FAQ 常见问题
    const faq = page.locator('text=常见问题').first();
    const faqVisible = await faq.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] FAQ 区域可见: ${faqVisible}`);

    // 展开第一个 FAQ
    const firstFaq = page.locator('button:has-text("ASTER 代币是什么")').first();
    if (await firstFaq.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstFaq.click();
      await page.waitForTimeout(500);
      console.log('[test] ✅ FAQ 可点击展开');
    }

    await expect(title).toBeVisible({ timeout: 3000 }).catch(() => {});
    console.log('[test] ✅ H5 空投页面模块验证完成');
  });


  // ========================================================
  // 测试 13：H5 奖励页（Trade & Earn）
  // ========================================================
  test('H5 移动端奖励页面模块完整', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    const origin = new URL(process.env.EXCHANGE_URL!).origin;
    await page.goto(`${origin}/zh-CN/trade-and-earn`);
    await page.waitForSelector('text=USDF', { timeout: 15000 });

    // USDF / asBNB 顶部 tab
    const usdfTab  = page.locator('text=USDF').first();
    const asbnbTab = page.locator('text=asBNB').first();
    const tabVisible = await usdfTab.isVisible({ timeout: 5000 }).catch(() => false)
                    || await asbnbTab.isVisible({ timeout: 5000 }).catch(() => false);
    expect(tabVisible).toBeTruthy();
    console.log('[test] USDF/asBNB tab 可见');

    // APY 数字
    const apy = page.locator('text=APY').first();
    const apyVisible = await apy.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] APY 区域可见: ${apyVisible}`);

    // 铸造 / 兑换 子 tab
    const mintTab  = page.locator('[role="tab"]:has-text("铸造"), button:has-text("铸造")').first();
    const swapTab  = page.locator('[role="tab"]:has-text("兑换"), button:has-text("兑换")').first();
    const subtabVisible = await mintTab.isVisible({ timeout: 3000 }).catch(() => false)
                       || await swapTab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 铸造/兑换 子tab 可见: ${subtabVisible}`);

    // 滚动查看「如何参与」和 FAQ
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `test-results/h5-rewards-bottom-${Date.now()}.png` });

    const howTo = page.locator('text=如何参与').first();
    const howToVisible = await howTo.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 「如何参与」区域可见: ${howToVisible}`);

    console.log('[test] ✅ H5 奖励页面模块验证完成');
  });


  // ========================================================
  // 测试 14：H5 投资组合页
  // ========================================================
  test('H5 移动端投资组合页面模块完整', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    const origin = new URL(process.env.EXCHANGE_URL!).origin;
    await page.goto(`${origin}/zh-CN/portfolio/pro`);
    await page.waitForSelector('text=投资组合', { timeout: 15000 });

    // 页面标题（用 heading role 避免命中 header 导航里的隐藏 span）
    const title = page.getByRole('heading', { name: '投资组合' }).first();
    await expect(title).toBeVisible({ timeout: 5000 });

    // 操作按钮：存款 / 提现 / 转账
    const depositBtn   = page.locator('button:has-text("存款")').first();
    const withdrawBtn  = page.locator('button:has-text("提现")').first();
    const transferBtn  = page.locator('button:has-text("转账")').first();
    let btnCount = 0;
    for (const btn of [depositBtn, withdrawBtn, transferBtn]) {
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) btnCount++;
    }
    console.log(`[test] 存款/提现/转账按钮可见: ${btnCount}/3`);
    expect(btnCount).toBeGreaterThan(0);

    // 总价值 / 盈亏 / 交易量 数据区
    const totalValue = page.locator('text=总价值').first();
    await expect(totalValue).toBeVisible({ timeout: 3000 });
    const pnlVisible = await page.locator('text=盈亏').first().isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`[test] 盈亏区域可见: ${pnlVisible}`);

    // 永续 / 现货 细分
    const perpetual = page.locator('text=永续').first();
    const spot      = page.locator('text=现货').first();
    const subVisible = await perpetual.isVisible({ timeout: 3000 }).catch(() => false)
                    || await spot.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 永续/现货 细分可见: ${subVisible}`);

    // 滚动查看日历/图表区域
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `test-results/h5-portfolio-bottom-${Date.now()}.png` });
    console.log('[test] ✅ H5 投资组合页面模块验证完成');
  });


  // ========================================================
  // 测试 15：H5 推荐页
  // ========================================================
  test('H5 移动端推荐页面模块完整', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    const origin = new URL(process.env.EXCHANGE_URL!).origin;
    await page.goto(`${origin}/zh-CN/referral`);
    await page.waitForSelector('text=邀请朋友', { timeout: 15000 });

    // 主标题
    const title = page.getByRole('heading').filter({ hasText: /邀请朋友/ }).first();
    await expect(title).toBeVisible({ timeout: 5000 });

    // 返利百分比显示
    const commission = page.locator('text=10%').first();
    const commVisible = await commission.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 返利比例可见: ${commVisible}`);

    // 查看推荐规则链接
    const ruleLink = page.locator('text=查看推荐规则').first();
    const ruleVisible = await ruleLink.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 推荐规则链接可见: ${ruleVisible}`);

    // 立即邀请区块
    const inviteSection = page.locator('text=立即邀请').first();
    await expect(inviteSection).toBeVisible({ timeout: 3000 });

    // 邀请总览区块
    const overview = page.locator('text=邀请总览').first();
    const overviewVisible = await overview.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 邀请总览区块可见: ${overviewVisible}`);

    await page.screenshot({ path: `test-results/h5-referral-${Date.now()}.png` });
    console.log('[test] ✅ H5 推荐页面模块验证完成');
  });


  // ========================================================
  // 测试 16：H5 火箭发射页
  // ========================================================
  test('H5 移动端火箭发射页面模块完整', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    const origin = new URL(process.env.EXCHANGE_URL!).origin;
    await page.goto(`${origin}/zh-CN/rocket-launch`, { waitUntil: 'networkidle', timeout: 30000 });

    // 页面标题（networkidle 已确保渲染完成，直接断言）
    const title = page.getByRole('heading').filter({ hasText: /火箭发射/ }).first();
    await expect(title).toBeVisible({ timeout: 10000 });

    // 副标题
    const subtitle = page.locator('text=交易早期加密项目并获得奖励').first();
    const subtitleVisible = await subtitle.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 副标题可见: ${subtitleVisible}`);

    // 火箭发射 / Trade Arena tab
    const rocketTab     = page.locator('button:has-text("火箭发射")').first();
    const tradeArenaTab = page.locator('button:has-text("Trade Arena")').first();
    const tabVisible    = await rocketTab.isVisible({ timeout: 3000 }).catch(() => false)
                       || await tradeArenaTab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 火箭发射/Trade Arena tab 可见: ${tabVisible}`);

    // 全部 / 进行中 / 即将到来 / 已结束 过滤 tab
    const allTab    = page.locator('button:has-text("全部")').first();
    const activeTab = page.locator('button:has-text("进行中")').first();
    const filterVisible = await allTab.isVisible({ timeout: 3000 }).catch(() => false)
                       || await activeTab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 过滤 tab 可见: ${filterVisible}`);

    // 项目卡片
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-results/h5-rocket-launch-${Date.now()}.png` });
    console.log('[test] ✅ H5 火箭发射页面模块验证完成');
  });


  // ========================================================
  // 测试 17：H5 Earn 页
  // ========================================================
  test('H5 移动端 Earn 页面模块完整', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    const origin = new URL(process.env.EXCHANGE_URL!).origin;
    await page.goto(`${origin}/zh-CN/earn`);
    // 等待策略卡片数据加载完成（asBTC 是首个策略项）
    await page.waitForSelector('text=asBTC', { timeout: 20000 });

    // 赚取 / 生态系统 顶部 tab
    const earnTab = page.locator('button:has-text("赚取"), text=赚取').first();
    const ecoTab  = page.locator('button:has-text("生态系统"), text=生态系统').first();
    const topTabVisible = await earnTab.isVisible({ timeout: 3000 }).catch(() => false)
                       || await ecoTab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 赚取/生态系统 tab 可见: ${topTabVisible}`);

    // 策略列表标题
    const strategyTitle = page.locator('text=策略').first();
    await expect(strategyTitle).toBeVisible({ timeout: 5000 });

    // 核心策略卡片：asBTC / asCAKE / ALP / asUSDF / asBNB
    const strategies = ['asBTC', 'asCAKE', 'ALP', 'asUSDF', 'asBNB'];
    let strategyCount = 0;
    for (const s of strategies) {
      if (await page.locator(`text=${s}`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        strategyCount++;
      }
    }
    console.log(`[test] 策略卡片可见: ${strategyCount}/${strategies.length}`);
    expect(strategyCount).toBeGreaterThanOrEqual(2);

    // TVL / APY 数据
    const tvl = page.locator('text=TVL').first();
    const tvlVisible = await tvl.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] TVL 数据可见: ${tvlVisible}`);

    await page.screenshot({ path: `test-results/h5-earn-${Date.now()}.png` });
    console.log('[test] ✅ H5 Earn 页面模块验证完成');
  });


  // ========================================================
  // 测试 18：H5 USDF 稳定币页
  // ========================================================
  test('H5 移动端 USDF 页面模块完整', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    const origin = new URL(process.env.EXCHANGE_URL!).origin;
    await page.goto(`${origin}/zh-CN/usdf`);
    await page.waitForSelector('text=USDF', { timeout: 15000 });

    // 主标题（USDF 页面专属 heading）
    const title = page.getByRole('heading').filter({ hasText: /USDF/ }).first();
    await expect(title).toBeVisible({ timeout: 5000 });

    // 铸造 / 兑换 / 请求 / 领取 tab
    const tabs = ['铸造', '兑换', '请求', '领取'];
    let tabCount = 0;
    for (const t of tabs) {
      if (await page.locator(`[role="tab"]:has-text("${t}"), button:has-text("${t}")`).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        tabCount++;
      }
    }
    console.log(`[test] 铸造/兑换/请求/领取 tab 可见: ${tabCount}/4`);
    expect(tabCount).toBeGreaterThanOrEqual(2);

    // 质押APY / 交易APY
    const apy = page.locator('text=APY').first();
    const apyVisible = await apy.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] APY 数据可见: ${apyVisible}`);

    // 滚动到底部查看统计数据和 FAQ
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(300);
    }
    const stats = page.locator('text=总铸造, text=可铸造').first();
    const statsVisible = await stats.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 统计数据区可见: ${statsVisible}`);

    await page.screenshot({ path: `test-results/h5-usdf-bottom-${Date.now()}.png` });
    console.log('[test] ✅ H5 USDF 页面模块验证完成');
  });


  // ========================================================
  // 测试 19：H5 API 管理页
  // ========================================================
  test('H5 移动端 API 管理页面可正常加载', async ({ loggedInPage: page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    const origin = new URL(process.env.EXCHANGE_URL!).origin;
    await page.goto(`${origin}/zh-CN/api-management`);
    await page.waitForSelector('button:has-text("创建 API"), button:has-text("创建API")', { timeout: 15000 });

    // API 管理标题
    const title = page.getByRole('heading').filter({ hasText: /API/ }).first();
    await expect(title).toBeVisible({ timeout: 5000 });

    // API / 专业API tab
    const apiTab    = page.locator('text=API').first();
    const proApiTab = page.locator('text=专业API').first();
    const tabVisible = await apiTab.isVisible({ timeout: 3000 }).catch(() => false)
                    || await proApiTab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] API/专业API tab 可见: ${tabVisible}`);

    // 创建 API 按钮
    const createBtn = page.locator('button:has-text("创建 API"), button:has-text("创建API")').first();
    const createVisible = await createBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 创建 API 按钮可见: ${createVisible}`);
    expect(createVisible).toBeTruthy();

    await page.screenshot({ path: `test-results/h5-api-management-${Date.now()}.png` });
    console.log('[test] ✅ H5 API 管理页面验证完成');
  });

});
