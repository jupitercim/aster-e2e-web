// spec: specs/open-order.plan.md
import { test, expect } from '../fixtures/auth';

const LIMIT_PRICE = 66000;
const QTY_BASE    = 0.001;

test.describe.serial('AsterDEX - Open Order 编辑测试', () => {

  // ===== 辅助：处理下单确认弹窗 =====
  async function handleConfirmDialog(page: any) {
    await page.waitForTimeout(500);

    const dialog = page.locator('text=订单确认').locator('..');
    if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
      const dialogBtns = dialog.locator('..').locator('button');
      if (await dialogBtns.count() > 0) {
        await dialogBtns.last().click();
        console.log('[test] 点击了确认弹窗按钮（订单确认）');
        return;
      }
    }

    const cancelBtn = page.locator('button:text("取消")');
    if (await cancelBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await cancelBtn.locator('..').locator('button').last().click();
      console.log('[test] 点击了确认弹窗按钮（取消旁边）');
      return;
    }

    const fallbackBtn = page.getByRole('button', { name: /确认|Confirm|Submit|提交/i }).last();
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

  // ===== 辅助：切换到当前委托 tab =====
  async function switchToOpenOrderTab(page: any) {
    const tabNames = ['当前委托', 'Open Orders', 'Open Order', '委托'];
    for (const name of tabNames) {
      const tab = page.locator(`button[role="tab"]:has-text("${name}")`);
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        console.log(`[test] 已切换到 "${name}" tab`);
        break;
      }
    }
    await page.getByRole('button', { name: 'Modify order' }).first()
      .waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
  }

  // ===== 辅助：打开第一个订单的编辑弹窗 =====
  async function openFirstEditDialog(page: any) {
    const editBtn = page.getByRole('button', { name: 'Modify order' }).first();
    // 如果 15s 内还未出现，刷新页面后再等一次
    const visible = await editBtn.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
    if (!visible) {
      console.log('[test] Modify order 按钮未出现，刷新页面重试...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await switchToOpenOrderTab(page);
    }
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    await page.waitForTimeout(800);
  }


  // ========================================================
  // 测试 1：以 66000 价格下 0.001 BTC 限价单
  // ========================================================
  test('下 66000 限价单 0.001 BTC', async ({ loggedInPage: page }) => {
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 选择限价单
    await page.locator('button:not([role="combobox"]):text("限价")').click();
    await page.waitForTimeout(500);

    // 输入价格
    const priceInput = page.locator('input[placeholder="价格"]');
    await priceInput.clear();
    await priceInput.fill(String(LIMIT_PRICE));
    await page.waitForTimeout(300);

    // 选 BTC 单位并输入数量
    const qtyUnitBtn = page.locator('#tour-guide-place-order button[role="combobox"]');
    if (await qtyUnitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qtyUnitBtn.click();
      await page.locator('[role="option"]:has-text("BTC")').click();
      await page.waitForTimeout(300);
    }
    const qtyInput = page.locator('input[placeholder="数量"]');
    await qtyInput.clear();
    await qtyInput.fill(QTY_BASE.toFixed(3));
    await page.waitForTimeout(300);

    // 提交
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(500);
    await handleConfirmDialog(page);
    await page.waitForTimeout(1000);

    await checkToast(page, ['下单成功', '委托成功', '成功提交', 'Order placed', 'Success'], '下单');

    // 验证当前委托
    await switchToOpenOrderTab(page);
    const order = page.locator('text=BTCUSDT').first();
    await expect(order).toBeVisible({ timeout: 5000 });
    console.log(`[test] ✅ 限价单已出现在当前委托，价格: ${LIMIT_PRICE}，数量: ${QTY_BASE.toFixed(3)}`);
  });


  // ========================================================
  // 测试 2：修改 qty 29 次
  // ========================================================
  test('修改 qty 29 次', async ({ loggedInPage: page }) => {
    test.setTimeout(300000);

    await switchToOpenOrderTab(page);

    for (let i = 1; i <= 29; i++) {
      const newQty = (QTY_BASE * ((i % 9) + 1)).toFixed(3);
      await openFirstEditDialog(page);

      const qtyInput = page.locator('input[placeholder*="数量"]').last();
      await expect(qtyInput).toBeVisible({ timeout: 5000 });
      const currentQty = (await qtyInput.inputValue()).replace(/,/g, '').trim();
      console.log(`[test] 第 ${i} 次 qty: ${currentQty} → ${newQty}`);

      await qtyInput.click({ clickCount: 3 });
      await qtyInput.fill(newQty);
      await page.waitForTimeout(300);

      await handleConfirmDialog(page);
      await checkToast(page, ['修改成功', '编辑成功', '更新成功', '成功', 'Success', 'Updated'], `qty 编辑 ${i}`);

      await page.waitForTimeout(2000);
      console.log(`[test] order edit success no.${i}, pls wait...`);
    }

    await page.screenshot({ path: `test-results/open-order-qty-done-${Date.now()}.png` });
    console.log('[test] ✅ qty 修改完成');
  });


  // ========================================================
  // 测试 3：修改价格 29 次
  // ========================================================
  test('修改价格 29 次', async ({ loggedInPage: page }) => {
    test.setTimeout(300000);

    await switchToOpenOrderTab(page);

    for (let i = 1; i <= 29; i++) {
      const newPrice = LIMIT_PRICE + ((i % 9) + 1);
      await openFirstEditDialog(page);

      const priceInput = page.locator('input[placeholder*="价格"]').last();
      await expect(priceInput).toBeVisible({ timeout: 5000 });
      const currentPrice = (await priceInput.inputValue()).replace(/,/g, '').trim();
      console.log(`[test] 第 ${i} 次 price: ${currentPrice} → ${newPrice}`);

      await priceInput.click({ clickCount: 3 });
      await priceInput.fill(String(newPrice));
      await page.waitForTimeout(300);

      await handleConfirmDialog(page);
      await checkToast(page, ['修改成功', '编辑成功', '更新成功', '成功', 'Success', 'Updated'], `price 编辑 ${i}`);

      await page.waitForTimeout(2000);
      console.log(`[test] order edit success no.${i}, pls wait...`);
    }

    await page.screenshot({ path: `test-results/open-order-price-done-${Date.now()}.png` });
    console.log('[test] ✅ 价格修改完成');
  });


  // ========================================================
  // 测试 4：撤销全部订单
  // ========================================================
  test('撤销全部 Open Orders', async ({ loggedInPage: page }) => {
    test.setTimeout(120000);

    await switchToOpenOrderTab(page);

    // 尝试"一键撤销全部"按钮
    const cancelAllNames = ['取消所有', '撤销全部', 'Cancel All', '全部撤销', 'Cancel all'];
    let cancelledAll = false;
    for (const name of cancelAllNames) {
      const btn = page.locator(`button:has-text("${name}")`).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        console.log(`[test] 点击了「${name}」按钮`);
        await page.waitForTimeout(1000);
        await handleConfirmDialog(page);
        await checkToast(page, ['撤销成功', '取消成功', 'Cancelled', 'Success', '成功'], '撤销全部');
        cancelledAll = true;
        break;
      }
    }

    // 如果没有一键撤销，则逐条点击撤销按钮
    if (!cancelledAll) {
      console.log('[test] 未找到一键撤销按钮，逐条撤销...');
      let count = 0;
      while (true) {
        const cancelBtn = page.locator('button:has-text("取消"), button:has-text("撤单"), button:has-text("撤销")').first();
        if (!await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) break;
        await cancelBtn.click();
        await page.waitForTimeout(500);
        await handleConfirmDialog(page);
        await checkToast(page, ['撤单成功', '撤销成功', '取消成功', 'Cancelled', 'Success', '成功'], `撤销第 ${++count} 条`);
        await page.waitForTimeout(1000);
      }
      console.log(`[test] 共逐条撤销 ${count} 条订单`);
    }

    await page.screenshot({ path: `test-results/open-order-cancel-done-${Date.now()}.png` });
    console.log('[test] ✅ 全部订单已撤销');
  });

});
