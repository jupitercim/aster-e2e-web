import { test, expect } from '../fixtures/auth';

// ===== 测试用例矩阵 =====
const TEST_CASES = [
  { id: 'test1',  assetMode: '单币保证金模式', positionMode: '单向持仓模式', marginMode: '逐仓', direction: 'long'  as const },
  { id: 'test2',  assetMode: '单币保证金模式', positionMode: '单向持仓模式', marginMode: '逐仓', direction: 'short' as const },
  { id: 'test3',  assetMode: '单币保证金模式', positionMode: '单向持仓模式', marginMode: '全仓', direction: 'long'  as const },
  { id: 'test4',  assetMode: '单币保证金模式', positionMode: '单向持仓模式', marginMode: '全仓', direction: 'short' as const },
  { id: 'test5',  assetMode: '单币保证金模式', positionMode: '双向持仓模式', marginMode: '逐仓', direction: 'long'  as const },
  { id: 'test6',  assetMode: '单币保证金模式', positionMode: '双向持仓模式', marginMode: '逐仓', direction: 'short' as const },
  { id: 'test7',  assetMode: '单币保证金模式', positionMode: '双向持仓模式', marginMode: '全仓', direction: 'long'  as const },
  { id: 'test8',  assetMode: '单币保证金模式', positionMode: '双向持仓模式', marginMode: '全仓', direction: 'short' as const },
  { id: 'test9',  assetMode: '联合保证金模式', positionMode: '单向持仓模式', marginMode: '全仓', direction: 'long'  as const },
  { id: 'test10', assetMode: '联合保证金模式', positionMode: '单向持仓模式', marginMode: '全仓', direction: 'short' as const },
  { id: 'test11', assetMode: '联合保证金模式', positionMode: '双向持仓模式', marginMode: '全仓', direction: 'long'  as const },
  { id: 'test12', assetMode: '联合保证金模式', positionMode: '双向持仓模式', marginMode: '全仓', direction: 'short' as const },
];

test.describe.serial('AsterDEX - 期货市价委托', () => {

  // ===== 辅助：统计当前仓位数 =====
  async function getPositionRowCount(page: any): Promise<number> {
    const tabText = await page.locator('button[role="tab"]:has-text("仓位")').textContent().catch(() => '');
    const fromTab = parseInt((tabText ?? '').match(/\((\d+)\)/)?.[1] ?? '-1');
    if (fromTab >= 0) return fromTab;
    return await page.locator('tbody tr:has-text("BTCUSDT"), [role="row"]:has-text("BTCUSDT")').count();
  }

  // ===== 辅助：处理下单确认弹窗 =====
  async function handleConfirmDialog(page: any) {
    await page.waitForTimeout(500);
    const dialog = page.locator('text=订单确认').locator('..');
    if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
      const btns = dialog.locator('..').locator('button');
      if (await btns.count() > 0) {
        await btns.last().click();
        console.log('[order] 点击了订单确认按钮');
        return;
      }
    }
    const fallback = page.getByRole('button', { name: /买入\/做多|卖出\/做空|确认|Confirm/i }).last();
    if (await fallback.isVisible({ timeout: 1500 }).catch(() => false)) {
      await fallback.click();
      console.log('[order] fallback 点击了确认按钮');
    }
  }

  // ===== 辅助：查看当前模式（日志，不修改）=====
  async function logCurrentSettings(page: any) {
    console.log('\n[check] ===== 当前账户设置 =====');
    const isCross    = await page.locator('button:has-text("全仓")').first().isVisible({ timeout: 2000 }).catch(() => false);
    const isIsolated = await page.locator('button:has-text("逐仓")').first().isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`[check] 保证金模式: ${isCross ? '全仓' : isIsolated ? '逐仓' : '未知'}`);

    const settingsBtn = page.locator('button:has-text("Open Settings")');
    if (!(await settingsBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('[check] ⚠️ 未找到 Settings 按钮');
      console.log('[check] =========================\n');
      return;
    }
    await settingsBtn.click();
    await page.waitForTimeout(800);

    let assetMode = '未知';
    for (const opt of ['联合保证金模式', '单币保证金模式']) {
      if (await page.getByRole('button', { name: opt }).isVisible({ timeout: 1000 }).catch(() => false)) {
        assetMode = opt; break;
      }
    }
    console.log(`[check] 资产模式: ${assetMode}`);

    const posSpan = page.locator('span.mr-1').filter({ hasText: /单向持仓模式|双向持仓模式/ }).first();
    const posMode = (await posSpan.textContent().catch(() => '')).trim() || '未知';
    console.log(`[check] 持仓模式: ${posMode}`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    console.log('[check] =========================\n');
  }

  // ===== 辅助：设置账户模式（如与目标不符则自动切换）=====
  async function setAccountSettings(page: any, assetMode: string, positionMode: string, marginMode: string) {
    console.log(`[settings] 目标: 资产=${assetMode} | 持仓=${positionMode} | 保证金=${marginMode}`);

    // ── 资产模式 + 持仓模式（Settings 内）──
    const settingsBtn = page.locator('button:has-text("Open Settings")');
    await settingsBtn.click();
    await page.waitForTimeout(800);

    // 资产模式
    const assetBtn = page.getByRole('button', { name: /联合保证金模式|单币保证金模式/ }).first();
    const currentAsset = (await assetBtn.textContent().catch(() => '')).trim();
    if (currentAsset !== assetMode) {
      await assetBtn.click();
      await page.waitForTimeout(800);
      await page.locator('[role="dialog"]').getByText(assetMode).first().click();
      await page.waitForTimeout(300);
      await page.locator('[role="dialog"] button:has-text("确认")').click();
      await page.waitForTimeout(1500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      console.log(`[settings] ✅ 资产模式 → ${assetMode}`);
      // 重新打开 Settings
      await settingsBtn.click();
      await page.waitForTimeout(800);
    }

    // 持仓模式
    const posSpan = page.locator('span.mr-1').filter({ hasText: /单向持仓模式|双向持仓模式/ }).first();
    const currentPos = (await posSpan.textContent().catch(() => '')).trim();
    if (currentPos !== positionMode) {
      await posSpan.locator('..').click();
      await page.waitForTimeout(800);
      await page.locator('[role="dialog"]').getByText(positionMode).first().click();
      await page.waitForTimeout(300);
      await page.locator('[role="dialog"] button:has-text("确认")').click();
      await page.waitForTimeout(1500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      console.log(`[settings] ✅ 持仓模式 → ${positionMode}`);
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // ── 保证金模式（下单区域）──
    const targetVisible = await page.locator(`button:has-text("${marginMode}")`).first().isVisible({ timeout: 2000 }).catch(() => false);
    if (!targetVisible) {
      const opposite = marginMode === '全仓' ? '逐仓' : '全仓';
      await page.locator(`button:has-text("${opposite}")`).first().click();
      await page.waitForTimeout(800);
      await page.locator(`[role="dialog"] button:has-text("${marginMode}")`).click();
      await page.waitForTimeout(300);
      await page.locator('[role="dialog"] button:has-text("确认")').click();
      await page.waitForTimeout(1200);
      console.log(`[settings] ✅ 保证金模式 → ${marginMode}`);
    }

    console.log('[settings] 设置完毕\n');
  }

  // ===== 辅助：市价下单 =====
  async function placeMarketOrder(page: any, direction: 'long' | 'short', qty: string) {
    await page.locator('#tour-guide-place-order button:text("市价"), button:text("市价")').first().click();
    await page.waitForTimeout(500);

    const combobox = page.locator('#tour-guide-place-order button[role="combobox"]');
    if (await combobox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await combobox.click();
      await page.locator('[role="option"]:has-text("BTC")').click();
      await page.waitForTimeout(300);
    }

    const qtyInput = page.locator('input[placeholder="数量"]');
    await qtyInput.clear();
    await qtyInput.fill(qty);
    await page.waitForTimeout(500);

    const submitBtn = direction === 'long'
      ? page.locator('button[type="submit"]').first()
      : page.locator('button[type="submit"]').nth(1);
    await submitBtn.click();
    await page.waitForTimeout(500);

    await handleConfirmDialog(page);
    await page.waitForTimeout(2000);
    console.log(`[order] 已下单 市价${direction === 'long' ? '开多' : '开空'} ${qty} BTC`);
  }

  // ===== 辅助：市价平仓所有仓位 =====
  async function closeAllPositions(page: any) {
    await page.locator('button[role="tab"]:has-text("仓位")').click();
    await page.waitForTimeout(1000);

    const count = await getPositionRowCount(page);
    if (count === 0) {
      console.log('[close] 无仓位，无需平仓');
      return;
    }
    console.log(`[close] 开始平仓，共 ${count} 个仓位`);

    for (let i = 0; i < count; i++) {
      const posRow = page.locator('tbody tr:has-text("BTCUSDT"), [role="row"]:has-text("BTCUSDT")').first();
      let closeBtn = posRow.locator('button:text("市价")').first();
      if (!(await closeBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
        closeBtn = page.locator('button:text("市价")').last();
      }
      if (!(await closeBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
        console.log('[close] ⚠️ 未找到平仓按钮，停止');
        break;
      }
      await closeBtn.click();
      await page.waitForTimeout(1500);
      const confirmBtn = page.locator('button:text("确认")');
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      await page.waitForTimeout(2000);
    }

    await expect.poll(
      () => getPositionRowCount(page),
      { timeout: 15000, intervals: [1000, 2000, 3000], message: '平仓后仓位应为 0' }
    ).toBe(0);
    console.log('[close] ✅ 所有仓位已平仓');
  }


  // ===== beforeEach：清理残留仓位（防止上一个用例异常未平仓）=====
  test.beforeEach(async ({ loggedInPage: page }) => {
    await page.locator('button[role="tab"]:has-text("仓位")').click();
    await page.waitForTimeout(1000);
    const residual = await getPositionRowCount(page);
    if (residual > 0) {
      console.log(`[beforeEach] 发现残留仓位 ${residual} 个，清理中...`);
      await closeAllPositions(page);
    }
  });


  // ===== 12 个测试用例（数据驱动）=====
  for (const tc of TEST_CASES) {
    const label = `${tc.id}: ${tc.assetMode} | ${tc.positionMode} | ${tc.marginMode} | 市价${tc.direction === 'long' ? '开多' : '开空'}`;

    test(label, async ({ loggedInPage: page }) => {
      // 1. 查看当前设置（日志）
      await logCurrentSettings(page);

      // 2. 设置目标模式
      await setAccountSettings(page, tc.assetMode, tc.positionMode, tc.marginMode);

      // 3. 市价下单
      await placeMarketOrder(page, tc.direction, '0.001');

      // 4. 检查仓位 开仓成功
      await page.locator('button[role="tab"]:has-text("仓位")').click();
      await expect.poll(
        () => getPositionRowCount(page),
        { timeout: 10000, intervals: [1000, 2000], message: `${tc.id} 开仓后应有仓位` }
      ).toBeGreaterThan(0);
      console.log(`[test] ✅ ${tc.id} 开仓成功`);

      // 5. 市价平仓
      await closeAllPositions(page);
    });
  }

});
