import { Page } from '@playwright/test';

export interface VisualCheckItem {
  name: string;
  passed: boolean;
  level: 'error' | 'warning' | 'info';
  message: string;
  detail?: string;
}

export interface VisualCheckReport {
  url: string;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  items: VisualCheckItem[];
}

export class VisualChecker {

  // ── 检查一：页面正常展示 ─────────────────────────────────────
  async checkPageDisplay(page: Page): Promise<VisualCheckItem[]> {
    const items: VisualCheckItem[] = [];

    // 1. 页面内容是否为空
    const textLength: number = await page.evaluate(() => document.body.innerText.trim().length);
    if (textLength < 100) {
      items.push({
        name: '页面内容',
        level: 'error',
        passed: false,
        message: `页面内容过少（${textLength} 字符），可能是空白页或加载失败`,
      });
    } else {
      items.push({ name: '页面内容', level: 'info', passed: true, message: `页面有内容（${textLength} 字符）` });
    }

    // 2. 是否卡在全屏 loading
    const stuckLoading: boolean = await page.evaluate(() => {
      const loadingEls = Array.from(
        document.querySelectorAll('[class*="loading"],[class*="skeleton"],[class*="spinner"],.ant-spin')
      ) as HTMLElement[];
      return loadingEls.some(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8;
      });
    });
    if (stuckLoading) {
      items.push({ name: '全屏Loading', level: 'error', passed: false, message: '检测到全屏 loading 遮罩未消失，页面可能卡住' });
    } else {
      items.push({ name: '全屏Loading', level: 'info', passed: true, message: '无全屏 loading 遮罩' });
    }

    // 3. 破损图片（viewport 内）
    const brokenInViewport: string[] = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .filter(img => {
          const rect = img.getBoundingClientRect();
          const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
          return inViewport && img.complete && img.naturalWidth === 0 && !!img.src;
        })
        .map(img => img.src);
    });
    if (brokenInViewport.length > 0) {
      items.push({
        name: '视口图片',
        level: 'error',
        passed: false,
        message: `视口内发现 ${brokenInViewport.length} 张破损图片`,
        detail: brokenInViewport.join('\n'),
      });
    } else {
      items.push({ name: '视口图片', level: 'info', passed: true, message: '视口内图片加载正常' });
    }

    // 4. SVG 图标可见性（取前20个 svg use 元素，检查是否有宽高）
    const brokenIcons: number = await page.evaluate(() => {
      const svgUses = Array.from(document.querySelectorAll('svg use')).slice(0, 20);
      return svgUses.filter(el => {
        const rect = (el.closest('svg') as SVGElement)?.getBoundingClientRect();
        return rect && rect.width === 0 && rect.height === 0;
      }).length;
    });
    if (brokenIcons > 0) {
      items.push({
        name: 'SVG图标',
        level: 'warning',
        passed: true,
        message: `发现 ${brokenIcons} 个 SVG 图标宽高为0（可能未正常渲染）`,
      });
    }

    return items;
  }

  // ── 检查二：滚动加载 ─────────────────────────────────────────
  async checkScrollLoading(page: Page): Promise<VisualCheckItem[]> {
    const items: VisualCheckItem[] = [];

    // 记录滚动前破损图片数
    const brokenBefore = await this.countBrokenImages(page);

    // 分段向下滚动到底部
    const pageHeight: number = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight: number = await page.evaluate(() => window.innerHeight);
    const steps = Math.ceil(pageHeight / viewportHeight);
    let maxBrokenDuringScroll = brokenBefore;

    for (let i = 1; i <= steps; i++) {
      await page.evaluate((pos) => window.scrollTo({ top: pos, behavior: 'instant' }), i * viewportHeight);
      await page.waitForTimeout(400);
      const broken = await this.countBrokenImages(page);
      if (broken > maxBrokenDuringScroll) maxBrokenDuringScroll = broken;
    }

    // 滚回顶部
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(400);

    // 检查滚回顶部后是否出现全屏 loading
    const stuckAfterScrollBack: boolean = await page.evaluate(() => {
      const loadingEls = Array.from(
        document.querySelectorAll('[class*="loading"],[class*="skeleton"],[class*="spinner"],.ant-spin')
      ) as HTMLElement[];
      return loadingEls.some(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8;
      });
    });

    if (maxBrokenDuringScroll > brokenBefore) {
      items.push({
        name: '滚动图片',
        level: 'error',
        passed: false,
        message: `滚动过程中出现新的破损图片（滚动前: ${brokenBefore}，最多: ${maxBrokenDuringScroll}）`,
      });
    } else {
      items.push({ name: '滚动图片', level: 'info', passed: true, message: `滚动过程中无新增破损图片（共 ${steps} 步）` });
    }

    if (stuckAfterScrollBack) {
      items.push({ name: '滚回顶部', level: 'warning', passed: true, message: '滚回顶部后检测到全屏 loading，可能存在虚拟列表回收问题' });
    } else {
      items.push({ name: '滚回顶部', level: 'info', passed: true, message: '滚回顶部后页面正常' });
    }

    return items;
  }

  async run(page: Page): Promise<VisualCheckReport> {
    const startTime = Date.now();
    const url = page.url();
    const items: VisualCheckItem[] = [];

    // 等待页面完整加载后再开始检查
    await page.waitForTimeout(2000);

    items.push(...await this.checkPageDisplay(page));
    items.push(...await this.checkScrollLoading(page));

    const failed = items.filter(i => !i.passed && i.level === 'error').length;
    const warnings = items.filter(i => i.level === 'warning').length;
    const passed = items.filter(i => i.passed).length;

    return {
      url,
      duration: Date.now() - startTime,
      summary: { total: items.length, passed, failed, warnings },
      items,
    };
  }

  private async countBrokenImages(page: Page): Promise<number> {
    return page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .filter(img => img.complete && img.naturalWidth === 0 && !!img.src)
        .length
    );
  }
}
