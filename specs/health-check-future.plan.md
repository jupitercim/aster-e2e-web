# AsterDEX 期货页面健康检查

## Application Overview

AsterDEX 期货合约交易页面健康检查，验证页面核心功能模块是否正常加载和显示，包括：页面基础布局、顶部行情栏（标记价格/指数价格/资金费率）、TradingView 图表、下单面板、订单簿、最近成交、底部 Tabs 面板。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage），直接导航至期货页面（EXCHANGE_URL）。

## Test Scenarios

### 1. AsterDEX - 期货页面检查

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 页面加载与基础布局

**File:** `tests/cases/health-check-future.spec.ts`

**Steps:**
  1. 导航至期货页面 EXCHANGE_URL，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面 body 文本长度大于 100，说明页面有实际内容（非白屏）
  2. 再等待 2 秒，检查是否有全屏 loading 遮罩残留
     - expect: 不应有卡住的全屏 loading 遮罩，或记录警告日志
  3. 截图保存到 test-results/future-page-check-load-{timestamp}.png
     - expect: 截图文件成功保存

#### 1.2. 顶部行情栏数据

**File:** `tests/cases/health-check-future.spec.ts`

**Steps:**
  1. 查找标记价格（多种选择器兼容），解析为浮点数
     - expect: 标记价格大于 0，或记录警告（行情栏 DOM 结构可能随版本变化）
  2. 查找指数价格（dt:has-text("指数价格")），解析为浮点数
     - expect: 指数价格大于 0，或跳过
  3. 查找资金费率（dt:has-text("资金费率")），检查是否含 % 符号
     - expect: 资金费率含 % 符号（soft 断言），或跳过
  4. 查找资金费率倒计时（HH:MM:SS 格式）
     - expect: 倒计时元素可见，或记录警告
  5. 查找 24h 涨跌幅（含 % 号）
     - expect: 24h 涨跌幅可见，或记录警告
  6. 查找 24h 成交量
     - expect: 成交量元素可见，或记录警告
  7. 截图保存到 test-results/future-page-check-ticker-{timestamp}.png
     - expect: 截图文件成功保存

#### 1.3. 图表区域

**File:** `tests/cases/health-check-future.spec.ts`

**Steps:**
  1. 等待 2 秒页面稳定，查找 TradingView iframe（宽度 > 200px，高度 > 150px）
     - expect: 找到尺寸合理的 TradingView iframe，记录其尺寸
  2. 若未找到 iframe，备用查找 canvas、[class*=chart]、[id*=chart] 等元素
     - expect: 至少通过一种方式确认图表区域存在，否则记录警告
  3. 截图保存到 test-results/future-page-check-chart-{timestamp}.png
     - expect: 截图文件成功保存

#### 1.4. 下单面板

**File:** `tests/cases/health-check-future.spec.ts`

**Steps:**
  1. 验证订单类型 Tab 按钮可见：限价、市价（button 形式）
     - expect: 限价 Tab 和 市价 Tab 均可见（soft 断言）
  2. 验证止盈止损 combobox 可见
     - expect: 止盈止损 combobox 可见，或记录警告
  3. 切到限价单，验证价格输入框（placeholder="价格"）可见
     - expect: 限价单价格输入框可见（soft 断言）
  4. 验证数量单位选择器（combobox）和数量输入框可见
     - expect: 数量单位选择器和数量输入框均可见（soft 断言）
  5. 验证至少 2 个 submit 按钮（买入/做多 和 卖出/做空）
     - expect: submit 按钮数量 >= 2（soft 断言）
  6. 切到市价单，价格输入框应不可编辑
     - expect: 市价单价格输入框不可编辑，或记录警告
  7. 切回限价单，查找只减仓选项
     - expect: 只减仓选项可见，或记录警告
  8. 查找隐藏订单选项
     - expect: 隐藏订单选项可见，或记录警告
  9. 验证杠杆倍数（含 x 的数字）可见
     - expect: 杠杆倍数可见，或记录警告
  10. 截图保存到 test-results/future-page-check-order-panel-{timestamp}.png
      - expect: 截图文件成功保存

#### 1.5. 订单簿

**File:** `tests/cases/health-check-future.spec.ts`

**Steps:**
  1. 通过 class 名（orderbook、order-book、depth 等）查找订单簿容器
     - expect: 找到订单簿容器，记录匹配的 selector；若未找到则记录警告
  2. 通过 JS 统计页面中含价格数值的短行数量（判断订单簿是否有数据行）
     - expect: 数值行数量 >= 6，或记录警告
  3. 检查卖单（红色）和买单（绿色）行数
     - expect: 卖单行数 >= 3，买单行数 >= 3，或记录警告
  4. 截图保存到 test-results/future-page-check-orderbook-{timestamp}.png
     - expect: 截图文件成功保存

#### 1.6. 最近成交

**File:** `tests/cases/health-check-future.spec.ts`

**Steps:**
  1. 查找并点击最近成交 Tab（最新成交/成交记录/Trades 等），等待 500ms
     - expect: 最近成交 Tab 被激活，记录点击的 Tab 文本
  2. 等待 1 秒后统计成交记录行数
     - expect: 成交记录行数 >= 3，或记录警告
  3. 验证第一行含有数值
     - expect: 第一行文本中包含数字
  4. 截图保存到 test-results/future-page-check-trades-{timestamp}.png
     - expect: 截图文件成功保存

#### 1.7. 底部面板 Tabs（持仓 & 委托）

**File:** `tests/cases/health-check-future.spec.ts`

**Steps:**
  1. 依次点击底部 Tab：当前持仓、当前委托、历史委托，每次等待 1 秒
     - expect: 每个 Tab 可以被点击激活
  2. 每个 Tab 激活后，验证面板内容已加载：出现表格行 或 空状态文字
     - expect: 每个 Tab 面板内容可见（有数据行或空状态提示）
  3. 验证 TWAP Tab 是否存在
     - expect: TWAP Tab 可见，或记录为可选功能
  4. 截图保存到 test-results/future-page-check-bottom-tabs-{timestamp}.png
     - expect: 截图文件成功保存

#### 1.8. 交易对下拉框与切换交易对

**File:** `tests/cases/health-check-future.spec.ts`

**Steps:**
  1. 验证交易对选择器按钮可见（显示当前交易对名称 BTCUSDT 和 永续 标签）
     - expect: 按钮可见且文本含 "BTCUSDT"
  2. 点击交易对选择器按钮，等待下拉菜单展开
     - expect: 菜单出现，含搜索框、合约/现货 Tab 和交易对列表行
  3. 在列表中找到 SOLUSDT 行并点击
     - expect: 菜单关闭，页面 URL 变为含 "SOLUSDT" 的路径
  4. 等待页面稳定后验证顶部交易对名称更新为 SOLUSDT
     - expect: 页面标题或行情栏中出现 "SOLUSDT"
  5. 导航回 EXCHANGE_URL（BTCUSDT）
     - expect: 页面恢复至 BTCUSDT 页面

#### 1.9. 充值 / 提现 / 转账 按钮与弹窗

**File:** `tests/cases/health-check-future.spec.ts`

**Steps:**
  1. 导航至 EXCHANGE_URL，等待页面加载
     - expect: 右侧账户面板中可见 充值、提现、转账 三个按钮
  2. 点击「充值」按钮，等待 dialog 弹出
     - expect: dialog 可见，标题含 "账户"；dialog 内含 充值/提现/转账 Tab 切换按钮；充值 Tab 为激活状态
  3. 验证充值弹窗内容：账户类型选择器（合约账户）、网络选择器（BNB Testnet）、金额输入框（spinbutton）、代币选择器（USDF）、余额标签可见
     - expect: 上述元素均可见（soft 断言）
  4. 在 dialog 内点击「提现」Tab
     - expect: 可提现金额 标签可见
  5. 在 dialog 内点击「转账」Tab
     - expect: 转账方向标签可见（含"从"/"到"文字，以及 永续合约/现货 账户名）
  6. 点击 dialog 关闭按钮（X）
     - expect: dialog 消失，页面恢复正常
  7. 截图保存到 test-results/future-page-check-deposit-withdraw-{timestamp}.png

#### 1.10. 全页截图

**File:** `tests/cases/health-check-future.spec.ts`

**Steps:**
  1. 滚动回页面顶部，等待 500ms
     - expect: 页面已滚动到顶部
  2. 截取全页截图（fullPage: true）保存到 test-results/future-page-check-full-{timestamp}.png
     - expect: 全页截图成功保存，文件路径已记录到日志