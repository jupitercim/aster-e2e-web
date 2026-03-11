/**
 * 一级页面路径配置
 *
 * 填写相对路径（以 / 开头），域名会自动从 .env 的 EXCHANGE_URL 读取。
 * 系统会自动从每个一级页面爬取二级页面，一起纳入静态检查。
 *
 * 新增页面：直接在列表末尾追加路径即可，无需修改其他代码。
 */
export const LEVEL1_PAGES: string[] = [

  '/zh-CN/trade/pro/futures/BTCUSDT',
  '/zh-CN/trade/pro/spot/BTCUSDT',
  '/zh-CN/trade/shield/futures/BTCUSDT',
  '/zh-CN/portfolio/pro',
  '/zh-CN/referral',
  '/zh-CN/rocket-launch',
  '/zh-CN/trade-and-earn',
  '/zh-CN/stage6/statistics',
  '/zh-CN/airdrop',
  '/zh-CN/apx-upgrade',
  '/zh-CN/usdf',
  '/zh-CN/earn',
  '/zh-CN/trade/1001x/futures/BTCUSD',
  '/zh-CN/api-management',
  '/zh-CN/trading-leaderboard',
  '/zh-CN/aster-code',
  '/zh-CN/futures/futures-info/real-time-funding-rate',
  '/zh-CN/futures/trading-rules/leverage-and-margin',
  '/zh-CN/announcement'
];
