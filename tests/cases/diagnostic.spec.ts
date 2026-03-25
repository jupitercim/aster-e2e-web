// spec: specs/diagnostic.plan.md
import { test } from '../fixtures/auth';

test('DOM diagnostic - bottom panel', { tag: ['@P0', '@PROD'] }, async ({ loggedInPage: page }) => {
  await page.goto(process.env.EXCHANGE_URL!);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  // Click 仓位 tab (actual name for 当前持仓)
  await page.locator('button[role="tab"]:has-text("仓位")').first().click();
  await page.waitForTimeout(1500);

  const panelContent = await page.evaluate(() => {
    const results: string[] = [];
    // rows
    ['tbody tr', '[role="row"]', 'tr', '[role="rowgroup"] > *'].forEach(sel => {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        results.push(`sel="${sel}" count=${els.length} first="${(els[0].textContent || '').trim().slice(0, 80)}"`);
      }
    });
    // empty state text
    const bodyText = document.body.innerText;
    ['暂无数据', 'No Data', 'No orders', 'No positions', '无数据', 'Empty', '暂无', '没有'].forEach(kw => {
      if (bodyText.includes(kw)) results.push(`Empty: "${kw}"`);
    });
    // look for the panel container class
    document.querySelectorAll('[class]').forEach(el => {
      const cls = el.className;
      if (typeof cls !== 'string') return;
      const box = (el as HTMLElement).getBoundingClientRect();
      if (box.width > 300 && box.height > 100 && box.top > 400) {
        if (cls.includes('panel') || cls.includes('Panel') || cls.includes('table') || cls.includes('Table') || cls.includes('position') || cls.includes('order')) {
          results.push(`BIG container: ${el.tagName} class="${cls.slice(0, 100)}" at top=${Math.round(box.top)} size=${Math.round(box.width)}x${Math.round(box.height)}`);
        }
      }
    });
    return results.slice(0, 30);
  });
  console.log('\n=== 底部面板（仓位 tab）===');
  panelContent.forEach(p => console.log(p));

  // Check what the position rows actually look like
  const positionRowInfo = await page.evaluate(() => {
    // Find all elements in lower half of page with data
    const lowerEls: string[] = [];
    document.querySelectorAll('[class]').forEach(el => {
      const box = (el as HTMLElement).getBoundingClientRect();
      if (box.top > window.innerHeight * 0.6 && box.height < 60 && box.height > 10 && box.width > 200) {
        const text = (el.textContent || '').trim().slice(0, 60);
        if (text && !lowerEls.includes(text)) {
          lowerEls.push(`${el.tagName}[class="${el.className.slice(0, 60)}"] "${text}"`);
        }
      }
    });
    return lowerEls.slice(0, 15);
  });
  console.log('\n=== 底部面板可见元素 ===');
  positionRowInfo.forEach(p => console.log(p));
});