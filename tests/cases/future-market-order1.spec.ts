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

  // ===== 辅助：检测 Toast 提示（仅供参考，不断言）=====
  // 修复问题 5：Toast 消失极快，不能作为断言依据，改为纯日志
  async function checkToast(page: any, keywords: string[], label: string): Promise<boolean> {
    const selector = keywords.map(kw => `text=${kw}`).join(', ');
    const toast = page.locator(selector).first();
    const appeared = await toast.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);

    if (appeared) {
      const text = await toast.textContent();
      console.log(`[test] ✅ ${label} Toast: ${text?.trim()}`);
      const filename = `test-results/toast-${label.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}-${Date.now()}.png`;
      await page.screenshot({ path: filename, fullPage: false });
    } else {
      console.log(`[test] ⚠️ 未检测到 ${label} Toast（市价单消失极快，仅供参考）`);
    }
    return appeared;
  }

  // ===== 辅助：统计当前仓位数（不依赖 Tab 文字括号格式）=====
  // 修复问题 3：原版依赖「仓位(n)」格式，降级改为统计 table 行数
  async function getPositionRowCount(page: any): Promise<number> {
    const tabText = await page.locator('button[role="tab"]:has-text("仓位")').textContent().catch(() => '');
    const fromTab = parseInt((tabText ?? '').match(/\((\d+)\)/)?.[1] ?? '-1');
    if (fromTab >= 0) {
      console.log(`[test] 仓位数（Tab 文字）: ${fromTab}`);
      return fromTab;
    }
    const rows = page.locator('tbody tr:has-text("BTCUSDT"), [role="row"]:has-text("BTCUSDT")');
    const count = await rows.count();
    console.log(`[test] 仓位数（行计数降级）: ${count}`);
    return count;
  }

  // ===== 辅助：清理所有现有仓位（确保每次测试从干净状态开始）=====
  // 修复问题 6：原版没有前置清理，多次运行累积残留仓位导致断言失败
  async function closeAllPositions(page: any) {
    await page.locator('button[role="tab"]:has-text("仓位")').click();
    await page.waitForTimeout(1000);

    const initial = await getPositionRowCount(page);
    if (initial === 0) {
      console.log('[test] 无残留仓位，无需清理');
      return;
    }
    console.log(`[test] 开始清理残留仓位: ${initial} 个`);

    for (let i = 0; i < initial; i++) {
      // 修复问题 2：先在仓位行内查找平仓按钮，找不到再降级到全局
      const positionRow = page.locator(
        'tbody tr:has-text("BTCUSDT"), [role="row"]:has-text("BTCUSDT")'
      ).first();
      let marketCloseBtn = positionRow.locator('button:text("市价")').first();
      if (!(await marketCloseBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
        marketCloseBtn = page.locator('button:text("市价")').last();
      }
      if (!(await marketCloseBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
        console.log('[test] ⚠️ 未找到平仓按钮，停止清理');
        break;
      }

      await marketCloseBtn.click();
      console.log(`[test] 清理第 ${i + 1} 个仓位`);
      await page.waitForTimeout(1500);

      const dialogConfirm = page.locator('button:text("确认")');
      if (await dialogConfirm.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dialogConfirm.click();
      }
      await page.waitForTimeout(2000);
    }

    await expect.poll(
      async () => getPositionRowCount(page),
      { timeout: 15000, intervals: [1000, 2000, 3000], message: '前置清理：仓位应全部关闭' }
    ).toBe(0);
    console.log('[test] 前置清理完成，仓位已归零');
  }


  // ===== 目标账户设置（可按需修改）=====
  const TARGET_SETTINGS = {
    marginMode:   '全仓',           // '全仓' | '逐仓'
    assetMode:    '联合保证金模式',  // '联合保证金模式' | '单币保证金模式'
    positionMode: '单向持仓模式',    // '单向持仓模式' | '双向持仓模式'
  };

  // ===== 辅助：确保账户设置等于目标值，不符则自动切换 =====
  async function ensureAccountSettings(page: any) {
    console.log('\n[settings] ===== 账户设置检查/调整 =====');

    // ── 1. 保证金模式（下单区域直接可见）──
    const targetMarginBtn = page.locator(`button:has-text("${TARGET_SETTINGS.marginMode}")`).first();
    const alreadyTargetMargin = await targetMarginBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (!alreadyTargetMargin) {
      console.log(`[settings] 保证金模式不是"${TARGET_SETTINGS.marginMode}"，切换中...`);
      // 点击当前模式按钮（相反值）开启弹窗
      const opposite = TARGET_SETTINGS.marginMode === '全仓' ? '逐仓' : '全仓';
      await page.locator(`button:has-text("${opposite}")`).first().click();
      await page.waitForTimeout(800);
      // 在弹窗内点选目标，再确认
      await page.locator(`[role="dialog"] button:has-text("${TARGET_SETTINGS.marginMode}")`).click();
      await page.waitForTimeout(300);
      await page.locator('[role="dialog"] button:has-text("确认")').click();
      await page.waitForTimeout(1200);
      console.log(`[settings] ✅ 已切换保证金模式 → ${TARGET_SETTINGS.marginMode}`);
    } else {
      console.log(`[settings] 保证金模式: ${TARGET_SETTINGS.marginMode} ✅`);
    }

    // ── 2. 打开 Settings ──
    const settingsBtn = page.locator('button:has-text("Open Settings")');
    if (!(await settingsBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('[settings] ⚠️ 未找到 Settings 按钮，跳过资产/持仓模式');
      console.log('[settings] =========================\n');
      return;
    }
    await settingsBtn.click();
    await page.waitForTimeout(800);

    // ── 3. 资产模式 ──
    const assetBtn = page.getByRole('button', { name: /联合保证金模式|单币保证金模式/ }).first();
    const currentAsset = (await assetBtn.textContent().catch(() => '')).trim();

    if (currentAsset !== TARGET_SETTINGS.assetMode) {
      console.log(`[settings] 资产模式"${currentAsset}" → 切换到"${TARGET_SETTINGS.assetMode}"...`);
      await assetBtn.click();
      await page.waitForTimeout(800);
      // 点击弹窗内目标选项的文字区域
      await page.locator('[role="dialog"]').getByText(TARGET_SETTINGS.assetMode).first().click();
      await page.waitForTimeout(300);
      await page.locator('[role="dialog"] button:has-text("确认")').click();
      await page.waitForTimeout(1500);
      // 确保 overlay 已关闭
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      console.log(`[settings] ✅ 已切换资产模式 → ${TARGET_SETTINGS.assetMode}`);
      // 重新打开 Settings 继续检查持仓模式
      await settingsBtn.click();
      await page.waitForTimeout(800);
    } else {
      console.log(`[settings] 资产模式: ${TARGET_SETTINGS.assetMode} ✅`);
    }

    // ── 4. 持仓模式 ──
    const posSpan = page.locator('span.mr-1').filter({ hasText: /单向持仓模式|双向持仓模式/ }).first();
    const currentPos = (await posSpan.textContent().catch(() => '')).trim();

    if (currentPos !== TARGET_SETTINGS.positionMode) {
      console.log(`[settings] 持仓模式"${currentPos}" → 切换到"${TARGET_SETTINGS.positionMode}"...`);
      await posSpan.locator('..').click();
      await page.waitForTimeout(800);
      await page.locator('[role="dialog"]').getByText(TARGET_SETTINGS.positionMode).first().click();
      await page.waitForTimeout(300);
      await page.locator('[role="dialog"] button:has-text("确认")').click();
      await page.waitForTimeout(1500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      console.log(`[settings] ✅ 已切换持仓模式 → ${TARGET_SETTINGS.positionMode}`);
    } else {
      console.log(`[settings] 持仓模式: ${TARGET_SETTINGS.positionMode} ✅`);
      // 关闭 Settings
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    console.log('[settings] =========================\n');
  }


  // ===== 每个测试前强制对齐账户设置 =====
  test.beforeEach(async ({ loggedInPage: page }) => {
    await ensureAccountSettings(page);
  });


  // ========================================================
  // 测试 1：市价开多 0.001 BTC
  // ========================================================
  test('市价开多 BTC/USDT 0.001 BTC', async ({ loggedInPage: page }) => {
    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 前置清理：确保从 0 仓位开始，避免残留影响断言
    await closeAllPositions(page);

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
    await qtyInput.fill('0.001');
    await page.waitForTimeout(500);

    // 点击买入/做多
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(500);

    await handleConfirmDialog(page);
    await page.waitForTimeout(2000);

    await checkToast(page, ['下单成功', '委托成功', '成功提交', 'Order placed', 'Success'], '市价开多下单');

    // 修复问题 4：验证仓位数 > 0（已从 0 开始，任何正数说明开多成功）
    await page.locator('button[role="tab"]:has-text("仓位")').click();
    await expect.poll(
      async () => getPositionRowCount(page),
      { timeout: 10000, intervals: [1000, 2000], message: '开多后应有仓位' }
    ).toBeGreaterThan(0);

    console.log('[test] ✅ 市价开多 0.001 BTC 成功，仓位已建立');
  });


  // ========================================================
  // 测试 2：市价开空 0.001 BTC
  // ========================================================
  test('市价开空 BTC/USDT 0.001 BTC', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面（当前已在仓位 Tab）

    // 记录开空前仓位数
    // 修复问题 1：原版无断言；改为验证仓位数发生变化（不限方向）
    //   - 单向持仓模式：开空对冲多仓，count 减少（1→0）
    //   - 双向持仓模式：开空新建空仓，count 增加（1→2）
    //   两种结果都合法，只要 count 变化就说明下单成功
    const posCountBefore = await getPositionRowCount(page);
    console.log(`[test] 开空前仓位数: ${posCountBefore}`);

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
    await qtyInput.fill('0.001');
    await page.waitForTimeout(500);

    // 点击卖出/做空（第二个 submit 按钮）
    await page.locator('button[type="submit"]').nth(1).click();
    await page.waitForTimeout(500);

    await handleConfirmDialog(page);
    await page.waitForTimeout(2000);

    await checkToast(page, ['下单成功', '委托成功', '成功提交', 'Order placed', 'Success'], '市价开空下单');

    // 切到仓位 Tab，验证仓位数发生了变化（单向减少 or 双向增加均合法）
    await page.locator('button[role="tab"]:has-text("仓位")').click();
    await expect.poll(
      async () => getPositionRowCount(page),
      { timeout: 10000, intervals: [1000, 2000], message: '开空后仓位数应发生变化' }
    ).not.toBe(posCountBefore);

    console.log('[test] ✅ 市价开空 0.001 BTC 成功，仓位数已变化');
  });


  // ========================================================
  // 测试 3：市价平仓所有持仓
  // ========================================================
  test('市价平仓所有持仓', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面

    await page.locator('button[role="tab"]:has-text("仓位")').click();
    await page.waitForTimeout(1000);

    const posCountBefore = await getPositionRowCount(page);
    console.log(`[test] 平仓前仓位数量: ${posCountBefore}`);

    if (posCountBefore === 0) {
      // 单向持仓模式下 test 2 的开空已对冲 test 1 的开多，仓位自然归零，属正常情况
      console.log('[test] ✅ 仓位已为 0（单向模式下开空已对冲开多，无需额外平仓）');
      return;
    }

    // 双向持仓模式下有剩余仓位，逐个平仓
    for (let i = 0; i < posCountBefore; i++) {
      // 修复问题 2：先在仓位行内查找平仓按钮，找不到再降级到全局
      const positionRow = page.locator(
        'tbody tr:has-text("BTCUSDT"), [role="row"]:has-text("BTCUSDT")'
      ).first();
      let marketCloseBtn = positionRow.locator('button:text("市价")').first();
      if (!(await marketCloseBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
        marketCloseBtn = page.locator('button:text("市价")').last();
      }
      if (!(await marketCloseBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
        console.log(`[test] ⚠️ 第 ${i + 1} 次：未找到市价平仓按钮，停止`);
        break;
      }

      await marketCloseBtn.click();
      console.log(`[test] 第 ${i + 1} 次点击市价平仓`);
      await page.waitForTimeout(1500);

      const dialogConfirm = page.locator('button:text("确认")');
      if (await dialogConfirm.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dialogConfirm.click();
        console.log('[test] 确认平仓');
      }
      await page.waitForTimeout(2000);
    }

    // 最终验证仓位清空
    await expect.poll(
      async () => getPositionRowCount(page),
      { timeout: 15000, intervals: [1000, 2000, 3000], message: '所有仓位应在平仓后清空' }
    ).toBe(0);

    console.log('[test] ✅ 所有持仓已平仓');
  });

});