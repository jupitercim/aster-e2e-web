# AsterDEX 冒烟测试

## Application Overview

覆盖期货、现货、Shield 三个交易模式的核心路径冒烟测试，包括菜单/页面关键元素检查和下单主流程验证，确保在部署或发版前快速确认主链路可用。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. 期货下单

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 期货市价开多 BTC/USDT 0.001 BTC

**File:** `tests/cases/future-market-order.spec.ts`

**Steps:**
  1. 导航至 EXCHANGE_URL，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面正常加载
  2. 选择市价单，选择 BTC 单位，输入数量 0.001
     - expect: 市价单模式激活，数量输入框可编辑
  3. 点击买入/做多按钮，处理确认弹窗
     - expect: 确认弹窗被关闭
  4. 检测下单成功 Toast（下单成功/委托成功/Order placed 等）
     - expect: Toast 出现
  5. 切换到仓位 Tab，验证 BTCUSDT 仓位出现
     - expect: BTCUSDT 文本在仓位列表中可见（最长等待 10 秒）

#### 1.2. 期货市价平仓

**File:** `tests/cases/future-market-order.spec.ts`

**Steps:**
  1. 切换到仓位 Tab，读取平仓前仓位数量
     - expect: 仓位数量 > 0；若为 0 则跳过
  2. 点击仓位行的市价平仓按钮，确认平仓弹窗
     - expect: 平仓按钮可见，确认弹窗被关闭
  3. 轮询等待仓位数量减少（最长 15 秒）
     - expect: 仓位数量小于平仓前的数量

#### 1.3. 期货限价挂单并取消

**File:** `tests/cases/future-limit-order.spec.ts`

**Steps:**
  1. 选择限价单，读取标记价格，填入限价 = floor(markPrice - 1000) 和数量 0.001 BTC
     - expect: 价格和数量输入框可编辑
  2. 点击买入/做多按钮，处理确认弹窗
     - expect: 确认弹窗被关闭
  3. 检测下单成功 Toast
     - expect: Toast 出现（或当前委托 Tab 出现订单）
  4. 切换到当前委托 Tab，点击第一个取消按钮，确认取消弹窗
     - expect: 取消成功 Toast 出现（取消成功/撤单成功/Cancelled 等）

---

### 2. 现货下单

**Seed:** `tests/cases/seed.spec.ts`

#### 2.1. 现货页面正常加载

**File:** `tests/cases/spot-order.spec.ts`

**Steps:**
  1. 导航至现货 URL（/zh-CN/trade/pro/spot/BTCUSDT），等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空且包含 BTCUSDT
  2. 验证买入/卖出按钮可见
     - expect: 买入按钮可见（soft 断言）

#### 2.2. 现货限价买入挂单并验证委托

**File:** `tests/cases/spot-order.spec.ts`

**Steps:**
  1. 选择限价单，填入价格 60000（低于市价不成交）和数量 0.003
     - expect: 价格和数量输入框可编辑
  2. 点击买入按钮，处理确认弹窗
     - expect: 确认弹窗被关闭
  3. 检测下单成功 Toast（下单成功/委托成功/Order placed 等）
     - expect: Toast 出现（或记录警告）

---

### 3. Shield 下单

**Seed:** `tests/cases/seed.spec.ts`

#### 3.1. Shield 模式页面正常加载

**File:** `tests/cases/shield-order.spec.ts`

**Steps:**
  1. 导航至 Shield URL（/zh-CN/trade/shield/futures/BTCUSDT），等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空
  2. 查找交易面板（#tour-guide-place-order / input[placeholder="数量"] 等）
     - expect: 交易面板可见

#### 3.2. Shield 模式限价买入并取消委托

**File:** `tests/cases/shield-order.spec.ts`

**Steps:**
  1. 查找并点击限价按钮
     - expect: 限价模式激活；若不可见则跳过
  2. 填入价格 60000（低于市价不成交）和数量 0.001
     - expect: 价格和数量输入框可编辑
  3. 点击提交按钮，处理确认弹窗
     - expect: 确认弹窗被关闭
  4. 检测下单成功 Toast（下单成功/委托成功/Order placed 等）
     - expect: Toast 出现（或记录警告）
  5. 切换到当前委托 Tab，点击第一个取消按钮，确认取消弹窗
     - expect: 取消成功 Toast 出现（取消成功/撤单成功/Cancelled 等）

---

### 4. 期货页面菜单检查

**Seed:** `tests/cases/seed.spec.ts`

#### 4.1. 顶部行情栏关键数据可见

**File:** `tests/cases/health-check-future.spec.ts`

**Steps:**
  1. 导航至 EXCHANGE_URL，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面无错误，body 有内容
  2. 验证标记价格（dt:has-text("标记价格")）可见且大于 0
     - expect: 标记价格可见
  3. 验证资金费率（dt:has-text("资金费率")）含 % 符号
     - expect: 资金费率可见
  4. 验证 24h 涨跌幅含 % 符号
     - expect: 24h 涨跌幅可见

#### 4.2. 下单面板菜单可见

**File:** `tests/cases/health-check-future.spec.ts`

**Steps:**
  1. 验证限价、市价 Tab 按钮可见
     - expect: 限价 Tab 和市价 Tab 均可见
  2. 验证买入/做多 和 卖出/做空 两个 submit 按钮可见
     - expect: submit 按钮数量 >= 2
  3. 验证价格输入框（placeholder="价格"）和数量输入框（placeholder="数量"）可见
     - expect: 两个输入框均可见
  4. 验证杠杆倍数（含 x 的数字）可见
     - expect: 杠杆倍数可见

#### 4.3. 底部 Tabs 面板可切换

**File:** `tests/cases/health-check-future.spec.ts`

**Steps:**
  1. 依次点击底部 Tab：当前委托、历史委托、仓位，每次等待 1 秒
     - expect: 每个 Tab 可被点击激活
  2. 每个 Tab 激活后验证内容区域可见（有数据行或空状态提示）
     - expect: 面板内容可见

#### 4.4. 订单簿与最近成交 Tab 可切换

**File:** `tests/cases/health-check-future.spec.ts`

**Steps:**
  1. 查找并点击最近成交 Tab（最新成交/成交记录/Trades 等）
     - expect: Tab 被激活，成交记录行数 >= 3（或记录警告）
  2. 验证订单簿区域可见（class 含 orderbook/order-book/depth）
     - expect: 订单簿容器可见，买卖盘各有数据行

---

### 5. 现货页面菜单检查

**Seed:** `tests/cases/seed.spec.ts`

#### 5.1. 顶部行情栏关键数据可见

**File:** `tests/cases/health-check-spot.spec.ts`

**Steps:**
  1. 导航至现货 URL（/zh-CN/trade/pro/spot/BTCUSDT），等待 domcontentloaded 后再等待 3 秒
     - expect: 页面无错误，body 有内容
  2. 验证页面顶部显示 BTC/USDT 或 现货 字样
     - expect: 交易对标识可见
  3. 验证 24h 涨跌幅含 % 符号可见
     - expect: 涨跌幅可见
  4. 验证最高价（label 含 最高）和最低价（label 含 最低）可见
     - expect: 最高价和最低价均可见

#### 5.2. 下单面板菜单可见

**File:** `tests/cases/health-check-spot.spec.ts`

**Steps:**
  1. 验证限价、市价 Tab 按钮可见
     - expect: 限价 Tab 和市价 Tab 均可见
  2. 验证买入 / 卖出切换按钮可见
     - expect: 买入 和 卖出 按钮均可见
  3. 验证价格输入框和数量输入框可见
     - expect: 两个输入框均可见
  4. 验证可用余额区域（含 可用 或 Available）可见
     - expect: 可用余额区域可见

#### 5.3. 底部 Tabs 面板可切换

**File:** `tests/cases/health-check-spot.spec.ts`

**Steps:**
  1. 依次点击底部 Tab：当前委托、历史委托，每次等待 1 秒
     - expect: 每个 Tab 可被点击激活
  2. 每个 Tab 激活后验证面板内容可见（有数据行或空状态提示）
     - expect: 面板内容可见

#### 5.4. 订单簿与最新成交 Tab 可切换

**File:** `tests/cases/health-check-spot.spec.ts`

**Steps:**
  1. 查找并点击最新成交 Tab（最新成交/Trades 等）
     - expect: Tab 被激活，成交记录行数 >= 3（或记录警告）
  2. 验证订单簿区域可见，买卖盘各有数据行
     - expect: 订单簿容器可见

---

### 6. Shield 页面菜单检查

**Seed:** `tests/cases/seed.spec.ts`

#### 6.1. 顶部行情栏关键数据可见

**File:** `tests/cases/health-check-shield.spec.ts`

**Steps:**
  1. 导航至 Shield URL（/zh-CN/trade/shield/futures/BTCUSDT），等待 domcontentloaded 后再等待 3 秒
     - expect: 页面无错误，body 有内容
  2. 验证页面顶部显示 BTC/USDT 字样
     - expect: 交易对标识可见
  3. 验证标记价格（label 含 标记价格/Mark Price）可见且大于 0
     - expect: 标记价格可见
  4. 验证资金费率（label 含 资金费率/Funding Rate）含 % 符号
     - expect: 资金费率可见

#### 6.2. 下单面板菜单可见

**File:** `tests/cases/health-check-shield.spec.ts`

**Steps:**
  1. 验证限价、市价 Tab 按钮可见
     - expect: 限价 Tab 和市价 Tab 均可见
  2. 验证开多/买入 和 开空/卖出 按钮可见
     - expect: 两个方向按钮均可见
  3. 验证价格输入框和数量输入框可见
     - expect: 两个输入框均可见

#### 6.3. 底部 Tabs 面板可切换

**File:** `tests/cases/health-check-shield.spec.ts`

**Steps:**
  1. 依次点击底部 Tab：当前委托、历史委托、仓位，每次等待 1 秒
     - expect: 每个 Tab 可被点击激活
  2. 每个 Tab 激活后验证面板内容可见（有数据行或空状态提示）
     - expect: 面板内容可见

#### 6.4. 订单簿与最新成交 Tab 可切换

**File:** `tests/cases/health-check-shield.spec.ts`

**Steps:**
  1. 查找并点击最新成交 Tab（最新成交/Trades 等）
     - expect: Tab 被激活，成交记录行数 >= 3（或记录警告）
  2. 验证订单簿区域可见，买卖盘各有数据行
     - expect: 订单簿容器可见