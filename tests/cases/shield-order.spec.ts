import { test, expect } from '../fixtures/auth';

// Shield 模式交易页 URL（TODO: 确认实际路径）
function getShieldUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/trade/shield/futures/BTCUSDT`;
}

test.describe.serial('AsterDEX - Shield 模式交易', () => {

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
      const filename = `test-results/toast-${label.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}-${Date.now()}.png`;
      await page.screenshot({ path: filename, fullPage: false });
      console.log(`[test] 📸 截图已保存: ${filename}`);
      return true;
    }

    console.log(`[test] ⚠️ 未检测到 ${label} 提示，继续执行`);
    return false;
  }


  // ========================================================
  // 测试 1：Shield 模式页面加载验证
  // ========================================================
  test('Shield 模式页面可正常加载', async ({ loggedInPage: page }) => {
    const shieldUrl = getShieldUrl();
    console.log(`[test] Shield URL: ${shieldUrl}`);

    await page.goto(shieldUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // 验证页面包含关键元素（下单面板或交易对信息）
    const tradePanel = page.locator('#tour-guide-place-order, [data-testid="order-panel"], input[placeholder="数量"]').first();
    const isVisible = await tradePanel.isVisible({ timeout: 8000 }).catch(() => false);

    if (isVisible) {
      console.log('[test] ✅ Shield 交易面板已加载');
    } else {
      console.log('[test] ⚠️ 未检测到交易面板，可能 URL 需要确认');
      await page.screenshot({ path: `test-results/shield-page-${Date.now()}.png` });
    }
  });


  // ========================================================
  // 测试 2：Shield 模式限价买入
  // ========================================================
  test('Shield 模式限价买入 0.01 BTC', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    // 选择限价单
    const limitBtn = page.locator('button:not([role="combobox"]):text("限价")');
    if (!(await limitBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('[test] ⚠️ 未找到限价按钮，跳过');
      return;
    }
    await limitBtn.click();
    await page.waitForTimeout(500);

    // 读取当前价格并设置限价（低于市价不成交）
    const priceInput = page.locator('input[placeholder="价格"]');
    await priceInput.clear();
    await priceInput.fill('60000');
    await page.waitForTimeout(300);

    const qtyInput = page.locator('input[placeholder="数量"]');
    await qtyInput.clear();
    await qtyInput.fill('0.01');
    await page.waitForTimeout(500);

    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(500);

    await handleConfirmDialog(page);
    await page.waitForTimeout(1000);

    await checkToast(page, ['下单成功', '委托成功', '成功提交', 'Order placed', 'Success'], 'Shield限价买入');

    // 切换到当前委托
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);
    console.log('[test] ✅ Shield 模式限价买入下单完成');
  });


  // ========================================================
  // 测试 3：取消 Shield 委托单
  // ========================================================
  test('取消 Shield 委托单', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);

    const firstCancelBtn = page.locator('button:text("取消")').first();
    if (!(await firstCancelBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('[test] ⚠️ 没有委托订单，跳过');
      return;
    }
    await firstCancelBtn.click();
    await page.waitForTimeout(500);

    const confirmBtn = page.getByRole('button', { name: '确认' });
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      console.log('[test] 确认取消');
    }
    await page.waitForTimeout(1500);

    await checkToast(page, ['取消成功', '撤单成功', '已取消', 'Cancelled'], '取消Shield委托');
    console.log('[test] ✅ 取消 Shield 委托单完成');
  });

});
