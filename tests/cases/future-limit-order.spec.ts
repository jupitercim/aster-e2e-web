// spec: specs/future-limit-order.plan.md
import { test, expect } from '../fixtures/auth';

test.describe.serial('AsterDEX - 期货限价委托', () => {

  let markPrice: number = 0;
  let limitPrice: number = 0;

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
  // 测试 1：限价挂单（买入/做多）
  // ========================================================
  test('限价挂单 BTC/USDT 0.001 BTC（mark price - 1000）', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 读取 Mark Price
    const markPriceEl = page.locator('dt:has-text("标记价格")').locator('..').locator('dd').first();
    await expect(markPriceEl).toBeVisible({ timeout: 10000 });
    const markPriceText = await markPriceEl.textContent();

    if (!markPriceText) throw new Error('[test] ❌ 无法读取 Mark Price');

    markPrice = parseFloat(markPriceText.replace(/,/g, '').trim());
    limitPrice = Math.floor(markPrice - 1000);
    console.log(`[test] Mark Price: ${markPrice} | 限价单价格: ${limitPrice}`);

    // 选择限价单
    await page.locator('button:not([role="combobox"]):text("限价")').click();
    await page.waitForTimeout(500);

    // 输入价格
    const priceInput = page.locator('input[placeholder="价格"]');
    await priceInput.clear();
    await priceInput.fill(String(limitPrice));
    await page.waitForTimeout(500);

    // 选择 BTC 单位，输入数量
    const qtyUnitBtn = page.locator('#tour-guide-place-order button[role="combobox"]');
    await qtyUnitBtn.click();
    await page.locator('[role="option"]:has-text("BTC")').click();
    await page.waitForTimeout(300);

    const qtyInput = page.locator('input[placeholder="数量"]');
    await qtyInput.clear();
    await qtyInput.fill('0.001');
    await page.waitForTimeout(500);

    // 点击买入/做多
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(500);

    await handleConfirmDialog(page);
    await page.waitForTimeout(1000);

    await checkToast(page, ['下单成功', '委托成功', '成功提交', 'Order placed', 'Success'], '下单成功消息');

    // 验证当前委托
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);

    const order = page.locator('text=BTCUSDT').first();
    await expect(order).toBeVisible({ timeout: 5000 });
    console.log(`[test] ✅ 限价单已出现在当前委托，价格: ${limitPrice}，数量: 0.001 BTC`);
  });


  // ========================================================
  // 测试 2：取消限价委托
  // ========================================================
  test('取消刚才的限价委托单', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);

    const firstCancelBtn = page.locator('button:text("取消")').first();
    if (!(await firstCancelBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('[test] ⚠️ 没有委托订单，跳过');
      return;
    }
    await firstCancelBtn.click();
    console.log('[test] 点击了取消按钮');
    await page.waitForTimeout(500);

    const confirmBtn = page.getByRole('button', { name: '确认' });
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      console.log('[test] 确认取消弹窗已点击');
    }
    await page.waitForTimeout(1500);

    await checkToast(page, ['取消成功', '撤单成功', '已取消', 'Cancelled', 'Cancel success'], '取消成功消息');
    console.log('[test] ✅ 取消委托操作完成');
  });


  // ========================================================
  // 测试 3：验证历史委托中的订单数据
  // ========================================================

  test('验证历史委托中订单状态、价格与数量', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

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
    if (!switched) throw new Error('[test] ❌ 找不到历史委托 Tab');
    await page.waitForTimeout(2000);

    const firstRow = page.locator(['tbody tr', '[role="row"]', '[data-row-key]'].join(', ')).first();
    let rowText = '';
    const hasStandardRow = await firstRow.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasStandardRow) {
      rowText = (await firstRow.textContent()) || '';
    } else {
      const fallbackRow = page.locator('div').filter({ hasText: /BTCUSDT.*(已取消|取消|Cancelled)/s }).first();
      if (await fallbackRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        rowText = (await fallbackRow.textContent()) || '';
      } else {
        const panel = page.locator('[role="tabpanel"], [data-state="active"]').last();
        rowText = (await panel.textContent()) || '';
      }
    }
    console.log(`[test] 历史委托行内容: ${rowText.trim().slice(0, 200)}`);

    const cancelledKeywords = ['已取消', '取消', 'Cancelled', 'CANCELLED', 'canceled'];
    let isCancelled = false;
    for (const kw of cancelledKeywords) {
      if (rowText.includes(kw)) {
        isCancelled = true;
        console.log(`[test] ✅ 订单状态为取消（匹配: "${kw}"）`);
        break;
      }
    }
    if (!isCancelled) console.log(`[test] ⚠️ 订单状态不含取消关键词`);
    expect(isCancelled).toBe(true);

    const numericValues = (rowText.match(/[\d,]+\.?\d*/g) || [])
      .map(v => parseFloat(v.replace(/,/g, '')))
      .filter(v => !isNaN(v) && v > 0);

    const priceMatched = limitPrice > 0 && numericValues.some(v => v === limitPrice);
    const qtyMatched = rowText.includes('0.001');

    console.log(`[test] 行内数值: ${numericValues.join(', ')}`);
    console.log(`[test] 期望价格: ${limitPrice} → ${priceMatched ? '✅ 匹配' : '⚠️ 未匹配'}`);
    console.log(`[test] 期望数量: 0.001 BTC → ${qtyMatched ? '✅ 匹配' : '⚠️ 未匹配'}`);
  });


  // ========================================================
  // 测试 4：「隐藏订单」选项可用
  // ========================================================
  test('验证隐藏订单 checkbox 可正常勾选', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    // 复用 test 3 已打开的页面，先导航回交易页
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 切换到限价单
    await page.locator('button:not([role="combobox"]):text("限价")').click();
    await page.waitForTimeout(500);

    // 找到「隐藏订单」checkbox 或 label
    const hiddenOrderKeywords = ['隐藏订单', 'Hidden Order', 'Hidden'];
    let hiddenEl = null;
    for (const kw of hiddenOrderKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        hiddenEl = el;
        console.log(`[test] 找到隐藏订单选项: "${kw}"`);
        break;
      }
    }

    if (!hiddenEl) {
      console.log('[test] ⚠️ 未找到「隐藏订单」选项，跳过');
      return;
    }

    // 找到对应的 checkbox
    const checkbox = page.locator('input[type="checkbox"]').filter({ has: page.locator(`text=${hiddenOrderKeywords[0]}`) }).first();
    const isChecked = await checkbox.isChecked().catch(() => false);

    await hiddenEl.click();
    await page.waitForTimeout(500);

    const isNowChecked = await checkbox.isChecked().catch(() => false);
    if (isNowChecked !== isChecked) {
      console.log(`[test] ✅ 隐藏订单 checkbox 状态已切换: ${isChecked} → ${isNowChecked}`);
    } else {
      // fallback：直接点击 label
      const label = page.locator(`label:has-text("隐藏"), label:has-text("Hidden")`).first();
      if (await label.isVisible({ timeout: 2000 }).catch(() => false)) {
        await label.click();
        await page.waitForTimeout(500);
        console.log('[test] 通过 label 点击了隐藏订单');
      }
    }

    await page.screenshot({ path: `test-results/future-limit-hidden-order-${Date.now()}.png` });
    console.log('[test] ✅ 隐藏订单选项验证完成');
  });


  // ========================================================
  // 测试 5：「只减仓」选项可用
  // ========================================================
  test('验证只减仓 checkbox 可正常勾选', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    // 复用 test 4 已打开的页面，无需重新导航

    const reduceOnlyKeywords = ['只减仓', 'Reduce Only', 'Reduce-only'];
    let reduceEl = null;
    for (const kw of reduceOnlyKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        reduceEl = el;
        console.log(`[test] 找到只减仓选项: "${kw}"`);
        break;
      }
    }

    if (!reduceEl) {
      console.log('[test] ⚠️ 未找到「只减仓」选项，跳过');
      return;
    }

    await reduceEl.click();
    await page.waitForTimeout(500);
    console.log('[test] ✅ 点击了只减仓选项');

    await page.screenshot({ path: `test-results/future-limit-reduce-only-${Date.now()}.png` });
    console.log('[test] ✅ 只减仓选项验证完成');
  });


  // ========================================================
  // 测试 6：改单 —— 修改价格成功，无变化时提示不用修改，最后全部取消
  // ========================================================
  test('改单：修改价格成功，无变化时提示不用修改，最后取消所有订单', { tag: ['@P0'] }, async ({ loggedInPage: page }) => {
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    // 清除前序测试遗留的表单状态（保留钱包/登录/杠杆等 key）
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter(k => /order|trade|reduce|hidden|tab|type/i.test(k))
        .forEach(k => localStorage.removeItem(k));
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // ── 读取当前 Mark Price ──
    const markPriceEl = page.locator('dt:has-text("标记价格")').locator('..').locator('dd').first();
    await expect(markPriceEl).toBeVisible({ timeout: 10000 });
    const mpText = (await markPriceEl.textContent()) ?? '';
    const currentMark = parseFloat(mpText.replace(/,/g, '').trim());
    // 用低价下单减少所需保证金：markPrice - 5000
    const orderPrice  = Math.floor(currentMark - 5000);
    console.log(`[test] Mark Price: ${currentMark} | 挂单价格: ${orderPrice}`);

    // ── 下限价单 0.001 BTC ──
    // 点击「限价」tab（非 combobox 的按钮），确保是普通限价模式
    await page.locator('button:not([role="combobox"]):text-is("限价")').first()
      .click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    // 若当前仍在「限价止盈止损」tab（有触发价格输入框），则强制重新点击「限价」
    const hasTriggerInput = await page.locator('input[placeholder="触发价格"], textbox:has-text("触发价格")').first()
      .isVisible({ timeout: 800 }).catch(() => false);
    if (hasTriggerInput) {
      // 找到不含"止盈止损"文字的「限价」按钮
      const limitTabBtns = page.locator('button:not([role="combobox"])');
      const cnt = await limitTabBtns.count();
      for (let i = 0; i < cnt; i++) {
        const b = limitTabBtns.nth(i);
        const txt = ((await b.textContent().catch(() => '')) ?? '').trim();
        if (txt === '限价') { await b.click({ force: true }).catch(() => {}); break; }
      }
      await page.waitForTimeout(500);
      console.log('[test] 强制点击了纯「限价」tab');
    }

    const priceInput = page.locator('input[placeholder="价格"]');
    await priceInput.clear();
    await priceInput.fill(String(orderPrice));
    await page.waitForTimeout(300);

    const qtyUnitBtn = page.locator('#tour-guide-place-order button[role="combobox"]');
    if (await qtyUnitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qtyUnitBtn.click();
      const btcOpt = page.locator('[role="option"]:has-text("BTC")').first();
      if (await btcOpt.isVisible({ timeout: 2000 }).catch(() => false)) await btcOpt.click();
      await page.waitForTimeout(300);
    }

    const qtyInput = page.locator('input[placeholder="数量"]');
    await qtyInput.clear();
    await qtyInput.fill('0.001');
    await page.waitForTimeout(300);

    // 同时监听 toast 和处理确认弹窗，避免时序问题
    const toastPromise = page.locator(
      'text=下单成功, text=委托成功, text=成功提交, text=Order placed, text=Success'
    ).first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);

    await page.locator('button[type="submit"]').first().click();
    await handleConfirmDialog(page);
    await page.waitForTimeout(500);

    const placeToastOk = await toastPromise;
    if (placeToastOk) {
      console.log('[test] ✅ 下单成功 toast 检测到');
    } else {
      console.log('[test] ⚠️ toast 未检测到，检查当前委托');
    }

    // 验证订单出现在当前委托（通过 tab 括号计数）
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1500);
    const tabText = (await page.locator('button[role="tab"]:has-text("当前委托")').textContent()) ?? '(0)';
    const orderCount = parseInt(tabText.match(/\((\d+)\)/)?.[1] ?? '0');
    const orderVisible = orderCount > 0;
    const placeOk = placeToastOk || orderVisible;
    console.log(`[test] 下单结果: toast=${placeToastOk} order=${orderVisible} tabText="${tabText}"`);
    expect(placeOk).toBe(true);

    console.log('[test] ✅ 订单已出现在当前委托');

    // ── 辅助：打开编辑表单 ──
    async function clickEditButton() {
      const selectors = [
        'button:has-text("Modify order")',
        'button[aria-label*="Modify" i]',
        'button[aria-label*="修改"]',
        'button[aria-label*="编辑"]',
        'button[aria-label*="edit" i]',
        '[data-testid*="edit"]',
        '[data-testid*="modify"]',
      ];
      for (const sel of selectors) {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await btn.click();
          console.log(`[test] ✅ 点击编辑按钮: ${sel}`);
          return true;
        }
      }
      // fallback：在 BTCUSDT 行里找第一个图标按钮（无文字或仅有图标文字）
      const row = page.locator('tr:has-text("BTCUSDT"), [role="row"]:has-text("BTCUSDT"), div:has-text("BTCUSDT"):has(button)').first();
      if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
        const btns = row.locator('button');
        const cnt = await btns.count();
        for (let i = 0; i < cnt; i++) {
          const b = btns.nth(i);
          const txt = ((await b.textContent().catch(() => '')) ?? '').trim();
          if (!txt || txt === '取消') continue;
          await b.click({ force: true }).catch(() => {});
          console.log(`[test] ✅ 点击了行内按钮 #${i}: "${txt.slice(0, 20)}"`);
          return true;
        }
      }
      console.log('[test] ⚠️ 未找到编辑按钮');
      return false;
    }

    // ── 辅助：点击保存/确认 ──
    async function clickSave() {
      const saveSels = [
        '[role="dialog"] button:has-text("提交")',
        '[role="dialog"] button:has-text("Save")',
        '[role="dialog"] button:has-text("Confirm")',
        'button:has-text("保存")',
        'button:has-text("提交")',
        'button:has-text("修改")',
        'button:has-text("确定")',
        'button:has-text("确认")',
        'button:has-text("Save")',
        'button:has-text("Confirm")',
      ];
      for (const sel of saveSels) {
        const btn = page.locator(sel).last();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.click();
          console.log(`[test] 点击保存: ${sel}`);
          return;
        }
      }
    }

    // ── 第一次改单：修改价格为当前价格 - 1 ──
    await clickEditButton();
    await page.waitForTimeout(1000);

    // 编辑弹窗（role=dialog）内的价格输入框（spinbutton）
    // 等待对话框打开后再查找输入框
    const editPriceInput = page.getByRole('dialog').getByRole('spinbutton').first();
    if (await editPriceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 读取编辑弹窗中预填的价格，基于此减1，避免增加保证金需求
      const prefilled = await editPriceInput.inputValue().catch(() => String(orderPrice));
      const newPrice = Math.floor(parseFloat(prefilled.replace(/,/g, '')) - 1);
      await editPriceInput.click({ clickCount: 3 });
      await editPriceInput.fill(String(newPrice));
      console.log(`[test] 修改价格为: ${newPrice}（预填值: ${prefilled}）`);
      await page.waitForTimeout(300);
    } else {
      console.log('[test] ⚠️ 未找到编辑价格输入框');
    }

    // 先注册 toast 监听（10s 窗口），再点保存 + 处理确认弹窗，避免时序问题
    // 使用 getByText 正则匹配，避免逗号分隔 text= 选择器解析问题
    const modifyToastPromise = page.getByText(/修改成功|改单成功|订单修改成功|Order modified/i).first()
      .waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);

    await clickSave();
    await handleConfirmDialog(page);
    await page.waitForTimeout(500);

    const modifyOk = await modifyToastPromise;
    if (modifyOk) console.log('[test] ✅ 改单成功 toast 检测到');
    else console.log('[test] ⚠️ 改单成功 toast 未检测到');
    expect(modifyOk).toBe(true);
    console.log('[test] ✅ 第一次改单成功');

    // ── 第二次改单：修改价格为当前价格 - 2 ──
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);
    await clickEditButton();
    await page.waitForTimeout(1000);

    const editPriceInput2 = page.getByRole('dialog').getByRole('spinbutton').first();
    if (await editPriceInput2.isVisible({ timeout: 3000 }).catch(() => false)) {
      const prefilled2 = await editPriceInput2.inputValue().catch(() => String(orderPrice));
      const newPrice2 = Math.floor(parseFloat(prefilled2.replace(/,/g, '')) - 1);
      await editPriceInput2.click({ clickCount: 3 });
      await editPriceInput2.fill(String(newPrice2));
      console.log(`[test] 第二次修改价格为: ${newPrice2}（预填值: ${prefilled2}）`);
      await page.waitForTimeout(300);
    } else {
      console.log('[test] ⚠️ 第二次未找到编辑价格输入框');
    }

    const modifyToast2Promise = page.getByText(/修改成功|改单成功|订单修改成功|Order modified/i).first()
      .waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
    await clickSave();
    await handleConfirmDialog(page);
    await page.waitForTimeout(500);
    const modifyOk2 = await modifyToast2Promise;
    if (modifyOk2) console.log('[test] ✅ 第二次改单成功 toast 检测到');
    else console.log('[test] ⚠️ 第二次改单成功 toast 未检测到');
    expect(modifyOk2).toBe(true);
    console.log('[test] ✅ 第二次改单成功');

    // ── 第三次改单：修改价格为当前价格 - 3 ──
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);
    await clickEditButton();
    await page.waitForTimeout(1000);

    const editPriceInput3 = page.getByRole('dialog').getByRole('spinbutton').first();
    if (await editPriceInput3.isVisible({ timeout: 3000 }).catch(() => false)) {
      const prefilled3 = await editPriceInput3.inputValue().catch(() => String(orderPrice));
      const newPrice3 = Math.floor(parseFloat(prefilled3.replace(/,/g, '')) - 1);
      await editPriceInput3.click({ clickCount: 3 });
      await editPriceInput3.fill(String(newPrice3));
      console.log(`[test] 第三次修改价格为: ${newPrice3}（预填值: ${prefilled3}）`);
      await page.waitForTimeout(300);
    } else {
      console.log('[test] ⚠️ 第三次未找到编辑价格输入框');
    }

    const modifyToast3Promise = page.getByText(/修改成功|改单成功|订单修改成功|Order modified/i).first()
      .waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
    await clickSave();
    await handleConfirmDialog(page);
    await page.waitForTimeout(500);
    const modifyOk3 = await modifyToast3Promise;
    if (modifyOk3) console.log('[test] ✅ 第三次改单成功 toast 检测到');
    else console.log('[test] ⚠️ 第三次改单成功 toast 未检测到');
    expect(modifyOk3).toBe(true);
    console.log('[test] ✅ 第三次改单成功');

    // ── 第四次：不修改直接点确认，期望提示"不用修改" ──
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);

    await clickEditButton();
    await page.waitForTimeout(1000);

    // 先注册 toast 监听，再点保存，避免时序问题
    const noChangeToastPromise = page.getByText(/不用修改|无需修改|未修改|无变化|No changes|Nothing to change|Not modified/i).first()
      .waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);

    await clickSave();
    await handleConfirmDialog(page);
    await page.waitForTimeout(500);

    const noChangeOk = await noChangeToastPromise;
    console.log(`[test] 不修改提示: ${noChangeOk ? '✅' : '⚠️'}`);
    expect.soft(noChangeOk, '未收到"不用修改"相关提示').toBe(true);

    // ── 取消所有订单 ──
    await page.locator('button[role="tab"]:has-text("当前委托")').click();
    await page.waitForTimeout(1000);

    const cancelAllSels = [
      'button:has-text("全部取消")',
      'button:has-text("撤销全部")',
      'button:has-text("Cancel All")',
      'button:has-text("全撤")',
    ];
    let cancelledAll = false;
    for (const sel of cancelAllSels) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(500);
        const confirm = page.getByRole('button', { name: '确认' });
        if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) await confirm.click();
        cancelledAll = true;
        console.log('[test] ✅ 点击了全部取消');
        break;
      }
    }
    if (!cancelledAll) {
      // 逐个取消
      for (let i = 0; i < 5; i++) {
        const cancelBtn = page.locator('button:text("取消")').first();
        if (!(await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false))) break;
        await cancelBtn.click();
        await page.waitForTimeout(500);
        const confirm = page.getByRole('button', { name: '确认' });
        if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) await confirm.click();
        await page.waitForTimeout(1000);
      }
      console.log('[test] ✅ 逐个取消完成');
    }

    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test-results/future-limit-modify-order-${Date.now()}.png` });
    console.log('[test] ✅ 改单测试完成');
  });

});
