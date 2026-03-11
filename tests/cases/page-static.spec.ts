import { test, expect } from '@playwright/test';
import { PageDiscovery, PageNode } from '../helpers/PageDiscovery';
import { VisualChecker, VisualCheckReport } from '../helpers/VisualChecker';
import { LEVEL1_PAGES } from '../config/pages.config';

test.describe('全站页面视觉检查', () => {
  test.describe.configure({ retries: 0, timeout: 1800000 });

  test('全站视觉检查', async ({ page, context, baseURL }) => {
    // 从 project 的 baseURL 取 origin + /zh-CN，忽略后面的路径
    const BASE_URL = baseURL
      ? `${new URL(baseURL).origin}/zh-CN`
      : 'https://www.astherusqa.finance/zh-CN';

    // 将 pages.config.ts 里的相对路径拼接为完整 URL
    const level1FullUrls = LEVEL1_PAGES.map(path =>
      path.startsWith('http') ? path : `${new URL(BASE_URL).origin}${path}`
    );
    const allReports: VisualCheckReport[] = [];

    // ── 请求头验证（抓取第一个同域请求，记录 header 到报告）────────
    await test.step('验证请求头', async () => {
      const origin = new URL(BASE_URL).origin;
      const request = await Promise.race([
        page.waitForRequest(req => req.url().startsWith(origin), { timeout: 15000 }),
        // 触发一次导航让请求发出
        page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 })
          .then(() => null),
      ]);

      const capturedRequest = request ?? await page.waitForRequest(
        req => req.url().startsWith(origin), { timeout: 5000 }
      ).catch(() => null);

      if (capturedRequest) {
        const headers = capturedRequest.headers();
        const relevant = Object.entries(headers)
          .filter(([k]) => !['accept', 'accept-encoding', 'accept-language',
            'cache-control', 'connection', 'sec-fetch-dest', 'sec-fetch-mode',
            'sec-fetch-site', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform',
            'upgrade-insecure-requests'].includes(k))
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');

        test.info().annotations.push({
          type: '请求URL',
          description: capturedRequest.url(),
        });
        test.info().annotations.push({
          type: '请求Headers',
          description: relevant,
        });
        console.log(`[header] URL: ${capturedRequest.url()}`);
        console.log(`[header] k8scluster: ${headers['k8scluster'] ?? '(未设置)'}`);
      } else {
        test.info().annotations.push({ type: '请求Headers', description: '未能捕获请求' });
      }
    });

    // ── 第一步：发现阶段 ─────────────────────────────────────────
    let pages: PageNode[] = [];
    await test.step('发现页面', async () => {
      console.log('\n' + '═'.repeat(60));
      console.log(`[discovery] 基础域名: ${BASE_URL}`);
      console.log(`[discovery] 一级页面配置数: ${level1FullUrls.length}`);
      console.log('═'.repeat(60));

      const discovery = new PageDiscovery(BASE_URL);
      pages = await discovery.discoverFromLevel1List(page, level1FullUrls);

      const depth1 = pages.filter(p => p.depth === 1);
      const depth2 = pages.filter(p => p.depth === 2);

      console.log(`\n[discovery] 共发现 ${pages.length} 个页面:`);
      console.log(`  一级（配置）: ${depth1.length} 个`);
      depth1.forEach(p => console.log(`    ${p.url}${p.title ? `  ← ${p.title}` : ''}`));
      console.log(`  二级（自动）: ${depth2.length} 个`);
      depth2.forEach(p => console.log(`    ${p.url}${p.title ? `  ← ${p.title}` : ''}`));
      console.log('');
    });

    // ── 第二步：逐页视觉检查 ─────────────────────────────────────
    let currentPage = page;

    for (const pageNode of pages) {
      await test.step(`[深度${pageNode.depth}] ${pageNode.url}`, async () => {
        const checker = new VisualChecker();

        // 若 page 已崩溃，重建一个新 page
        if (currentPage.isClosed()) {
          currentPage = await context.newPage();
        }

        try {
          await currentPage.goto(pageNode.url, { waitUntil: 'networkidle', timeout: 30000 });
        } catch (e: any) {
          // page crash：重建 page 后重试
          if (e?.message?.includes('crashed')) {
            console.warn(`[crash] ${pageNode.url} 导致 page 崩溃，重建 page 后重试`);
            try { await currentPage.close(); } catch {}
            currentPage = await context.newPage();
          }
          try {
            await currentPage.goto(pageNode.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await currentPage.waitForTimeout(3000);
          } catch (e2: any) {
            console.warn(`[skip] ${pageNode.url} 加载失败，跳过检查: ${e2?.message}`);
            return;
          }
        }

        const report = await checker.run(currentPage);
        allReports.push(report);

        // 控制台打印单页摘要
        const { failed, warnings } = report.summary;
        const statusIcon = failed > 0 ? '❌' : warnings > 0 ? '⚠️ ' : '✅';
        console.log(`${statusIcon} [${pageNode.url}]  (${report.duration}ms)`);

        // 逐项打印每条检查结果
        for (const item of report.items) {
          let icon: string;
          if (!item.passed && item.level === 'error') icon = '  ❌';
          else if (item.level === 'warning') icon = '  ⚠️ ';
          else icon = '  ✅';
          console.log(`${icon} [${item.name}] ${item.message}`);
          if (item.detail && item.level !== 'info') {
            console.log(`       ${item.detail.split('\n').slice(0, 3).join('\n       ')}`);
          }
        }

        // expect.soft：所有页面都跑完后统一标记失败
        for (const item of report.items) {
          if (!item.passed && item.level === 'error') {
            expect.soft(
              false,
              `[${pageNode.url}] [${item.name}] ${item.message}` +
              (item.detail ? `\n${item.detail}` : '')
            ).toBe(true);
          }
        }
      });
    }

    // ── 汇总报告 ────────────────────────────────────────────────
    const totalFailed  = allReports.reduce((s, r) => s + r.summary.failed, 0);
    const totalWarning = allReports.reduce((s, r) => s + r.summary.warnings, 0);
    const failedPages  = allReports.filter(r => r.summary.failed > 0);
    const cleanPages   = allReports.filter(r => r.summary.failed === 0 && r.summary.warnings === 0);

    const depth1Pages = pages.filter(p => p.depth === 1);
    const depth2Pages = pages.filter(p => p.depth === 2);

    console.log('\n' + '═'.repeat(60));

    // 扫描页面列表
    console.log(`\n📋 扫描页面列表（共 ${pages.length} 个）`);
    console.log('─'.repeat(60));

    if (depth1Pages.length > 0) {
      console.log(`\n  一级页面（${depth1Pages.length} 个，来自 pages.config.ts）：`);
      depth1Pages.forEach(p => console.log(`    • ${p.url}`));
    }

    if (depth2Pages.length > 0) {
      console.log(`\n  二级页面（${depth2Pages.length} 个，自动发现）：`);
      depth2Pages.forEach(p => console.log(`    • ${p.url}  ← 来自 ${p.parentUrl}`));
    }

    // 检查结果统计
    console.log('\n' + '─'.repeat(60));
    console.log(`\n📊 检查结果统计`);
    console.log('─'.repeat(60));
    console.log(`  检查完成：共 ${allReports.length} 个页面`);
    console.log(`  ✅ 完全通过：${cleanPages.length} 个`);
    console.log(`  ❌ 存在失败：${failedPages.length} 个（共 ${totalFailed} 项失败）`);
    console.log(`  ⚠️  存在警告：${totalWarning} 项`);

    if (failedPages.length > 0) {
      console.log('\n  失败页面列表：');
      failedPages.forEach(r => {
        console.log(`    ❌ ${r.url}（${r.summary.failed} 项失败）`);
      });
    }

    console.log('\n' + '═'.repeat(60) + '\n');
  });
});
