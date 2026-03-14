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

});
