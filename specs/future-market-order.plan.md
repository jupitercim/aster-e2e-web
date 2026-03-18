# AsterDEX 期货市价委托

## Application Overview

AsterDEX 期货合约交易页面的市价委托功能测试，验证市价开多、市价开空、以及通过仓位 Tab 市价平仓的完整流程。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage），导航至 EXCHANGE_URL。

## Test Scenarios

### 1. AsterDEX - 期货市价委托

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 市价开多 BTC/USDT 0.001 BTC

**File:** `tests/cases/future-market-order.spec.ts`

**Steps:**
  1. 导航至 EXCHANGE_URL，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面正常加载
  2. 选择市价单，选择 BTC 单位，输入数量 0.001
     - expect: 市价单模式激活，数量输入框可编辑
  3. 点击买入/做多（第一个 submit 按钮），处理确认弹窗
     - expect: 确认弹窗被关闭
  4. 检测下单成功 Toast
     - expect: Toast 出现（或记录警告）
  5. 切换到仓位 Tab，验证 BTCUSDT 仓位出现
     - expect: BTCUSDT 文本在仓位列表中可见（最长等待 10 秒）

#### 1.2. 市价开空 BTC/USDT 0.001 BTC

**File:** `tests/cases/future-market-order.spec.ts`

**Steps:**
  1. 选择市价单，选择 BTC 单位，输入数量 0.001
     - expect: 数量输入框可编辑
  2. 点击卖出/做空（第二个 submit 按钮），处理确认弹窗
     - expect: 确认弹窗被关闭
  3. 检测下单成功 Toast
     - expect: Toast 出现（或记录警告）

#### 1.3. 市价平仓第一个持仓

**File:** `tests/cases/future-market-order.spec.ts`

**Steps:**
  1. 切换到仓位 Tab，读取平仓前仓位数量（Tab 标题括号内数字）
     - expect: 仓位数量 > 0；若为 0 则跳过
  2. 点击仓位行的市价平仓按钮，确认平仓弹窗
     - expect: 平仓按钮可见，确认弹窗被关闭
  3. 轮询等待仓位数量减少（最长 15 秒）
     - expect: 仓位数量小于平仓前的数量