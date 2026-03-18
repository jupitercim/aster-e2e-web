# AsterDEX More Resources 页面 & Market Data 市场数据

## Application Overview

两个测试套件：(1) AsterDEX 顶部导航「更多」下拉菜单资源区域的综合测试（导航入口、内容项、帮助/文档链接、公告/博客入口、API 文档、社交媒体链接、链接有效性、Escape/点击空白关闭菜单、非首页场景、菜单项数量）；(2) Market Data 市场数据页面（Real-Time Funding Rate / Funding Rate History / Index / Funding Fee Comparison）的数据完整性测试。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - More Resources 页面

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. More Resources 导航入口可见并可交互

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 导航至 /zh-CN，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空，无 404/500 错误页
  2. hover「更多/More」按钮，等待 800ms
     - expect: 找到导航入口并 hover；若未找到则截图记录

#### 1.2. 验证资源下拉菜单内容项正常显示

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. hover 打开「更多」下拉，查找内容项（文档/Docs/帮助/Help/API/Blog/公告/Discord/Twitter 等关键词）
     - expect: 找到至少一个资源内容项；若未找到记录警告
  2. 验证页面无 404 错误
     - expect: 无 404

#### 1.3. 点击帮助或文档链接

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 导航至 /zh-CN，hover 打开下拉，查找帮助中心/Help Center/文档/Docs 等链接
     - expect: 找到链接；若未找到则跳过
  2. 点击链接（处理新标签页或当前页跳转）
     - expect: 新标签页 URL 不为空且不为 about:blank；或当前页成功跳转

#### 1.4. 验证公告或博客入口可用

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 导航至 /zh-CN，hover 打开下拉，查找公告/Announcement/Blog/博客/News 等链接
     - expect: 找到公告/博客入口；若未找到记录警告
  2. 点击链接（处理新标签页或当前页跳转）
     - expect: 跳转成功（或记录）

#### 1.5. 验证 API 文档入口可用

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 导航至 /zh-CN，hover 打开下拉，查找 API/API Docs/API 文档/开发者文档 等链接
     - expect: 找到 API 入口；若未找到记录警告
  2. 验证 href 非空，点击链接（处理新标签页）
     - expect: 新标签页 URL 不为 about:blank；或当前页成功跳转

#### 1.6. 验证社交媒体链接可用

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 导航至 /zh-CN，hover 打开下拉，查找 Twitter/X/Discord/Telegram/Medium/Reddit/YouTube 链接
     - expect: 找到的社交链接 href 非空（或记录找到 0 个）

#### 1.7. 验证菜单中所有链接均有有效 href

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 导航至 /zh-CN，hover 打开下拉，通过多种选择器收集可见 `<a>` 链接
     - expect: 找到至少 1 个链接；若未找到则跳过
  2. 验证每个链接 href 非空且非 `#`
     - expect: 无效 href 数量记录到控制台

#### 1.8. 验证资源链接点击后不出现错误页

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 导航至 /zh-CN，hover 打开下拉，收集最多 3 个内部链接（相对路径）
     - expect: 找到内部链接；若未找到则跳过
  2. 逐个新建标签页访问内部链接，验证无 404/500 错误页
     - expect: 每个链接无 404/500（soft 断言）

#### 1.9. 在行情页面下 More Resources 菜单仍可展开

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 依次尝试跳转到行情页/合约页/现货页/交易页，取第一个非 404 的页面
     - expect: 成功跳转到某个非首页；若全部失败则回退到首页
  2. hover 打开资源菜单，验证至少一个资源内容项可见
     - expect: 菜单可在非首页展开并显示内容（或记录警告）

#### 1.10. Escape 键可关闭 More Resources 下拉菜单

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 导航至 /zh-CN，hover 打开下拉，验证菜单已展开（找到至少一个内容项）
     - expect: 菜单展开；若未展开则跳过
  2. 按 Escape 键，等待 600ms，验证菜单内容项已消失
     - expect: 菜单收起（或记录部分实现不支持键盘关闭）

#### 1.11. 点击空白区域可关闭下拉菜单

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 导航至 /zh-CN，hover 打开下拉，验证菜单已展开
     - expect: 菜单展开；若未展开则跳过
  2. 点击页面中央空白区域，等待 600ms，验证菜单内容项已消失
     - expect: 菜单收起（或记录 hover 模式菜单可能不支持）

#### 1.12. 验证 More Resources 菜单项数量合理

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 导航至 /zh-CN，hover 打开下拉，统计所有可见资源关键词数量
     - expect: 数量记录到控制台（无强断言）

### 2. AsterDEX - Market Data 市场数据

**Seed:** `tests/cases/seed.spec.ts`

#### 2.1. [Funding Rate] 页面加载、列头与数据行验证

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 导航至 /en/futures/futures-info/real-time-funding-rate，等待 3 秒
     - expect: Market Data 标题（h1/h2）可见
  2. 验证四个子导航 Tab 均可见（Real-Time Funding Rate/Funding Rate History/Index/Funding Fee Comparison）
     - expect: Tab 可见（或记录警告）
  3. 验证表格列头（Contracts/Interval/Time to Next Funding/Funding Rate/Interest Rate/Funding Cap/Floor）
     - expect: 每个列头可见（soft 断言）
  4. 验证数据行含 Perpetual 关键词
     - expect: Perpetual 可见
  5. 验证 Cap/Floor 格式（x.xx% / -x.xx%）和 Interval 值（8h/4h/1h）
     - expect: Cap/Floor 格式正确（记录），Interval 可见（soft 断言）

#### 2.2. [Funding History] BTCUSDT 选择器、时间范围、表格数据行验证

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 导航至 /en/futures/futures-info/funding-rate-history，等待 3 秒，验证 Market Data 标题
     - expect: 标题可见
  2. 验证 BTCUSDT 下拉选择器可见
     - expect: BTCUSDT 选择器可见
  3. 验证 Last 7 days / Last 14 days 切换按钮可见
     - expect: 两个按钮均可见（soft 断言）
  4. 验证表格列头（Time/Contracts/Funding Interval/Funding Rate/Mark Price）
     - expect: 列头可见（或记录）
  5. 提取时间戳格式数据和 BTCUSDTPerpetual 数据行，切换 Last 14 days
     - expect: BTCUSDTPerpetual 可见（或记录）

#### 2.3. [Index] Premium Index 下拉、BTCUSDT 选择器、K线时间轴验证

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 导航至 /en/futures/futures-info/index，等待 3 秒，验证 Market Data 标题
     - expect: 标题可见
  2. 验证 Premium Index 下拉可见
     - expect: Premium Index 下拉可见
  3. 验证 BTCUSDT 选择器可见
     - expect: BTCUSDT 选择器可见
  4. 统计 K 线时间轴按钮可见数量（1m/5m/15m/1H/4H/1D/1W）
     - expect: 可见时间轴按钮数量记录到控制台
  5. 验证 Technical Indicators 按钮可见，图表区域存在（canvas/tv-chart/chart）
     - expect: Technical Indicators 可见（soft 断言）

#### 2.4. [Fee Comparison] 列头、BTCUSDT 数据行、All/Favorite Tab、搜索、分页验证

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 导航至 /en/futures/futures-info/funding-fee-comparison，等待 3 秒，验证 Market Data 标题
     - expect: 标题可见
  2. 验证 All/Favorite Tab 可见，Search Symbol 搜索框可见
     - expect: 搜索框可见（必须断言）
  3. 验证 8h 区间下拉和表格列头（Pair/Aster Daily Volume/Aster/Binance/ByBit/OKX）
     - expect: 列头可见（或记录）
  4. 验证 BTCUSDT/ETHUSDT/SOLUSDT 数据行可见
     - expect: 各交易对行可见（或记录）
  5. 在搜索框输入 BTC，验证 BTCUSDT 行仍可见，清空搜索框
     - expect: 搜索后 BTCUSDT 可见

#### 2.5. [Market Data] 四个子页面均无 404 / 500 错误

**File:** `tests/cases/more-resources.spec.ts`

**Steps:**
  1. 依次访问四个 Market Data 子页面（Real-Time Funding Rate/Funding Rate History/Index/Funding Fee Comparison）
     - expect: 每个页面无 404 错误（soft 断言）
  2. 验证每个页面无 500 错误
     - expect: 每个页面无 500 错误（soft 断言）