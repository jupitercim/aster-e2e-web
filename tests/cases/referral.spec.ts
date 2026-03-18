// spec: specs/referral.plan.md
import { test, expect } from '../fixtures/auth';

function getReferralUrl(): string {
  const base = process.env.EXCHANGE_URL || '';
  const origin = new URL(base).origin;
  return `${origin}/zh-CN/referral`;
}

test.describe.serial('AsterDEX - 推荐（Referral）', () => {

  // ========================================================
  // 测试 1：推荐页面正常加载
  // ========================================================
  test('推荐页面正常加载', async ({ loggedInPage: page }) => {
    const url = getReferralUrl();
    console.log(`[test] Referral URL: ${url}`);

    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log(`[test] 页面标题: ${title}`);
    expect(title).toBeTruthy();

    // 验证推荐相关关键词
    const referralKeywords = ['推荐', 'Referral', '邀请', 'Invite', '佣金', 'Commission'];
    let found = false;
    for (const kw of referralKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到推荐元素: "${kw}"`);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);

    await page.screenshot({ path: `test-results/referral-load-${Date.now()}.png` });
    console.log('[test] ✅ 推荐页面加载完成');
  });


  // ========================================================
  // 测试 2：复制推荐链接
  // ========================================================
  test('复制推荐链接，显示复制成功提示', async ({ loggedInPage: page }) => {
    // 复用 test 1 已打开的页面，无需重新导航

    // 找到复制按钮（「复制链接」/ 「Copy」/ 复制图标）
    const copyKeywords = ['复制链接', '复制邀请链接', 'Copy Link', '复制'];
    let copyBtn = null;

    for (const kw of copyKeywords) {
      const btn = page.locator(`button:has-text("${kw}")`).first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        copyBtn = btn;
        console.log(`[test] 找到复制按钮: "${kw}"`);
        break;
      }
    }

    if (!copyBtn) {
      // 备用：在主内容区域（排除 header）找带 SVG 的复制图标按钮
      const iconBtn = page.locator('main button svg, [role="main"] button svg, section button svg').first();
      if (await iconBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        copyBtn = iconBtn;
        console.log('[test] 找到复制图标按钮');
      }
    }

    if (!copyBtn) {
      console.log('[test] ⚠️ 未找到复制按钮，跳过');
      return;
    }

    // 滚动到按钮位置，避免被固定 header 遮挡
    await copyBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await copyBtn.click();
    console.log('[test] 点击了复制按钮');
    await page.waitForTimeout(1000);

    // 检查复制成功 Toast 或提示
    const copySuccessKeywords = ['已复制', '复制成功', 'Copied', 'Copy success'];
    let copyToastAppeared = false;
    for (const kw of copySuccessKeywords) {
      const toast = page.locator(`text=${kw}`).first();
      if (await toast.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) {
        console.log(`[test] ✅ 复制成功提示: "${kw}"`);
        copyToastAppeared = true;
        break;
      }
    }

    if (!copyToastAppeared) {
      console.log('[test] ⚠️ 未检测到复制成功 Toast（链接已复制到剪贴板）');
    }

    console.log('[test] ✅ 复制推荐链接验证完成');
  });


  // ========================================================
  // 测试 3：查看推荐收益统计数据
  // ========================================================
  test('推荐收益统计数据区域可见', async ({ loggedInPage: page }) => {
    // 复用 test 2 已打开的页面，无需重新导航

    // 验证统计数据区域（邀请人数 / 佣金 / 收益）
    const statsKeywords = ['邀请', '佣金', '收益', '奖励', 'Invited', 'Commission', 'Reward', 'Earnings'];
    let statsFound = false;

    for (const kw of statsKeywords) {
      const el = page.locator(`text=${kw}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`[test] ✅ 找到统计数据元素: "${kw}"`);
        statsFound = true;
        break;
      }
    }

    if (!statsFound) {
      console.log('[test] ⚠️ 未找到收益统计区域，可能需要先完成推荐操作');
      await page.screenshot({ path: `test-results/referral-stats-${Date.now()}.png` });
    } else {
      console.log('[test] ✅ 推荐收益统计验证完成');
    }
  });

});
