import { Page } from '@playwright/test';

export interface PageNode {
  url: string;
  depth: number;
  parentUrl: string;
  title: string;
}

// 匹配交易对路径末尾：BTC-USDT / BTCUSDT / 2TESTUSDT / 4USDT 等（允许数字开头）
const TRADING_PAIR_RE = /\/([A-Z0-9]{2,12}[-_]?[A-Z0-9]{2,12})$/i;

export class PageDiscovery {
  private visited = new Set<string>();
  private readonly baseOrigin: string;

  constructor(private readonly startUrl: string) {
    this.baseOrigin = new URL(startUrl).origin;
  }

  // 参数化入口：接收用户提供的一级页面完整 URL 列表
  // 对每个一级页面爬取二级页面，返回 [一级 + 二级] PageNode[]
  async discoverFromLevel1List(page: Page, level1Urls: string[]): Promise<PageNode[]> {
    this.visited.clear();
    // 预注册所有一级 URL，防止被爬取阶段误分类为二级页面
    for (const url of level1Urls) {
      this.visited.add(this.normalizePath(url));
    }
    const results: PageNode[] = [];

    for (const url of level1Urls) {
      // 一级页面直接处理，不做 visited 去重（visited 仅用于防止二级发现重复）

      // 访问一级页面，提取标题和链接
      const { title, links } = await this.visitAndExtract(page, url);
      results.push({ url, depth: 1, parentUrl: '', title });
      console.log(`[discovery]   一级: ${url}`);

      // 从一级页面发现二级页面
      for (const link of links) {
        if (!this.shouldInclude(link)) continue;
        this.visited.add(this.normalizePath(link));
        const title2 = await this.getTitle(page, link);
        results.push({ url: link, depth: 2, parentUrl: url, title: title2 });
        console.log(`[discovery]     二级: ${link}`);
      }
    }

    return results;
  }

  // 访问页面，返回 title 和页面内所有链接
  // 若首次提取到的同域链接数为 0，等待更长时间后自动重试一次（应对 React SPA 慢渲染）
  private async visitAndExtract(page: Page, url: string): Promise<{ title: string; links: string[] }> {
    const extract = async (): Promise<{ title: string; links: string[] }> => {
      const title = await page.title();
      const hrefs: string[] = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map(a => (a as HTMLAnchorElement).href)
          .filter(Boolean)
      );
      return { title, links: [...new Set(hrefs)] };
    };

    try {
      // 优先用 networkidle，超时则降级到 domcontentloaded
      // （交易所页面有持续轮询，可能永远无法到达 networkidle）
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      } catch {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        // domcontentloaded 后额外等待 React 渲染
        await page.waitForTimeout(3000);
      }

      // 等待导航区至少出现 2 个同域 <a> 链接，最长等 5 秒
      await page.waitForFunction(
        (origin) => {
          const links = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
          return links.filter(a => a.href.startsWith(origin)).length >= 2;
        },
        this.baseOrigin,
        { timeout: 5000 }
      ).catch(() => { /* 超时则继续 */ });

      const result = await extract();
      const sameDomainCount = result.links.filter(l => this.isSameDomain(l)).length;
      if (sameDomainCount < 2) {
        console.warn(`[discovery] ⚠️  ${url} 同域链接仅 ${sameDomainCount} 个，可能站点降级`);
      }
      return result;
    } catch {
      return { title: '', links: [] };
    }
  }

  // 只获取 title（二级页面不需要等待完整加载）
  private async getTitle(page: Page, url: string): Promise<string> {
    try {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      } catch {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1000);
      }
      return await page.title();
    } catch {
      return '';
    }
  }

  // pathname 去重 key（忽略 query/hash，统一去掉尾部斜杠）
  private normalizePath(url: string): string {
    try {
      return new URL(url).pathname.replace(/\/$/, '') || '/';
    } catch {
      return url;
    }
  }

  private isSameDomain(url: string): boolean {
    try {
      return new URL(url).origin === this.baseOrigin;
    } catch {
      return false;
    }
  }

  private isPureHash(url: string): boolean {
    try {
      const u = new URL(url);
      const start = new URL(this.startUrl);
      return u.hash !== '' && u.pathname === start.pathname;
    } catch {
      return false;
    }
  }

  private isDownloadFile(url: string): boolean {
    return /\.(pdf|zip|png|jpg|jpeg|gif|svg|ico|mp4|mp3|docx?)(\?.*)?$/i.test(url);
  }

  private isApiPath(url: string): boolean {
    try {
      return new URL(url).pathname.startsWith('/api/');
    } catch {
      return false;
    }
  }

  // 判断是否是交易对路径（如 /trade/ETH-USDT、/futures/ETHUSDT）
  private isTradingPairPath(url: string): boolean {
    try {
      return TRADING_PAIR_RE.test(new URL(url).pathname);
    } catch {
      return false;
    }
  }

  private shouldInclude(url: string): boolean {
    if (!this.isSameDomain(url)) return false;
    if (this.isPureHash(url)) return false;
    if (this.isDownloadFile(url)) return false;
    if (this.isApiPath(url)) return false;
    if (this.isInvalidPath(url)) return false;
    if (this.visited.has(this.normalizePath(url))) return false;

    // 过滤带 query string 的 URL（同路径不同参数视为重复）
    try {
      if (new URL(url).search !== '') return false;
    } catch { return false; }

    // 交易对页面：只保留 BTC
    if (this.isTradingPairPath(url)) {
      return /BTC/i.test(url);
    }

    // spot / futures 路径中末段含 6 位以上连续数字（时间戳生成的动态 symbol，如 BTC_UP_DOWN_1776332900_NUSDT），过滤掉
    if (/\/trade\/|\/futures\/|\/spot\//.test(url)) {
      const lastSeg = url.split('/').pop() || '';
      if (/\d{6,}/.test(lastSeg)) return false;
    }

    return true;
  }

  // 过滤无效路径（如 /- 、单字符路径）
  private isInvalidPath(url: string): boolean {
    try {
      const pathname = new URL(url).pathname;
      const segments = pathname.split('/').filter(Boolean);
      // 最后一段只有 1 个字符（如 /-）视为无效
      return segments.length > 0 && segments[segments.length - 1].length <= 1;
    } catch {
      return true;
    }
  }
}
