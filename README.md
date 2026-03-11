# UI Automation Test

基于 **Playwright + TypeScript** 的加密货币交易所（AsterDEX）前端自动化测试项目。
使用 Playwright 原生定位器驱动浏览器操作，集成 MetaMask 钱包自动连接与签名。

## 项目结构

```
ui-automation-test/
├── .env                              # 环境变量（钱包助记词、交易所地址）
├── .gitignore
├── playwright.config.ts              # Playwright 全局配置
├── tsconfig.json                     # TypeScript 配置
├── package.json
├── scripts/
│   └── download-metamask.sh          # MetaMask 扩展下载脚本
├── extensions/
│   └── metamask/                     # MetaMask 扩展（自动下载，已 gitignore）
└── tests/
    ├── fixtures/
    │   └── auth.ts                   # MetaMask 初始化 + 钱包连接 fixture
    └── cases/
        ├── spot-order.spec.ts        # 现货交易用例
        └── futures-order.spec.ts     # 期货合约用例
```

## 前置条件

- **Node.js** >= 18
- **npm** >= 9
- 可访问目标交易所的网络环境

## 快速开始

### 1. 安装依赖

```bash
npm install
npx playwright install chromium
```

### 2. 下载 MetaMask 扩展

```bash
# 默认下载 v12.8.1，也可指定版本
npm run setup:metamask

# 指定版本
bash scripts/download-metamask.sh 12.8.1
```

扩展会自动下载到 `extensions/metamask/` 目录。

### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
# 交易所地址
EXCHANGE_URL=https://your-exchange.com

# MetaMask 测试钱包助记词（仅限测试网！）
TEST_SEED_PHRASE=word1 word2 word3 ... word12

# MetaMask 密码（可选，默认 Test1234!）
METAMASK_PASSWORD=Test1234!
```

### 4. 运行测试

```bash
# 运行所有用例
npm test

# 仅运行现货交易用例
npm run test:spot

# 仅运行期货合约用例
npm run test:futures

# 调试模式（逐步执行）
npm run test:debug

# 查看 HTML 测试报告
npm run report
```

## 测试用例说明

### 现货交易 (`spot-order.spec.ts`)

| 用例 | 描述 |
|------|------|
| BTC/USDT 限价买入 | 以 60000 USDT 限价买入 0.003 BTC，验证委托单 |
| 市价买入 200 USDT 的 BTC | 市价下单 200 USDT，验证成交记录 |

### 期货合约 (`futures-order.spec.ts`)

用例按顺序串行执行（`test.describe.serial`）：

| 用例 | 描述 |
|------|------|
| BTC/USDT 限价开多 0.01 BTC | 以 65000 限价开多，验证当前委托 |
| BTC/USDT 市价开多 | 市价开多 0.01 BTC，验证仓位 |
| 取消第一个限价委托订单 | 取消委托，验证委托数量减少 |
| 市价平仓第一个持仓 | 市价平仓，验证仓位数量减少 |

## 登录流程

项目通过 `tests/fixtures/auth.ts` 自动完成以下流程（每个 worker 执行一次）：

1. **MetaMask 初始化** — 启动带 MetaMask 扩展的 Chromium，导入助记词并设置密码
2. **连接钱包** — 在交易所页面点击「连接钱包」→ 选择 MetaMask → 授权连接
3. **MetaMask 签名** — 自动处理 MetaMask 弹窗中的签名确认（兼容多版本 data-testid）
4. **启用交易** — 如需要，自动完成「启用交易」及后续签名

## 元素定位策略

项目使用 Playwright 原生定位器，**不依赖任何 AI/LLM 服务**，零 token 消耗：

```ts
// 按角色定位（推荐）
page.getByRole('button', { name: /买入|Buy/i })
page.getByRole('tab', { name: '当前委托' })

// 按文本定位
page.getByText('限价', { exact: true })

// 按 placeholder 定位
page.locator('input[placeholder="价格"]')

// 按 data-testid 定位（最稳定）
page.locator('[data-testid="price-input"]')

// 组合定位（处理弹窗）
page.locator('button:text("取消")').locator('..').locator('button').last()
```

如需获取页面元素的选择器，可使用 Playwright 录制工具：

```bash
npx playwright codegen https://your-exchange.com
```

## 配置说明

`playwright.config.ts` 关键配置：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| timeout | 120s | 单个测试超时时间 |
| headless | false | 必须有头模式（MetaMask 扩展需要） |
| viewport | 1440×900 | 浏览器窗口大小 |
| screenshot | on | 每个测试自动截图 |
| trace | on-first-retry | 首次重试时录制 trace |
| retries | 0 | 不自动重试 |

## 注意事项

- ⚠️ **测试钱包仅限测试网使用，切勿使用主网钱包或真实资产**
- `.env` 文件已被 `.gitignore` 忽略，不会提交到仓库
- MetaMask 扩展目录 `extensions/metamask/` 已被 `.gitignore` 忽略
- 测试必须以 **有头模式**（`headless: false`）运行，因为 Chrome 扩展不支持无头模式
- 期货合约用例为串行执行，请确保测试顺序：开仓 → 验证 → 取消 → 平仓
