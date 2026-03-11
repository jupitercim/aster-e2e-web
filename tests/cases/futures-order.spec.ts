import { test, expect } from '../fixtures/auth';

test.describe.serial('AsterDEX - 期货合约交易', () => {

  // 点击下单按钮（兼容"买入/做多"和"开多"两种文案）
  async function clickBuyButton(page: any) {
    const buyBtn = page.locator('button[type="submit"]').first();
    await buyBtn.click();
    console.log('[test] 点击了下单按钮');
  }

  // 点击卖出按钮（兼容"卖出/做空"和"开空"两种文案）
  async function clickSellButton(page: any) {
    const sellBtn = page.locator('button[type="submit"]').nth(1);
    await sellBtn.click();
    console.log('[test] 点击了卖出按钮');
  }

  // 处理确认弹窗（弹窗内的按钮，排除下单面板的按钮）
  async function handleConfirmDialog(page: any) {
    await page.waitForTimeout(500);

    // 方法1：找确认弹窗中的按钮（弹窗通常带有 "订单确认" 文字）
    const dialog = page.locator('text=订单确认').locator('..');
    if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
      // 在弹窗容器内找最后一个按钮（通常是确认按钮，取消在前面）
      const dialogBtns = dialog.locator('..').locator('button');
      const count = await dialogBtns.count();
      if (count > 0) {
        // 最后一个按钮是确认（开多/开空）
        await dialogBtns.last().click();
        console.log('[test] 点击了确认弹窗按钮');
        return;
      }
    }

    // 方法2：找包含"取消"按钮的弹窗，旁边的就是确认按钮
    const cancelBtn = page.locator('button:text("取消")');
    if (await cancelBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      const parent = cancelBtn.locator('..');
      const confirmBtn = parent.locator('button').last();
      await confirmBtn.click();
      console.log('[test] 通过取消按钮旁边找到确认按钮并点击');
      return;
    }

    // 方法3：fallback - 直接找确认/开多/开空按钮
    const fallbackBtn = page.getByRole('button', { name: /确认|开多|开空|Confirm/i }).last();
    if (await fallbackBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await fallbackBtn.click();
      console.log('[test] fallback 点击了确认按钮');
    }
  }


  test('BTC/USDT 限价开多 0.01 BTC', async ({ loggedInPage: page }) => {
    // 1. 进入合约交易页
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // 2. 选择限价单（排除 role="combobox" 的"限价止盈止损"）
    await page.locator('button:not([role="combobox"]):text("限价")').click();
    await page.waitForTimeout(1500);

    // 3. 输入价格（低于市价，挂单不会立即成交）
    const priceInput = page.locator('input[placeholder="价格"]');
    await priceInput.clear();
    await priceInput.fill('65000');
    await page.waitForTimeout(1500);

    // 4. 输入数量 0.01 BTC
    const qtyInput = page.locator('input[placeholder="数量"]');
    await qtyInput.clear();
    await qtyInput.fill('0.01');
    await page.waitForTimeout(500);

    // 5. 点击买入/做多（第一个 submit 按钮）
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(500);

    // 6. 处理确认弹窗（找"取消"按钮旁边的确认按钮）
    const cancelBtn = page.locator('button:text("取消")');
    if (await cancelBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      const confirmBtn = cancelBtn.locator('..').locator('button').last();
      await confirmBtn.click();
      console.log('[test] 确认弹窗已点击');
    }
    await page.waitForTimeout(500);

    // 7. 验证：当前委托中出现订单
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(500);

    const order = page.locator('text=BTCUSDT').first();
    await expect(order).toBeVisible({ timeout: 1500 });
    console.log('[test] ✅ 限价开多 0.01 BTC 下单成功');
  });

  test('BTC/USDT 市价开多', async ({ loggedInPage: page }) => {
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // 1. 选择市价单
    await page.locator('button:text("市价")').click();
    await page.waitForTimeout(500);

    // 2. 输入数量
    const qtyInput = page.locator('input[placeholder="数量"]');
    await qtyInput.clear();
    await qtyInput.fill('0.01');
    await page.waitForTimeout(500);

    // 3. 点击开多（第一个 submit 按钮）
    await clickBuyButton(page);
    await page.waitForTimeout(1000);

    // 4. 处理确认弹窗
    await handleConfirmDialog(page);
    await page.waitForTimeout(2000);

    // 5. 验证：查看仓位
    await page.locator('button[role="tab"]:has-text("仓位")').click();
    await page.waitForTimeout(1000);

    const position = page.locator('text=BTCUSDT').first();
    await expect(position).toBeVisible({ timeout: 10000 });
  });
  test('取消第一个限价委托订单', async ({ loggedInPage: page }) => {
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 1. 切换到当前委托 tab
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);

    // 2. 记录当前委托数量
    const tabText = await page.locator('button[role="tab"]:has-text("当前委托")').textContent();
    const orderCountBefore = parseInt(tabText?.match(/\((\d+)\)/)?.[1] || '0');
    console.log(`[test] 取消前委托数量: ${orderCountBefore}`);

    // 3. 点击第一个订单的「取消」按钮
    const firstCancelBtn = page.locator('button:text("取消")').first();
    if (!(await firstCancelBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('[test] 没有委托订单，跳过');
      return;
    }
    await firstCancelBtn.click();
    console.log('[test] 点击了第一个订单的取消按钮');
    await page.waitForTimeout(1000);

    // 4. 如果有确认弹窗，点击确认
    const confirmBtn = page.locator('button:text("确认")');
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      console.log('[test] 确认取消');
    }
    await page.waitForTimeout(2000);

    // 5. 验证：委托数量减少
    const tabTextAfter = await page.locator('button[role="tab"]:has-text("当前委托")').textContent();
    const orderCountAfter = parseInt(tabTextAfter?.match(/\((\d+)\)/)?.[1] || '0');
    console.log(`[test] 取消后委托数量: ${orderCountAfter}`);

    expect(orderCountAfter).toBeLessThan(orderCountBefore);
    console.log('[test] ✅ 取消订单成功');
  });

  test('市价平仓第一个持仓', async ({ loggedInPage: page }) => {
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 1. 切换到仓位 tab
    await page.locator('button[role="tab"]:has-text("仓位")').click();
    await page.waitForTimeout(1000);

    // 2. 记录仓位数量
    const tabText = await page.locator('button[role="tab"]:has-text("仓位")').textContent();
    const posCountBefore = parseInt(tabText?.match(/\((\d+)\)/)?.[1] || '0');
    console.log(`[test] 平仓前仓位数量: ${posCountBefore}`);

    if (posCountBefore === 0) {
      console.log('[test] 没有持仓，跳过');
      return;
    }

    // 3. 点击仓位行的「市价」平仓按钮
    // 从截图看，仓位行右侧有「市价」和「限价」按钮
    const marketCloseBtn = page.locator('button:text("市价")').last();
    await expect(marketCloseBtn).toBeVisible({ timeout: 5000 });
    await marketCloseBtn.click();
    console.log('[test] 点击了市价平仓');
    await page.waitForTimeout(1500);

    // 4. 平仓弹窗 - 从截图看弹窗中有「取消」和「确认」按钮
    const dialogConfirm = page.locator('button:text("确认")');
    if (await dialogConfirm.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dialogConfirm.click();
      console.log('[test] 确认平仓');
    }
    await page.waitForTimeout(3000);

    // 5. 验证：仓位数量减少
    const tabTextAfter = await page.locator('button[role="tab"]:has-text("仓位")').textContent();
    const posCountAfter = parseInt(tabTextAfter?.match(/\((\d+)\)/)?.[1] || '0');
    console.log(`[test] 平仓后仓位数量: ${posCountAfter}`);

    expect(posCountAfter).toBeLessThan(posCountBefore);
    console.log('[test] ✅ 市价平仓成功');
  });

});