# AsterDEX 期货合约交易

## Application Overview

AsterDEX 期货合约交易页面的综合交易流程测试，包括限价开多、市价开多、取消限价委托、市价平仓。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage），导航至 EXCHANGE_URL，使用 networkidle 等待策略。

## Test Scenarios

### 1. AsterDEX - 期货合约交易

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. BTC/USDT 限价开多 0.001 BTC

**File:** `tests/cases/futures-order.spec.ts`

**Steps:**
  1. 导航至 EXCHANGE_URL，等待 networkidle 后再等待 1.5 秒
     - expect: 页面正常加载
  2. 选择限价单，读取标记价格，计算限价 = floor(markPrice - 1000)
     - expect: 标记价格元素可见
  3. 填入限价和数量（0.001 BTC），点击买入/做多，处理确认弹窗
     - expect: 确认弹窗被关闭
  4. 切换到当前委托 Tab，验证 BTCUSDT 订单出现
     - expect: BTCUSDT 文本可见（等待最长 1.5 秒）

#### 1.2. BTC/USDT 市价开多

**File:** `tests/cases/futures-order.spec.ts`

**Steps:**
  1. 选择市价单，输入数量 0.001 BTC
     - expect: 市价单模式激活，数量输入框可编辑
  2. 点击开多（第一个 submit 按钮），处理确认弹窗
     - expect: 确认弹窗被关闭
  3. 切换到仓位 Tab，验证 BTCUSDT 仓位出现
     - expect: BTCUSDT 文本在仓位列表中可见（最长等待 10 秒）

#### 1.3. 取消第一个限价委托订单

**File:** `tests/cases/futures-order.spec.ts`

**Steps:**
  1. 切换到当前委托 Tab，记录取消前委托数量（Tab 标题括号内数字）
     - expect: 当前委托 Tab 激活
  2. 点击第一个取消按钮，若无订单则跳过
     - expect: 取消按钮可见
  3. 确认取消弹窗，轮询等待委托数量减少（最长 15 秒）
     - expect: 委托数量小于取消前的数量

#### 1.4. 市价平仓第一个持仓

**File:** `tests/cases/futures-order.spec.ts`

**Steps:**
  1. 切换到仓位 Tab，记录平仓前仓位数量
     - expect: 仓位数量 > 0；若为 0 则跳过
  2. 点击仓位行的市价平仓按钮，确认平仓弹窗
     - expect: 平仓按钮可见，确认弹窗被关闭
  3. 轮询等待仓位数量减少（最长 15 秒）
     - expect: 仓位数量小于平仓前的数量