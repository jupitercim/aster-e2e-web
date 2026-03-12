import { test, expect } from '../fixtures/auth';

// 从 EXCHANGE_URL 推导出站点根域
function getBaseOrigin(): string {
  const url = process.env.EXCHANGE_URL || 'https://www.astherusqa.finance/zh-CN';
  return new URL(url).origin;
}

test.describe.serial('AsterDEX - 系统健康检查', () => {

  // ========================================================
  // 测试 1：主页可正常加载
  // ========================================================
  test('主页可正常加载', async ({ loggedInPage: page }) => {
    const origin = getBaseOrigin();
    await page.goto(`${origin}/zh-CN`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 验证页面标题不为空
    const title = await page.title();
    console.log(`[health] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // 验证页面没有出现 HTTP 错误页（检查 h1 标签，避免误匹配 JS chunk 中的数字）
    const errorPage = page.locator([
      'h1:text-is("404")',
      'h1:text-is("500")',
      'h1:has-text("Not Found")',
      'h1:has-text("Internal Server Error")',
    ].join(', '));
    const hasErrorPage = await errorPage.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasErrorPage).toBe(false);

    console.log('[health] ✅ 主页加载正常');
  });

  // ========================================================
  // 测试 2：合约交易页可正常加载
  // ========================================================
  test('合约交易页可正常加载', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    await page.goto(process.env.EXCHANGE_URL!);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // 验证关键交易组件存在（限价/市价按钮）
    const limitBtn = page.locator('button:not([role="combobox"]):text("限价")');
    const marketBtn = page.locator('button:text("市价")');

    const limitVisible = await limitBtn.isVisible({ timeout: 5000 }).catch(() => false);
    const marketVisible = await marketBtn.isVisible({ timeout: 5000 }).catch(() => false);

    expect(limitVisible || marketVisible).toBe(true);
    console.log(`[health] ✅ 合约交易页加载正常 | 限价: ${limitVisible} | 市价: ${marketVisible}`);
  });

  // ========================================================
  // 测试 3：网络请求无明显 5xx 错误
  // ========================================================
  test('网络请求无 5xx 错误', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    const failedRequests: string[] = [];

    page.on('response', (response) => {
      if (response.status() >= 500) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    // 触发一次页面刷新，收集网络请求
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    if (failedRequests.length > 0) {
      console.warn(`[health] ⚠️ 检测到 5xx 请求:\n${failedRequests.join('\n')}`);
    } else {
      console.log('[health] ✅ 无 5xx 错误');
    }

    // 允许最多 0 个 5xx 错误
    expect(failedRequests.length).toBe(0);
  });

});
