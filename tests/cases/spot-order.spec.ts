import { test, expect } from '../fixtures/auth';

test.describe.serial('AsterDEX - 现货交易', () => {

  test('BTC/USDT 限价买入', async ({ loggedInPage: page }) => {
    await page.goto('/trade/BTC-USDT');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 选择限价单
    await page.getByText('限价', { exact: true }).first().click();
    await page.waitForTimeout(500);

    await page.fill('[data-testid="price-input"]', '60000');
    await page.fill('[data-testid="amount-input"]', '0.003');

    // 点击买入 BTC 按钮
    await page.getByRole('button', { name: /买入|Buy/i }).first().click();
    await page.waitForTimeout(1500);

    // 确认弹窗
    const confirmBtn = page.getByRole('button', { name: /确认|Confirm/i });
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await page.waitForTimeout(2000);

    const orderRow = page.locator('[data-testid="open-orders"] tr').first();
    await expect(orderRow).toContainText('BTC/USDT');
    await expect(orderRow).toContainText('60000');
  });

  test('市价买入 200 USDT 的 BTC', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    // 切换到市价单
    await page.getByText('市价', { exact: true }).first().click();
    await page.waitForTimeout(500);

    await page.fill('[data-testid="total-input"]', '200');

    // 点击买入按钮
    await page.getByRole('button', { name: /买入|Buy/i }).first().click();
    await page.waitForTimeout(1500);

    // 确认弹窗
    const confirmBtn = page.getByRole('button', { name: /确认|Confirm/i });
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await page.waitForTimeout(2000);

    // 点击订单历史/最近成交 tab
    const historyTab = page.getByRole('tab', { name: /订单历史|成交记录|Order History|Recent Trades/i });
    await historyTab.click();
    await page.waitForTimeout(1000);

    // 验证存在 BTC/USDT 买单
    const order = page.locator('text=BTC/USDT').first();
    await expect(order).toBeVisible({ timeout: 10000 });
  });
});
