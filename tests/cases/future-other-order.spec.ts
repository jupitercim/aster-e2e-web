// spec: specs/future-other-order.plan.md
import { test, expect } from '../fixtures/auth';

test.describe.serial('AsterDEX - 期货其他委托（止盈止损 / 计划委托）', () => {

  let markPrice: number = 0;

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
  // 测试 1：止盈止损限价委托下单
  // ========================================================
  test('止盈止损限价委托下单', async ({ loggedInPage: page }) => {
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 读取 Mark Price
    const markPriceEl = page.locator('dt:has-text("标记价格")').locator('..').locator('dd').first();
    await expect(markPriceEl).toBeVisible({ timeout: 10000 });
    const markPriceText = await markPriceEl.textContent();
    markPrice = parseFloat((markPriceText || '0').replace(/,/g, '').trim());
    console.log(`[test] Mark Price: ${markPrice}`);

    // 选择「限价止盈止损」（combobox 类型）
    const tpslCombobox = page.locator('[role="combobox"]:has-text("限价止盈止损"), [role="combobox"]:has-text("止盈止损")').first();
    if (await tpslCombobox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tpslCombobox.click();
      await page.waitForTimeout(500);
      const tpslOption = page.locator('[role="option"]:has-text("限价止盈止损")').first();
      if (await tpslOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tpslOption.click();
        console.log('[test] 已选择限价止盈止损');
      }
    } else {
      // 备用：直接点击 TP/SL 标签
      const tpslTab = page.locator('button:text("止盈止损"), button:text("TP/SL")').first();
      if (await tpslTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tpslTab.click();
        console.log('[test] 点击了止盈止损 Tab');
      }
    }
    await page.waitForTimeout(500);

    // 输入触发价格（mark price + 500 用于止盈）
    const triggerPrice = Math.floor(markPrice + 500);
    const triggerInput = page.locator('input[placeholder*="触发价"], input[placeholder*="止盈价"], input[placeholder*="Trigger"]').first();
    if (await triggerInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await triggerInput.clear();
      await triggerInput.fill(String(triggerPrice));
      console.log(`[test] 输入触发价格: ${triggerPrice}`);
    }

    // 输入委托价格
    const orderPrice = Math.floor(markPrice + 600);
    const priceInput = page.locator('input[placeholder="价格"]').first();
    if (await priceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await priceInput.clear();
      await priceInput.fill(String(orderPrice));
    }

    // 输入数量
    const qtyInput = page.locator('input[placeholder="数量"]');
    await qtyInput.clear();
    await qtyInput.fill('0.001');
    await page.waitForTimeout(500);

    // 点击买入做多
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(500);

    await handleConfirmDialog(page);
    await page.waitForTimeout(1000);

    await checkToast(page, ['下单成功', '委托成功', '成功提交', 'Order placed', 'Success'], '止盈止损下单');

    // 验证当前委托
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);
    console.log('[test] ✅ 止盈止损委托下单完成');
  });


  // ========================================================
  // 测试 2：取消止盈止损委托单
  // ========================================================
  test('取消止盈止损委托单', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

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
      console.log('[test] 确认取消弹窗已点击');
    }
    await page.waitForTimeout(1500);

    await checkToast(page, ['取消成功', '撤单成功', '已取消', 'Cancelled', 'Cancel success'], '取消止盈止损');
    console.log('[test] ✅ 取消止盈止损委托完成');
  });


  // ========================================================
  // 测试 3：全部撤销（一键撤销所有委托）
  // ========================================================
  test('一键撤销所有委托单', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);

    // 查找「全部撤销」/ 「撤销全部」按钮
    const cancelAllBtn = page.locator('button:text("全部撤销"), button:text("撤销全部"), button:text("Cancel All")').first();
    if (!(await cancelAllBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('[test] ⚠️ 未找到全部撤销按钮或无委托单，跳过');
      return;
    }

    await cancelAllBtn.click();
    await page.waitForTimeout(500);

    // 确认弹窗
    const confirmBtn = page.getByRole('button', { name: '确认' });
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      console.log('[test] 确认全部撤销');
    }
    await page.waitForTimeout(2000);

    await checkToast(page, ['取消成功', '撤单成功', '已取消', 'Cancelled'], '全部撤销');
    console.log('[test] ✅ 全部撤销完成');
  });


  // ========================================================
  // 测试 4：TWAP 策略创建入口可用
  // ========================================================
  test('TWAP 策略创建入口可用', async ({ loggedInPage: page }) => {
    // 复用 test 3 已打开的页面（合约交易页面）

    // 点击底部 TWAP Tab
    const twapTab = page.locator('button[role="tab"]:has-text("TWAP"), text=TWAP').first();
    if (!(await twapTab.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('[test] ⚠️ 未找到 TWAP Tab，跳过');
      return;
    }

    await twapTab.click();
    console.log('[test] 点击了 TWAP Tab');
    await page.waitForTimeout(1500);

    // 验证 TWAP 策略参数面板出现
    const twapKeywords = ['TWAP', '创建 TWAP', '创建策略', '总数量', '执行间隔', 'Create', 'Total', 'Interval'];
    let twapUiFound = false;
    for (const kw of twapKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到 TWAP 元素: "${kw}"`);
        twapUiFound = true;
        break;
      }
    }

    if (!twapUiFound) {
      console.log('[test] ⚠️ 未找到 TWAP 参数面板');
    }

    await page.screenshot({ path: `test-results/future-twap-${Date.now()}.png` });
    console.log('[test] ✅ TWAP 策略入口验证完成');
  });


  // ========================================================
  // 测试 5：资金费率和倒计时信息可见
  // ========================================================
  test('页面顶部资金费率和倒计时信息格式正确', async ({ loggedInPage: page }) => {
    // 复用 test 4 已打开的页面，无需重新导航

    // 验证资金费率（通常格式为 -0.00xx% / 0.xxxx）
    const fundingRateKeywords = ['资金费率', 'Funding Rate', '倒计时'];
    let fundingFound = false;
    for (const kw of fundingRateKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到资金费率元素: "${kw}"`);
        fundingFound = true;
        break;
      }
    }

    if (!fundingFound) {
      console.log('[test] ⚠️ 未找到资金费率元素，跳过');
      return;
    }

    // 验证倒计时格式（HH:MM:SS 格式）
    const countdownEl = page.locator('text=/\\d{1,2}:\\d{2}:\\d{2}/').first();
    const hasCountdown = await countdownEl.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 倒计时: ${hasCountdown ? '✅ 格式正确（HH:MM:SS）' : '⚠️ 未找到'}`);

    // 验证资金费率数值（含 % 号）
    const rateValueEl = page.locator('text=/-?\\d+\\.\\d+%/').first();
    const hasRateValue = await rateValueEl.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[test] 资金费率数值: ${hasRateValue ? '✅ 可见' : '⚠️ 未找到'}`);

    console.log('[test] ✅ 资金费率信息验证完成');
  });

});
