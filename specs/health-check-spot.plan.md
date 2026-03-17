# AsterDEX 现货页面健康检查

## Application Overview

AsterDEX 现货交易页面（BTC/USDT）健康检查，验证页面核心功能模块是否正常加载和显示，包括：页面基础布局、顶部行情栏、TradingView 图表、下单面板、订单簿、最新成交、底部 Tabs 面板。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage），直接导航至现货页面。

## Test Scenarios

### 1. AsterDEX - 现货页面检查

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 页面加载与基础布局

**File:** `tests/cases/health-check-spot.spec.ts`

**Steps:**
  1. 导航至现货页面 EXCHANGE_SPOT_URL（如 /zh-CN/trade/pro/spot/BTCUSDT），等待 domcontentloaded 后再等待 3 秒
    - expect: 页面 body 文本长度大于 100，说明页面有实际内容（非白屏）
  2. 再等待 2 秒，检查是否有全屏 loading 遮罩残留（class 含 loading 或 spinner 且未隐藏）
    - expect: 不应有卡住的全屏 loading 遮罩，或记录警告日志
  3. 截图保存到 test-results/spot-page-check-load-{timestamp}.png
    - expect: 截图文件成功保存

#### 1.2. 顶部行情栏数据

**File:** `tests/cases/health-check-spot.spec.ts`

**Steps:**
  1. 查找交易对标题，确认显示 BTC/USDT 或 现货 标识
    - expect: 页面顶部显示 BTC/USDT 或 现货 字样
  2. 查找最新成交价（大数字，红色或绿色），解析为浮点数
    - expect: 最新价格大于 0
  3. 查找 24h 涨跌幅（含 % 符号，可正可负）
    - expect: 24h 涨跌幅元素可见，文本含 % 符号
  4. 查找最高价（label 含 最高）和最低价（label 含 最低）
    - expect: 最高价和最低价均可见且大于 0
  5. 查找 24h 成交量（label 含 24小时成交量 或 成交量）
    - expect: 24h 成交量元素可见
  6. 截图保存到 test-results/spot-page-check-ticker-{timestamp}.png
    - expect: 截图文件成功保存

#### 1.3. 图表区域

**File:** `tests/cases/health-check-spot.spec.ts`

**Steps:**
  1. 等待 2 秒页面稳定，查找 TradingView iframe（宽度 > 200px，高度 > 150px）
    - expect: 找到尺寸合理的 TradingView iframe，记录其尺寸
  2. 若未找到 iframe，备用查找 canvas、[class*=chart]、[id*=chart] 等元素
    - expect: 至少通过一种方式确认图表区域存在，否则记录警告
  3. 验证图表工具栏时间周期按钮可见（如 1H、1D 等）
    - expect: 至少一个时间周期按钮可见
  4. 截图保存到 test-results/spot-page-check-chart-{timestamp}.png
    - expect: 截图文件成功保存

#### 1.4. 下单面板

**File:** `tests/cases/health-check-spot.spec.ts`

**Steps:**
  1. 验证订单类型 Tab 按钮可见：市价、限价、限价止盈止损（或其中至少两个）
    - expect: 市价 Tab 和 限价 Tab 均可见
  2. 验证买入 / 卖出 切换按钮可见
    - expect: 买入 和 卖出 按钮均可见
  3. 切到限价单，验证价格输入框（placeholder 含 价格 或 Price）可见
    - expect: 限价单价格输入框可见且可编辑
  4. 验证数量输入框（placeholder 含 数量 或 Amount）可见，以及数量单位选择器（USDT/BTC combobox）
    - expect: 数量输入框可见，单位选择器可见
  5. 切到市价单，价格输入框应显示 市场价格 占位文字或禁用状态
    - expect: 市价单价格输入框不可编辑或显示市场价格占位符
  6. 验证可用余额区域（含 可用 或 Available 文字）可见
    - expect: 可用余额区域可见
  7. 验证最大金额和预估费用标签可见
    - expect: 最大 和 预估费用 标签可见
  8. 截图保存到 test-results/spot-page-check-order-panel-{timestamp}.png
    - expect: 截图文件成功保存

#### 1.5. 订单簿

**File:** `tests/cases/health-check-spot.spec.ts`

**Steps:**
  1. 点击 订单簿 Tab（若当前不在该 Tab），等待 500ms
    - expect: 订单簿 Tab 被激活
  2. 通过 class 名（orderbook、order-book、depth 等）查找订单簿容器
    - expect: 找到订单簿容器，记录匹配的 selector；若未找到则记录警告
  3. 通过 JS 统计页面中含价格数值的短行数量（判断订单簿是否有数据行）
    - expect: 数值行数量 >= 6，或记录警告
  4. 检查卖单（红色，class 含 sell/red/ask）和买单（绿色，class 含 buy/green/bid）行数
    - expect: 卖单行数 >= 3，买单行数 >= 3，或记录警告
  5. 验证订单簿表头显示价格(USDT)、数量(USDT)、总额(USDT) 列标题
    - expect: 价格列标题可见
  6. 截图保存到 test-results/spot-page-check-orderbook-{timestamp}.png
    - expect: 截图文件成功保存

#### 1.6. 最新成交

**File:** `tests/cases/health-check-spot.spec.ts`

**Steps:**
  1. 点击 最新成交 Tab（文本含 最新成交 或 Trades），等待 500ms
    - expect: 最新成交 Tab 被激活，记录点击的 Tab 文本
  2. 等待 1 秒后统计成交记录行数（tr、[role=row]、li 等）
    - expect: 成交记录行数 >= 3，或记录警告
  3. 验证第一行含有数值（价格数字）
    - expect: 第一行文本中包含数字
  4. 截图保存到 test-results/spot-page-check-trades-{timestamp}.png
    - expect: 截图文件成功保存

#### 1.7. 底部面板 Tabs

**File:** `tests/cases/health-check-spot.spec.ts`

**Steps:**
  1. 依次点击底部 Tab：当前委托、仓位、资产、历史委托，每次等待 1 秒
    - expect: 每个 Tab 可以被点击激活
  2. 每个 Tab 激活后，验证面板内容已加载：出现表格行 或 空状态文字（暂无数据/No Data）
    - expect: 每个 Tab 面板内容可见（有数据行或空状态提示）
  3. 验证 TWAP Tab 是否存在
    - expect: TWAP Tab 可见，或记录为可选功能
  4. 截图保存到 test-results/spot-page-check-bottom-tabs-{timestamp}.png
    - expect: 截图文件成功保存

#### 1.8. 全页截图

**File:** `tests/cases/health-check-spot.spec.ts`

**Steps:**
  1. 滚动回页面顶部，等待 500ms
    - expect: 页面已滚动到顶部
  2. 截取全页截图（fullPage: true）保存到 test-results/spot-page-check-full-{timestamp}.png
    - expect: 全页截图成功保存，文件路径已记录到日志
