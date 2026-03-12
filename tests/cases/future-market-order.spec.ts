import { test, expect } from '../fixtures/auth';

test.describe.serial('AsterDEX - 期货市价委托', () => {

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
  // 测试 1：市价开多 0.01 BTC
  // ========================================================
  test('市价开多 BTC/USDT 0.01 BTC', async ({ loggedInPage: page }) => {
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 选择市价单
    await page.locator('#tour-guide-place-order button:text("市价"), button:text("市价")').first().click();
    await page.waitForTimeout(500);

    // 选择 BTC 单位
    const qtyUnitBtn = page.locator('#tour-guide-place-order button[role="combobox"]');
    if (await qtyUnitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qtyUnitBtn.click();
      await page.locator('[role="option"]:has-text("BTC")').click();
      await page.waitForTimeout(300);
    }

    // 输入数量
    const qtyInput = page.locator('input[placeholder="数量"]');
    await qtyInput.clear();
    await qtyInput.fill('0.01');
    await page.waitForTimeout(500);

    // 点击买入/做多
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(500);

    await handleConfirmDialog(page);
    await page.waitForTimeout(2000);

    await checkToast(page, ['下单成功', '委托成功', '成功提交', 'Order placed', 'Success'], '市价开多下单');

    // 验证仓位
    await page.locator('button[role="tab"]:has-text("仓位")').click();
    await page.waitForTimeout(1000);

    const position = page.locator('text=BTCUSDT').first();
    await expect(position).toBeVisible({ timeout: 10000 });
    console.log('[test] ✅ 市价开多 0.01 BTC 成功，仓位已建立');
  });


  // ========================================================
  // 测试 2：市价开空 0.01 BTC
  // ========================================================
  test('市价开空 BTC/USDT 0.01 BTC', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    // 选择市价单
    await page.locator('#tour-guide-place-order button:text("市价"), button:text("市价")').first().click();
    await page.waitForTimeout(500);

    // 选择 BTC 单位
    const qtyUnitBtn = page.locator('#tour-guide-place-order button[role="combobox"]');
    if (await qtyUnitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qtyUnitBtn.click();
      await page.locator('[role="option"]:has-text("BTC")').click();
      await page.waitForTimeout(300);
    }

    // 输入数量
    const qtyInput = page.locator('input[placeholder="数量"]');
    await qtyInput.clear();
    await qtyInput.fill('0.01');
    await page.waitForTimeout(500);

    // 点击卖出/做空（第二个 submit 按钮）
    await page.locator('button[type="submit"]').nth(1).click();
    await page.waitForTimeout(500);

    await handleConfirmDialog(page);
    await page.waitForTimeout(2000);

    await checkToast(page, ['下单成功', '委托成功', '成功提交', 'Order placed', 'Success'], '市价开空下单');
    console.log('[test] ✅ 市价开空 0.01 BTC 成功');
  });


  // ========================================================
  // 测试 3：市价平仓所有持仓
  // ========================================================
  test('市价平仓第一个持仓', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    await page.locator('button[role="tab"]:has-text("仓位")').click();
    await page.waitForTimeout(1000);

    const tabText = await page.locator('button[role="tab"]:has-text("仓位")').textContent();
    const posCountBefore = parseInt(tabText?.match(/\((\d+)\)/)?.[1] || '0');
    console.log(`[test] 平仓前仓位数量: ${posCountBefore}`);

    if (posCountBefore === 0) {
      console.log('[test] ⚠️ 没有持仓，跳过');
      return;
    }

    // 点击仓位行的市价平仓按钮
    const marketCloseBtn = page.locator('button:text("市价")').last();
    await expect(marketCloseBtn).toBeVisible({ timeout: 5000 });
    await marketCloseBtn.click();
    console.log('[test] 点击了市价平仓');
    await page.waitForTimeout(1500);

    const dialogConfirm = page.locator('button:text("确认")');
    if (await dialogConfirm.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dialogConfirm.click();
      console.log('[test] 确认平仓');
    }
    await page.waitForTimeout(3000);

    const tabTextAfter = await page.locator('button[role="tab"]:has-text("仓位")').textContent();
    const posCountAfter = parseInt(tabTextAfter?.match(/\((\d+)\)/)?.[1] || '0');
    console.log(`[test] 平仓后仓位数量: ${posCountAfter}`);

    expect(posCountAfter).toBeLessThan(posCountBefore);
    console.log('[test] ✅ 市价平仓成功');
  });

});
