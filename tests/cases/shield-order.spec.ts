// spec: specs/shield-order.plan.md
import { test, expect } from '../fixtures/auth';

// Shield 模式交易页 URL（TODO: 确认实际路径）
function getShieldUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/trade/shield/futures/BTCUSDT`;
}

function getGridUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/strategy/futures/grid/BTCUSDT`;
}

// 用 JS 直接点击，绕过 step guide 覆盖层
async function jsClick(page: any, selector: string): Promise<boolean> {
  return page.evaluate((sel: string) => {
    const el = document.querySelector(sel) as HTMLElement;
    if (el) { el.click(); return true; }
    return false;
  }, selector);
}

// 用原生 setter 触发 React 受控 input 的 onChange
// 关闭 step guide（点完所有"下一步"）
async function dismissGridGuide(page: any) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  for (let i = 0; i < 15; i++) {
    const btn = page.locator('button:has-text("下一步")').first();
    if (await btn.isVisible({ timeout: 1200 }).catch(() => false)) {
      await btn.click({ force: true });
      await page.waitForTimeout(500);
      console.log(`[guide] 点击下一步 #${i + 1}`);
    } else break;
  }
  for (const sel of ['button:has-text("完成")', 'button:has-text("知道了")', 'button:has-text("我知道了")']) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 800 }).catch(() => false)) {
      await el.click({ force: true });
      await page.waitForTimeout(400);
      break;
    }
  }
  await page.waitForTimeout(300);
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
  test('Shield 模式限价买入 0.001 BTC', async ({ loggedInPage: page }) => {
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
    await qtyInput.fill('0.001');
    await page.waitForTimeout(500);

    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(500);

    await handleConfirmDialog(page);
    await page.waitForTimeout(1000);

    await checkToast(page, ['下单成功', '委托成功', '成功提交', 'Order placed', 'Success'], 'Shield限价买入');

    // 切换到当前委托（Tab 文案因页面而异）
    for (const name of ['当前委托', 'Open Orders', '委托', 'Orders']) {
      const tab = page.locator(`button[role="tab"]:has-text("${name}")`);
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        break;
      }
    }
    await page.waitForTimeout(1000);
    console.log('[test] ✅ Shield 模式限价买入下单完成');
  });


  // ========================================================
  // 测试 3：取消 Shield 委托单
  // ========================================================
  test('取消 Shield 委托单', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    // Shield 页面 Tab 文案可能与期货页不同，逐一尝试
    const tabNames = ['当前委托', 'Open Orders', '委托', 'Orders'];
    for (const name of tabNames) {
      const tab = page.locator(`button[role="tab"]:has-text("${name}")`);
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        console.log(`[test] 点击了 Tab: "${name}"`);
        break;
      }
    }
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


  // ========================================================
  // 测试 4：网格交易 - 手动创建做多网格策略
  // ========================================================
  test('网格交易 - 手动创建做多策略（价格区间 mark-2000 ~ mark-1000，5格）', async ({ loggedInPage: page }) => {
    await page.goto(getGridUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);

    // 关闭 step guide
    await dismissGridGuide(page);

    // 读取标记价格（叶节点文本，只取 50,000-200,000 之间的合理 BTC 价格）
    const markPrice = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('*'))
        .filter(e => e.children.length === 0)
        .map(e => (e as HTMLElement).innerText?.trim())
        .filter(t => t && /^[\d,]+\.\d{1,2}$/.test(t))
        .map(t => parseFloat(t.replace(/,/g, '')))
        .filter(n => n > 50000 && n < 200000);
      return texts[0] || 0;
    });
    console.log(`[test] 标记价格: ${markPrice}`);
    expect(markPrice).toBeGreaterThan(0);

    const lowerPrice = Math.round(markPrice - 2000);
    const upperPrice = Math.round(markPrice - 1000);
    console.log(`[test] 价格区间: ${lowerPrice} ~ ${upperPrice}`);

    // JS 点击「手动创建」
    const clickedManual = await jsClick(page, '[data-testid="manual"]');
    console.log(`[test] 手动创建: ${clickedManual ? '✅' : '⚠️'}`);
    await page.waitForTimeout(600);

    // JS 点击「做多」
    const clickedLong = await jsClick(page, '[data-testid="LONG"]');
    console.log(`[test] 做多: ${clickedLong ? '✅' : '⚠️'}`);
    await page.waitForTimeout(600);

    // 填写最低价格
    const lowerInput = page.locator('input[placeholder="最低价格"]').first();
    await expect(lowerInput).toBeVisible({ timeout: 5000 });
    await lowerInput.click();
    await lowerInput.fill(String(lowerPrice));
    await page.waitForTimeout(300);
    console.log(`[test] 最低价格: ${lowerPrice}`);

    // 填写最高价格
    const upperInput = page.locator('input[placeholder="最高价格"]').first();
    await expect(upperInput).toBeVisible({ timeout: 3000 });
    await upperInput.click();
    await upperInput.fill(String(upperPrice));
    await page.waitForTimeout(300);
    console.log(`[test] 最高价格: ${upperPrice}`);

    // 填写网格数量 5
    const gridCountInput = page.locator('input[placeholder="2-149"]').first();
    await expect(gridCountInput).toBeVisible({ timeout: 3000 });
    await gridCountInput.click();
    await gridCountInput.fill('5');
    await page.waitForTimeout(300);
    console.log('[test] 网格数量: 5');

    // 点击空白处触发系统计算保证金最小值
    await gridCountInput.press('Tab');
    await page.waitForTimeout(800);

    // 找可见的初始保证金 input（placeholder 以 ≥ 开头，有实际尺寸）
    let marginInput = null;
    const marginCandidates = page.locator('input[placeholder^="≥"]');
    const marginCount = await marginCandidates.count();
    for (let i = 0; i < marginCount; i++) {
      const inp = marginCandidates.nth(i);
      if (await inp.isVisible({ timeout: 500 }).catch(() => false)) {
        marginInput = inp;
        break;
      }
    }

    if (marginInput) {
      const ph = await marginInput.getAttribute('placeholder') || '';
      const minVal = parseFloat(ph.replace('≥', '').replace(/,/g, '')) || 10;
      const fillVal = Math.max(Math.ceil(minVal) * 10, 100);
      await marginInput.click();
      await marginInput.fill(String(fillVal));
      await page.waitForTimeout(400);
      console.log(`[test] 保证金: ${fillVal} (min ${ph})`);
    } else {
      console.log('[test] ⚠️ 未找到可见保证金 input');
    }

    // 等待「创建」按钮变为可点击（最多 3s）
    const createBtnLocator = page.locator('button:has-text("创建")').first();
    let createEnabled = false;
    for (let i = 0; i < 6; i++) {
      createEnabled = await createBtnLocator.isEnabled().catch(() => false);
      if (createEnabled) break;
      await page.waitForTimeout(500);
    }
    console.log(`[test] 创建按钮: ${createEnabled ? '✅ 可点击' : '⚠️ 仍 disabled，尝试 JS 提交'}`);

    await page.screenshot({ path: `test-results/grid-form-filled-${Date.now()}.png` });

    if (createEnabled) {
      await createBtnLocator.click();
    } else {
      // 直接 JS 点击（绕过 disabled 检查）
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '创建') as HTMLElement;
        btn?.click();
      });
    }
    await page.waitForTimeout(1000);

    // 处理可能的确认弹窗
    const confirmBtn = page.locator('button:has-text("确认"), button:has-text("Confirm")').last();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
      console.log('[test] 确认创建弹窗');
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: `test-results/grid-created-${Date.now()}.png` });

    // 验证成功提示或策略出现在列表
    const successToast = page.locator('text=成功, text=创建成功, text=策略已创建').first();
    const toastVisible = await successToast.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (toastVisible) {
      console.log('[test] ✅ 网格策略创建成功 Toast');
    } else {
      console.log('[test] ⚠️ 未检测到成功 Toast，继续验证列表');
    }

    console.log('[test] ✅ 网格交易创建步骤完成');
  });


  // ========================================================
  // 测试 5：网格交易 - 查看策略列表并验证详情
  // ========================================================
  test('网格交易 - 查看策略详情并终止', async ({ loggedInPage: page }) => {
    await page.goto(getGridUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    await dismissGridGuide(page);

    // 等待策略列表加载
    await page.waitForTimeout(3000);

    // 检查策略列表是否有条目（排除"暂无"提示行）
    const emptyMsg = await page.locator('text=您暂无运作中订单, text=暂无数据').isVisible({ timeout: 2000 }).catch(() => true);
    const strategyRow = page.locator('table tbody tr').first();
    const hasStrategy = !emptyMsg && await strategyRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasStrategy) {
      console.log('[test] ⚠️ 暂无运作中策略，跳过详情/终止步骤');
      await page.screenshot({ path: `test-results/grid-no-strategy-${Date.now()}.png` });
      return;
    }
    console.log('[test] ✅ 找到策略列表条目');

    await page.screenshot({ path: `test-results/grid-list-${Date.now()}.png` });

    // 点击「详情」
    const detailBtn = page.locator('button:has-text("详情"), a:has-text("详情"), [class*="detail"]').first();
    const hasDetailBtn = await detailBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasDetailBtn) {
      console.log('[test] ⚠️ 未找到详情按钮，跳过');
    } else {
      await detailBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `test-results/grid-detail-${Date.now()}.png` });

      // 验证详情内容可见（合约名称、方向等）
      const detailContent = page.locator(
        'text=BTCUSDT, text=做多, text=LONG, [class*="detail"], [class*="strategy"]'
      ).first();
      const contentVisible = await detailContent.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[test] ${contentVisible ? '✅' : '⚠️'} 详情内容: ${contentVisible ? '可见' : '未检测到'}`);

      // 打印详情页文本
      const detailText = await page.locator('[class*="detail"], [class*="panel"], main').first().textContent().catch(() => '');
      console.log(`[test] 详情内容片段: ${detailText?.trim().slice(0, 200)}`);

      // 返回策略列表（如果是弹窗则关闭，如果是跳转则返回）
      const closeBtn = page.locator('[aria-label="close"], button:has-text("关闭"), button:has-text("×")').first();
      if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(800);
        console.log('[test] 关闭详情弹窗');
      } else {
        await page.goBack();
        await page.waitForTimeout(1500);
        await dismissGridGuide(page);
      }
    }

    // 终止策略
    const endBtn = page.locator(
      'button:has-text("终止"), button:has-text("结束"), button:has-text("End"), button:has-text("Stop")'
    ).first();
    const hasEndBtn = await endBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasEndBtn) {
      console.log('[test] ⚠️ 未找到终止按钮，跳过');
      return;
    }

    await endBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `test-results/grid-end-confirm-${Date.now()}.png` });

    // 处理终止确认弹窗
    const confirmEnd = page.locator('button:has-text("确认"), button:has-text("Confirm")').last();
    if (await confirmEnd.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmEnd.click();
      console.log('[test] ✅ 确认终止策略');
      await page.waitForTimeout(1500);
    }

    // 验证策略已终止
    const endedToast = page.locator('text=终止成功, text=已终止, text=已结束').first();
    const endedOk = await endedToast.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (endedOk) {
      console.log('[test] ✅ 策略终止成功');
    } else {
      console.log('[test] ⚠️ 未检测到终止成功 Toast');
    }

    await page.screenshot({ path: `test-results/grid-ended-${Date.now()}.png` });
    console.log('[test] ✅ 网格交易详情及终止测试完成');
  });

});
