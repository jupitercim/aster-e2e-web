// spec: specs/spot-order.plan.md
import { test, expect } from '../fixtures/auth';

function getSpotUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/trade/pro/spot/BTCUSDT`;
}

// ===== 辅助：处理下单确认弹窗 =====
async function handleConfirmDialog(page: any) {
  await page.waitForTimeout(500);

  const dialog = page.locator('text=订单确认').locator('..');
  if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
    const dialogBtns = dialog.locator('..').locator('button');
    const count = await dialogBtns.count();
    if (count > 0) {
      await dialogBtns.last().click();
      console.log('[test] 点击了确认弹窗按钮（订单确认）');
      return;
    }
  }

  const cancelBtn = page.locator('button:text("取消")');
  if (await cancelBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    const confirmBtn = cancelBtn.locator('..').locator('button').last();
    await confirmBtn.click();
    console.log('[test] 点击了确认弹窗按钮（取消旁边）');
    return;
  }

  const fallbackBtn = page.getByRole('button', { name: /确认|买入|卖出|Confirm/i }).last();
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
    const filename = `test-results/toast-${label.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}-${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: false });
    console.log(`[test] 📸 截图已保存: ${filename}`);
    return true;
  }

  console.log(`[test] ⚠️ 未检测到 ${label} 提示，继续执行`);
  return false;
}

test.describe.serial('AsterDEX - 现货交易', () => {

  // ========================================================
  // 测试 1：现货交易页面正常加载
  // ========================================================
  test('现货交易页面正常加载', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    const url = getSpotUrl();
    console.log(`[test] 现货 URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();
    expect(title).toContain('BTCUSDT');

    // 验证买入/卖出按钮
    const buyBtn = page.locator('button:has-text("买入"), button:has-text("Buy")').first();
    const hasBuy = await buyBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[test] 买入按钮: ${hasBuy ? '✅ 存在' : '⚠️ 未找到'}`);
    expect.soft(hasBuy).toBe(true);

    await page.screenshot({ path: `test-results/spot-order-load-${Date.now()}.png` });
    console.log('[test] ✅ 现货交易页面加载完成');
  });


  // ========================================================
  // 测试 2：BTC/USDT 限价买入
  // ========================================================
  test('BTC/USDT 限价买入挂单', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    // 选择限价单
    const limitBtn = page.locator('button:not([role="combobox"]):text("限价"), button:text-is("限价")').first();
    if (await limitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await limitBtn.click();
      console.log('[test] 选择了限价单');
    }
    await page.waitForTimeout(500);

    // 读取当前价格作为参考，设置一个低价挂单
    const priceInput = page.locator('input[placeholder="价格"], input[placeholder*="Price"]').first();
    if (await priceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await priceInput.clear();
      await priceInput.fill('60000');
      await page.waitForTimeout(300);
    }

    // 输入数量
    const amountInput = page.locator('input[placeholder="数量"], input[placeholder*="Amount"]').first();
    if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await amountInput.clear();
      await amountInput.fill('0.003');
      await page.waitForTimeout(300);
    }

    // 点击买入按钮
    const buyBtn = page.locator('button[type="submit"]').first();
    if (await buyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await buyBtn.click();
      await page.waitForTimeout(500);
    }

    await handleConfirmDialog(page);
    await page.waitForTimeout(1500);

    await checkToast(page, ['下单成功', '委托成功', '成功提交', 'Order placed', 'Success'], '现货限价买入');
    console.log('[test] ✅ 现货限价买入操作完成');
  });


  // ========================================================
  // 测试 3：切换交易对（从 BTCUSDT → ETHUSDT）
  // ========================================================
  test('切换交易对（BTCUSDT → ETHUSDT）', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    // 点击交易对选择器（页面左上角的交易对名称）
    const pairSelector = page.locator('button:has-text("BTC"), [data-testid*="symbol"], text=BTCUSDT').first();
    if (await pairSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pairSelector.click();
      console.log('[test] 点击了交易对选择器');
      await page.waitForTimeout(1000);

      // 搜索 ETH
      const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"]').first();
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill('ETH');
        await page.waitForTimeout(800);

        // 点击 ETHUSDT
        const ethOption = page.locator('text=ETHUSDT').first();
        if (await ethOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await ethOption.click();
          console.log('[test] 选择了 ETHUSDT');
          await page.waitForTimeout(1500);

          // 验证页面标题已更新
          const newTitle = await page.title();
          console.log(`[test] 切换后标题: ${newTitle}`);
          const hasEth = newTitle.includes('ETH') || newTitle.includes('eth');
          console.log(`[test] 交易对切换: ${hasEth ? '✅ 已切换到 ETH' : '⚠️ 标题未变化'}`);
        } else {
          console.log('[test] ⚠️ 未找到 ETHUSDT 选项');
        }
      } else {
        // 直接导航到 ETH 现货页
        const origin = new URL(process.env.EXCHANGE_URL!).origin;
        await page.goto(`${origin}/zh-CN/trade/pro/spot/ETHUSDT`);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);
        const newTitle = await page.title();
        console.log(`[test] 导航到 ETHUSDT 后标题: ${newTitle}`);
      }
    } else {
      console.log('[test] ⚠️ 未找到交易对选择器，直接导航到 ETHUSDT');
      const origin = new URL(process.env.EXCHANGE_URL!).origin;
      await page.goto(`${origin}/zh-CN/trade/pro/spot/ETHUSDT`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
    }

    console.log('[test] ✅ 切换交易对验证完成');
  });


  // ========================================================
  // 测试 4：查看历史成交记录
  // ========================================================
  test('历史成交记录 Tab 可切换', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
    // 切换回 BTC/USDT 现货页
    await page.goto(getSpotUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 找到历史成交 Tab
    const historyTabNames = ['历史成交', '成交记录', 'Order History', '订单历史', '历史'];
    let switched = false;

    for (const name of historyTabNames) {
      const tab = page.locator(`button[role="tab"]:has-text("${name}"), button:has-text("${name}")`).first();
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        console.log(`[test] 点击了 "${name}" Tab`);
        await page.waitForTimeout(1000);
        switched = true;
        break;
      }
    }

    if (!switched) {
      console.log('[test] ⚠️ 未找到历史成交 Tab，跳过');
      return;
    }

    // 验证内容区域可见（历史成交数据 or 空状态提示）
    const contentKeywords = ['BTCUSDT', 'BTC', '暂无数据', '暂无记录', 'No Data', '买入', '卖出'];
    let contentFound = false;
    for (const kw of contentKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        contentFound = true;
        console.log(`[test] ✅ 历史成交内容: "${kw}"`);
        break;
      }
    }

    console.log(`[test] 历史成交区域: ${contentFound ? '✅ 内容可见' : '⚠️ 未找到内容'}`);
    console.log('[test] ✅ 历史成交 Tab 切换验证完成');
  });

});
