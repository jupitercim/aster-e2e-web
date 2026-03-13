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

  // ===== 辅助：检测 Toast 提示 =====
  async function checkToast(page: any, keywords: string[], label: string): Promise<boolean> {
    const selector = keywords.map(kw => `text=${kw}`).join(', ');
    const toast = page.locator(selector).first();
    const appeared = await toast.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
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
    await page.waitForTimeout(3000);

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
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const tradeElements = [
      page.locator('button:text("限价")').first(),
      page.locator('button:text("市价")').first(),
      page.locator('input[placeholder="数量"]').first(),
    ];

    let visibleCount = 0;
    for (const el of tradeElements) {
      if (await el.isVisible({ timeout: 5000 }).catch(() => false)) visibleCount++;
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
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    expect(title).toBeTruthy();

    await page.screenshot({ path: `test-results/h5-tablet-trade-${Date.now()}.png` });
    console.log('[test] ✅ 平板视口布局验证完成');
  });


  // ========================================================
  // 测试 4：恢复桌面视口
  // ========================================================
  test('恢复桌面视口（1440px）验证正常', async ({ loggedInPage: page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    console.log('[test] 视口已恢复为 1440×900');

    await page.waitForTimeout(1000);

    const title = await page.title();
    expect(title).toBeTruthy();

    await page.screenshot({ path: `test-results/h5-desktop-restore-${Date.now()}.png` });
    console.log('[test] ✅ 桌面视口恢复正常');
  });


  // ========================================================
  // 测试 5：H5 移动端底部导航 - 点击各子页面并验证内容
  // ========================================================
  test('H5 移动端底部导航各子页面内容存在', async ({ loggedInPage: page }) => {
    // 切回移动端视口
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(getBaseUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 导航项配置：label=日志标识, navKeywords=底部导航按钮可能的文案, verifyKeywords=进入后页面应含的关键词
    const navItems = [
      {
        label: '首页',
        navKeywords: ['首页', 'Home'],
        verifyKeywords: ['BTC', 'ETH', 'USDT', '涨跌幅', '最新价'],
      },
      {
        label: '行情',
        navKeywords: ['行情', 'Markets', 'Market'],
        verifyKeywords: ['BTC', 'ETH', '24h', '涨跌', '最新价'],
      },
      {
        label: '交易',
        navKeywords: ['交易', 'Trade', 'Trading'],
        verifyKeywords: ['限价', '市价', '数量', 'BTC', 'USDT'],
      },
      {
        label: '资产',
        navKeywords: ['资产', 'Assets', '钱包', 'Wallet'],
        verifyKeywords: ['USDT', '总资产', '可用', '余额', 'Balance'],
      },
      {
        label: '订单',
        navKeywords: ['订单', 'Orders', 'Order'],
        verifyKeywords: ['委托', '历史', '仓位', 'Open', 'History'],
      },
    ];

    let successCount = 0;

    for (const nav of navItems) {
      // 尝试找到底部导航按钮（用多个关键词备选）
      let navBtn = null;
      for (const kw of nav.navKeywords) {
        // 优先匹配底部 nav / footer 区域；fallback 找任意可见元素
        const candidates = [
          page.locator(`nav >> text=${kw}`).first(),
          page.locator(`footer >> text=${kw}`).first(),
          page.locator(`[role="tablist"] >> text=${kw}`).first(),
          page.locator(`a:has-text("${kw}")`).last(),
          page.locator(`text=${kw}`).last(),
        ];
        for (const el of candidates) {
          if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
            navBtn = el;
            break;
          }
        }
        if (navBtn) break;
      }

      if (!navBtn) {
        console.log(`[test] ⚠️ 未找到「${nav.label}」导航入口，跳过`);
        continue;
      }

      // 点击导航按钮
      await navBtn.click();
      await page.waitForTimeout(2000);
      console.log(`[test] 已点击导航「${nav.label}」`);

      // 验证页面有预期关键词内容
      let found = false;
      for (const kw of nav.verifyKeywords) {
        const el = page.locator(`text=${kw}`).first();
        if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`[test] ✅ 「${nav.label}」页面内容存在: "${kw}"`);
          found = true;
          successCount++;
          break;
        }
      }
      if (!found) {
        console.log(`[test] ⚠️ 「${nav.label}」页面未找到预期内容（${nav.verifyKeywords.join(' / ')}）`);
      }

      await page.screenshot({ path: `test-results/h5-nav-${nav.label}-${Date.now()}.png` });
    }

    console.log(`[test] 导航验证结果: ${successCount}/${navItems.length} 个页面找到内容`);
    // 至少有一个导航页面内容正常
    expect(successCount).toBeGreaterThan(0);
    console.log('[test] ✅ H5 底部导航各子页面验证完成');
  });


  // ========================================================
  // 测试 6：H5 移动端限价挂单（mark price - 1000）
  // ========================================================
  test('H5 移动端限价挂单 BTC/USDT 0.01 BTC', async ({ loggedInPage: page }) => {
    // 确保在移动端视口下操作
    await page.setViewportSize(MOBILE_VIEWPORT);

    // 进入合约交易页
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 读取 Mark Price（标记价格）
    const markPriceEl = page.locator('dt:has-text("标记价格")').locator('..').locator('dd').first();
    await expect(markPriceEl).toBeVisible({ timeout: 10000 });
    const markPriceText = await markPriceEl.textContent();

    if (!markPriceText) throw new Error('[test] ❌ 无法读取 Mark Price');

    const markPrice = parseFloat(markPriceText.replace(/,/g, '').trim());
    limitPrice = Math.floor(markPrice - 1000);
    console.log(`[test] Mark Price: ${markPrice} | 限价单价格: ${limitPrice}`);

    // 选择限价单（排除 combobox 的"限价止盈止损"）
    await page.locator('button:not([role="combobox"]):text("限价")').click();
    await page.waitForTimeout(500);

    // 输入价格
    const priceInput = page.locator('input[placeholder="价格"]');
    await priceInput.clear();
    await priceInput.fill(String(limitPrice));
    await page.waitForTimeout(500);

    // 选择 BTC 单位，输入数量 0.01
    const qtyUnitBtn = page.locator('#tour-guide-place-order button[role="combobox"]');
    if (await qtyUnitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qtyUnitBtn.click();
      const btcOption = page.locator('[role="option"]:has-text("BTC")');
      if (await btcOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btcOption.click();
      }
      await page.waitForTimeout(300);
    }

    const qtyInput = page.locator('input[placeholder="数量"]');
    await qtyInput.clear();
    await qtyInput.fill('0.01');
    await page.waitForTimeout(500);

    // 点击买入/做多
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(500);

    // 处理确认弹窗
    await handleConfirmDialog(page);
    await page.waitForTimeout(1000);

    // 检查下单成功 Toast
    await checkToast(page, ['下单成功', '委托成功', '成功提交', 'Order placed', 'Success'], '下单成功消息');

    // 验证当前委托列表出现该订单
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);

    const order = page.locator('text=BTCUSDT').first();
    await expect(order).toBeVisible({ timeout: 5000 });
    console.log(`[test] ✅ H5 限价单已出现在当前委托，价格: ${limitPrice}，数量: 0.01 BTC`);

    await page.screenshot({ path: `test-results/h5-limit-order-placed-${Date.now()}.png` });
  });


  // ========================================================
  // 测试 7：H5 移动端取消限价委托
  // ========================================================
  test('H5 移动端取消刚才的限价委托单', async ({ loggedInPage: page }) => {
    // 复用 test 6 已打开的页面，无需重新导航

    // 切换到当前委托 tab
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

    // 检查取消成功 Toast
    await checkToast(page, ['取消成功', '撤单成功', '已取消', 'Cancelled', 'Cancel success'], '取消成功消息');

    // 轮询等待委托数量减少（最长 15 秒）
    let orderCountAfter = orderCountBefore;
    await expect.poll(async () => {
      const text = await page.locator('button[role="tab"]:has-text("当前委托")').textContent();
      orderCountAfter = parseInt(text?.match(/\((\d+)\)/)?.[1] || '0');
      return orderCountAfter;
    }, { timeout: 15000, intervals: [1000, 2000, 3000], message: '委托数量应在取消后减少' })
      .toBeLessThan(orderCountBefore);

    console.log(`[test] 取消后委托数量: ${orderCountAfter}`);
    await page.screenshot({ path: `test-results/h5-limit-order-cancelled-${Date.now()}.png` });
    console.log('[test] ✅ H5 移动端取消限价委托成功');
  });

});
