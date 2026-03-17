import { test, expect } from '../fixtures/auth';

function getReferralCodeUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/referral`;
}

test.describe.serial('AsterDEX - 推荐码页面', () => {

  // ========================================================
  // 测试 1：页面标题存在且有效
  // ========================================================
  test('推荐码页面标题可见', async ({ loggedInPage: page }) => {
    const url = getReferralCodeUrl();
    console.log(`[test] 推荐码 URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // 验证页面内有推荐/邀请相关标题文字
    const titleKeywords = ['推荐', 'Referral', '邀请', 'Invite', '推荐码', 'Referral Code'];
    let titleFound = false;
    for (const kw of titleKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到页面标题元素: "${kw}"`);
        titleFound = true;
        break;
      }
    }
    expect(titleFound).toBe(true);

    await page.screenshot({ path: `test-results/referral-code-title-${Date.now()}.png` });
    console.log('[test] ✅ 推荐码页面标题验证完成');
  });


  // ========================================================
  // 测试 2：推荐码文本可见
  // ========================================================
  test('推荐码文本可见', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    // 推荐码通常是一段短字母/数字字符串，查找其标签或容器
    const codeKeywords = ['推荐码', 'Referral Code', '邀请码', 'Invite Code', '我的推荐码', 'My Code'];
    let codeFound = false;

    for (const kw of codeKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到推荐码标签: "${kw}"`);
        codeFound = true;
        break;
      }
    }

    if (!codeFound) {
      // 备用：查找看起来像推荐码的短字符串（大写字母+数字，4-12 位）
      const codePattern = page.locator('[class*="code"], [class*="referral-code"], [class*="invite-code"]').first();
      if (await codePattern.isVisible({ timeout: 3000 }).catch(() => false)) {
        const codeText = await codePattern.textContent().catch(() => '');
        console.log(`[test] ✅ 找到推荐码元素，内容: "${codeText}"`);
        codeFound = true;
      }
    }

    expect(codeFound).toBe(true);

    await page.screenshot({ path: `test-results/referral-code-text-${Date.now()}.png` });
    console.log('[test] ✅ 推荐码文本验证完成');
  });


  // ========================================================
  // 测试 3：复制按钮存在
  // ========================================================
  test('复制按钮存在', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    // 优先通过文字匹配复制按钮
    const copyKeywords = ['复制', 'Copy', '复制推荐码', '复制链接', 'Copy Code', 'Copy Link'];
    let copyBtnFound = false;

    for (const kw of copyKeywords) {
      const btn = page.locator(`button:has-text("${kw}"), [role="button"]:has-text("${kw}")`).first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到复制按钮: "${kw}"`);
        copyBtnFound = true;
        break;
      }
    }

    if (!copyBtnFound) {
      // 备用：查找带复制图标（SVG）的按钮（排除 header/nav 区域）
      const iconBtn = page
        .locator('main button svg, [role="main"] button svg, section button svg, [class*="referral"] button svg')
        .first();
      if (await iconBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[test] ✅ 找到带 SVG 图标的复制按钮');
        copyBtnFound = true;
      }
    }

    if (!copyBtnFound) {
      // 末级备用：查找任意 class 包含 copy 的可点击元素
      const classCopyBtn = page.locator('[class*="copy"]').first();
      if (await classCopyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[test] ✅ 找到 class 含 copy 的元素');
        copyBtnFound = true;
      }
    }

    expect(copyBtnFound).toBe(true);

    await page.screenshot({ path: `test-results/referral-code-copy-btn-${Date.now()}.png` });
    console.log('[test] ✅ 复制按钮存在验证完成');
  });

});
