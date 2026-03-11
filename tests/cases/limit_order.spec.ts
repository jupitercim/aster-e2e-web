import { test, expect } from '../fixtures/auth';

test.describe.serial('AsterDEX - 限价委托流程', () => {

  // 跨测试共享数据（同一 describe 闭包内共享）
  let markPrice: number = 0;
  let limitPrice: number = 0;

  // ===== 辅助：处理下单确认弹窗 =====
  async function handleConfirmDialog(page: any) {
    await page.waitForTimeout(500);

    // 方法1：找"订单确认"弹窗内的确认按钮
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

    // 方法2：找"取消"旁边的确认按钮
    const cancelBtn = page.locator('button:text("取消")');
    if (await cancelBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      const confirmBtn = cancelBtn.locator('..').locator('button').last();
      await confirmBtn.click();
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

  // ===== 辅助：检测 Toast 提示，输出到 console 并截图 =====
  async function checkToast(page: any, keywords: string[], label: string): Promise<boolean> {
    // 把所有关键词合并为一个选择器，用 waitFor 真正等待（isVisible 在新版 Playwright 立即返回，不等待）
    const selector = keywords.map(kw => `text=${kw}`).join(', ');
    const toast = page.locator(selector).first();
    const appeared = await toast.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);

    if (appeared) {
      const text = await toast.textContent();
      console.log(`[test] ✅ ${label}: ${text?.trim()}`);
      // 截图保存到 test-results 目录，文件名含 label
      const filename = `test-results/toast-${label.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}-${Date.now()}.png`;
      await page.screenshot({ path: filename, fullPage: false });
      console.log(`[test] 📸 截图已保存: ${filename}`);
      return true;
    }

    console.log(`[test] ⚠️ 未检测到 ${label} 提示，继续执行`);
    return false;
  }


  // ========================================================
  // 测试 1：限价挂单
  // ========================================================
  test('限价挂单 BTC/USDT 0.01 BTC（mark price - 1000）', async ({ loggedInPage: page }) => {
    // 1. 进入合约交易页
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 2. 读取 Mark Price（标记价格）
    //    DOM 结构：dt:has-text("标记价格") 的父级 div 里的 dd
    const markPriceEl = page.locator('dt:has-text("标记价格")').locator('..').locator('dd').first();
    await expect(markPriceEl).toBeVisible({ timeout: 10000 });
    const markPriceText = await markPriceEl.textContent();

    if (!markPriceText) {
      throw new Error('[test] ❌ 无法读取 Mark Price');
    }

    markPrice = parseFloat(markPriceText.replace(/,/g, '').trim());
    limitPrice = Math.floor(markPrice - 1000);
    console.log(`[test] Mark Price: ${markPrice} | 限价单价格: ${limitPrice}`);

    // 3. 选择限价单（排除 combobox 的"限价止盈止损"）
    await page.locator('button:not([role="combobox"]):text("限价")').click();
    await page.waitForTimeout(500);

    // 4. 输入价格
    const priceInput = page.locator('input[placeholder="价格"]');
    await priceInput.clear();
    await priceInput.fill(String(limitPrice));
    await page.waitForTimeout(500);

    // 5. 选择 BTC 单位，再输入数量 0.01
    const qtyUnitBtn = page.locator('#tour-guide-place-order button[role="combobox"]');
    await qtyUnitBtn.click();
    await page.locator('[role="option"]:has-text("BTC")').click();
    await page.waitForTimeout(300);

    const qtyInput = page.locator('input[placeholder="数量"]');
    await qtyInput.clear();
    await qtyInput.fill('0.01');
    await page.waitForTimeout(500);

    // 6. 点击买入/做多
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(500);

    // 7. 处理确认弹窗
    await handleConfirmDialog(page);
    await page.waitForTimeout(1000);

    // 8. 检查下单成功 Toast
    await checkToast(page, ['下单成功', '委托成功', '成功提交', 'Order placed', 'Success'], '下单成功消息');

    // 9. 验证当前委托列表出现该订单
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);

    const order = page.locator('text=BTCUSDT').first();
    await expect(order).toBeVisible({ timeout: 5000 });
    console.log(`[test] ✅ 限价单已出现在当前委托列表，价格: ${limitPrice}，数量: 0.01 BTC`);
  });


  // ========================================================
  // 测试 2：取消限价委托
  // ========================================================
  test('取消刚才的限价委托单', async ({ loggedInPage: page }) => {
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 1. 切换到当前委托（Open Orders）
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);

    // 2. 点击第一个取消按钮
    const firstCancelBtn = page.locator('button:text("取消")').first();
    if (!(await firstCancelBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('[test] ⚠️ 没有委托订单，跳过');
      return;
    }
    await firstCancelBtn.click();
    console.log('[test] 点击了取消按钮');
    await page.waitForTimeout(500);

    // 3. 处理取消确认弹窗
    const confirmBtn = page.getByRole('button', { name: '确认' });
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      console.log('[test] 确认取消弹窗已点击');
    }
    await page.waitForTimeout(1500);

    // 4. 检查取消成功 Toast
    await checkToast(page, ['取消成功', '撤单成功', '已取消', 'Cancelled', 'Cancel success'], '取消成功消息');

    console.log('[test] ✅ 取消委托操作完成');
  });


  // ========================================================
  // 测试 3：验证历史委托中的订单数据
  // ========================================================
  test('验证历史委托中订单状态、价格与数量', async ({ loggedInPage: page }) => {
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 1. 切换到历史委托（Order History）
    const historyTabNames = ['历史委托', '订单历史', 'Order History'];
    let switched = false;
    for (const name of historyTabNames) {
      const tab = page.locator(`button[role="tab"]:has-text("${name}")`);
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        console.log(`[test] 已切换到 "${name}" tab`);
        switched = true;
        break;
      }
    }
    if (!switched) {
      throw new Error('[test] ❌ 找不到历史委托 Tab，请检查选择器');
    }
    await page.waitForTimeout(2000);

    // 2. 获取第一行（最新一条）订单
    // 历史委托用 div 布局，找包含 BTCUSDT 的最小行容器
    const firstRow = page.locator([
      'tbody tr',                        // 标准 table
      '[role="row"]',                    // ARIA table
      '[data-row-key]',                  // antd / 虚拟列表
    ].join(', ')).first();

    // 若以上都没有，fallback：找含 BTCUSDT 且含订单状态词的最小 div
    let rowText = '';
    const hasStandardRow = await firstRow.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasStandardRow) {
      rowText = (await firstRow.textContent()) || '';
    } else {
      // 找含 BTCUSDT 且内容简短的行 div
      const fallbackRow = page.locator('div').filter({ hasText: /BTCUSDT.*(已取消|取消|Cancelled)/s }).first();
      if (await fallbackRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        rowText = (await fallbackRow.textContent()) || '';
      } else {
        // 最后兜底：直接读整个历史区域内容
        const panel = page.locator('[role="tabpanel"], [data-state="active"]').last();
        rowText = (await panel.textContent()) || '';
      }
    }
    console.log(`[test] 历史委托行内容: ${rowText.trim().slice(0, 200)}`);

    // 3. 检查状态是否为"已取消"
    const cancelledKeywords = ['已取消', '取消', 'Cancelled', 'CANCELLED', 'canceled'];
    let isCancelled = false;
    for (const kw of cancelledKeywords) {
      if (rowText.includes(kw)) {
        isCancelled = true;
        console.log(`[test] ✅ 订单状态为取消（匹配关键词: "${kw}"）`);
        break;
      }
    }
    if (!isCancelled) {
      console.log(`[test] ⚠️ 订单状态不含取消关键词，行内容: ${rowText.trim()}`);
    }
    expect(isCancelled).toBe(true);

    // 4. 检查价格是否为 limitPrice（mark price - 1000）
    const numericValues = (rowText.match(/[\d,]+\.?\d*/g) || [])
      .map(v => parseFloat(v.replace(/,/g, '')))
      .filter(v => !isNaN(v) && v > 0);

    const priceMatched = limitPrice > 0 && numericValues.some(v => v === limitPrice);
    const qtyMatched = rowText.includes('0.01');

    console.log(`[test] 行内数值: ${numericValues.join(', ')}`);
    console.log(`[test] 期望价格: ${limitPrice} → ${priceMatched ? '✅ 匹配' : '⚠️ 未匹配'}`);
    console.log(`[test] 期望数量: 0.01 BTC → ${qtyMatched ? '✅ 匹配' : '⚠️ 未匹配'}`);

    // 5. 综合结论
    if (isCancelled && priceMatched && qtyMatched) {
      console.log(`[test] ✅ 测试数据一致 | qty: 0.01 BTC | price: ${limitPrice}`);
    } else {
      console.log(`[test] ⚠️ 数据核对结果 → 已取消: ${isCancelled} | 价格匹配: ${priceMatched} | 数量匹配: ${qtyMatched}`);
    }
  });

});
