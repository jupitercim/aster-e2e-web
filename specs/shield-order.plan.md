# AsterDEX Shield 模式交易

## Application Overview

AsterDEX Shield 模式交易页面（/zh-CN/trade/shield/futures/BTCUSDT）的功能测试，验证 Shield 页面加载、限价买入下单、取消委托单的完整流程。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - Shield 模式交易

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. Shield 模式页面可正常加载

**File:** `tests/cases/shield-order.spec.ts`

**Steps:**
  1. 导航至 Shield URL（/zh-CN/trade/shield/futures/BTCUSDT），等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空
  2. 查找交易面板（#tour-guide-place-order / input[placeholder="数量"] 等）
     - expect: 交易面板可见，或记录警告（URL 可能需要确认）

#### 1.2. Shield 模式限价买入 0.001 BTC

**File:** `tests/cases/shield-order.spec.ts`

**Steps:**
  1. 查找并点击限价按钮（若不可见则跳过）
     - expect: 限价模式激活
  2. 填入价格 60000（低于市价不成交）和数量 0.001
     - expect: 价格和数量输入框可编辑
  3. 点击第一个 submit 按钮，处理确认弹窗
     - expect: 确认弹窗被关闭
  4. 检测下单成功 Toast
     - expect: Toast 出现（或记录警告）
  5. 切换到当前委托 Tab（尝试多种 Tab 文案）
     - expect: 当前委托 Tab 激活

#### 1.3. 取消 Shield 委托单

**File:** `tests/cases/shield-order.spec.ts`

**Steps:**
  1. 切换到当前委托 Tab（尝试多种 Tab 文案）
     - expect: 当前委托 Tab 激活
  2. 点击第一个取消按钮
     - expect: 取消按钮可见；若无订单则跳过
  3. 确认取消弹窗
     - expect: 确认弹窗被关闭
  4. 检测取消成功 Toast
     - expect: Toast 出现（或记录警告）