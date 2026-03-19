// spec: specs/futures-order.plan.md
// TODO: 待完善，暂时全部注释

// import { test, expect } from '../fixtures/auth';
//
// test.describe.serial('AsterDEX - 期货合约交易', () => {
//
//   async function clickBuyButton(page: any) {
//     await page.locator('button[type="submit"]').first().click();
//   }
//
//   async function clickSellButton(page: any) {
//     await page.locator('button[type="submit"]').nth(1).click();
//   }
//
//   async function handleConfirmDialog(page: any) {
//     await page.waitForTimeout(500);
//     const dialog = page.locator('text=订单确认').locator('..');
//     if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
//       const dialogBtns = dialog.locator('..').locator('button');
//       if (await dialogBtns.count() > 0) { await dialogBtns.last().click(); return; }
//     }
//     const cancelBtn = page.locator('button:text("取消")');
//     if (await cancelBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
//       await cancelBtn.locator('..').locator('button').last().click(); return;
//     }
//     const fallbackBtn = page.getByRole('button', { name: /确认|开多|开空|Confirm/i }).last();
//     if (await fallbackBtn.isVisible({ timeout: 1500 }).catch(() => false)) await fallbackBtn.click();
//   }
//
//   // 测试 1：BTC/USDT 限价开多 0.001 BTC
//   test('BTC/USDT 限价开多 0.001 BTC', async ({ loggedInPage: page }) => {
//     await page.goto(process.env.EXCHANGE_URL!);
//     await page.waitForLoadState('networkidle');
//     await page.waitForTimeout(1500);
//     await page.locator('button:not([role="combobox"]):text("限价")').click();
//     await page.waitForTimeout(1500);
//     const markPriceEl = page.locator('dt:has-text("标记价格")').locator('..').locator('dd').first();
//     await expect(markPriceEl).toBeVisible({ timeout: 10000 });
//     const markPrice = parseFloat(((await markPriceEl.textContent()) || '0').replace(/,/g, '').trim());
//     const limitOrderPrice = Math.floor(markPrice - 1000);
//     const priceInput = page.locator('input[placeholder="价格"]');
//     await priceInput.clear(); await priceInput.fill(String(limitOrderPrice));
//     await page.waitForTimeout(1500);
//     const qtyInput = page.locator('input[placeholder="数量"]');
//     await qtyInput.clear(); await qtyInput.fill('0.001');
//     await page.waitForTimeout(500);
//     await page.locator('button[type="submit"]').first().click();
//     await page.waitForTimeout(500);
//     const cancelBtn = page.locator('button:text("取消")');
//     if (await cancelBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
//       await cancelBtn.locator('..').locator('button').last().click();
//     }
//     await page.waitForTimeout(500);
//     await page.locator('button[role="tab"]:has-text("当前委托")').click();
//     await page.waitForTimeout(500);
//     await expect(page.locator('text=BTCUSDT').first()).toBeVisible({ timeout: 1500 });
//     console.log('[test] ✅ 限价开多 0.001 BTC 下单成功');
//   });
//
//   // 测试 2：BTC/USDT 市价开多
//   test('BTC/USDT 市价开多', async ({ loggedInPage: page }) => {
//     await page.locator('button:text("市价")').click();
//     await page.waitForTimeout(500);
//     const qtyInput = page.locator('input[placeholder="数量"]');
//     await qtyInput.clear(); await qtyInput.fill('0.001');
//     await page.waitForTimeout(500);
//     await clickBuyButton(page);
//     await page.waitForTimeout(1000);
//     await handleConfirmDialog(page);
//     await page.waitForTimeout(2000);
//     await page.locator('button[role="tab"]:has-text("仓位")').click();
//     await page.waitForTimeout(1000);
//     await expect(page.locator('text=BTCUSDT').first()).toBeVisible({ timeout: 10000 });
//   });
//
//   // 测试 3：取消第一个限价委托订单
//   test('取消第一个限价委托订单', async ({ loggedInPage: page }) => {
//     await page.locator('button[role="tab"]:has-text("当前委托")').click();
//     await page.waitForTimeout(1000);
//     const tabText = await page.locator('button[role="tab"]:has-text("当前委托")').textContent();
//     const orderCountBefore = parseInt(tabText?.match(/\((\d+)\)/)?.[1] || '0');
//     const firstCancelBtn = page.locator('button:text("取消")').first();
//     if (!(await firstCancelBtn.isVisible({ timeout: 5000 }).catch(() => false))) { console.log('[test] 没有委托订单，跳过'); return; }
//     await firstCancelBtn.click();
//     await page.waitForTimeout(1000);
//     const confirmBtn = page.locator('button:text("确认")');
//     if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) await confirmBtn.click();
//     await expect.poll(async () => {
//       const text = await page.locator('button[role="tab"]:has-text("当前委托")').textContent();
//       return parseInt(text?.match(/\((\d+)\)/)?.[1] || '0');
//     }, { timeout: 15000 }).toBeLessThan(orderCountBefore);
//     console.log('[test] ✅ 取消订单成功');
//   });
//
//   // 测试 4：市价平仓第一个持仓
//   test('市价平仓第一个持仓', async ({ loggedInPage: page }) => {
//     await page.locator('button[role="tab"]:has-text("仓位")').click();
//     await page.waitForTimeout(1000);
//     const tabText = await page.locator('button[role="tab"]:has-text("仓位")').textContent();
//     const posCountBefore = parseInt(tabText?.match(/\((\d+)\)/)?.[1] || '0');
//     if (posCountBefore === 0) { console.log('[test] 没有持仓，跳过'); return; }
//     const marketCloseBtn = page.locator('button:text("市价")').last();
//     await expect(marketCloseBtn).toBeVisible({ timeout: 5000 });
//     await marketCloseBtn.click();
//     await page.waitForTimeout(1500);
//     const dialogConfirm = page.locator('button:text("确认")');
//     if (await dialogConfirm.isVisible({ timeout: 3000 }).catch(() => false)) await dialogConfirm.click();
//     await expect.poll(async () => {
//       const text = await page.locator('button[role="tab"]:has-text("仓位")').textContent();
//       return parseInt(text?.match(/\((\d+)\)/)?.[1] || '0');
//     }, { timeout: 15000 }).toBeLessThan(posCountBefore);
//     console.log('[test] ✅ 市价平仓成功');
//   });
//
// });
