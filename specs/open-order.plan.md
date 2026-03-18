# AsterDEX Open Order 编辑测试

## Application Overview

AsterDEX 期货合约交易页面的开放委托订单编辑压力测试，验证限价单下单、连续修改数量 29 次、连续修改价格 29 次、以及撤销全部订单的完整流程。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage），导航至 EXCHANGE_URL，固定限价 66000 USDT、数量 0.001 BTC。

## Test Scenarios

### 1. AsterDEX - Open Order 编辑测试

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 下 66000 限价单 0.001 BTC

**File:** `tests/cases/open-order.spec.ts`

**Steps:**
  1. 导航至 EXCHANGE_URL，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面正常加载
  2. 选择限价单，填入价格 66000，选择 BTC 单位，填入数量 0.001
     - expect: 输入框可编辑
  3. 点击提交，处理确认弹窗，检测下单成功 Toast
     - expect: Toast 出现（或记录警告）
  4. 切换到当前委托 Tab，验证 BTCUSDT 订单出现
     - expect: BTCUSDT 文本可见（等待最长 5 秒）

#### 1.2. 修改 qty 29 次

**File:** `tests/cases/open-order.spec.ts`

**Steps:**
  1. 切换到当前委托 Tab，等待 Modify order 按钮出现（超时则刷新重试）
     - expect: Modify order 按钮可见
  2. 循环 29 次：点击 Modify order 按钮打开编辑弹窗，修改数量（0.001 × ((i % 9) + 1)），提交
     - expect: 每次修改成功 Toast 出现（修改成功/编辑成功/更新成功/Success 等）
  3. 等待 2 秒后进行下一次修改
     - expect: 29 次全部完成

#### 1.3. 修改价格 29 次

**File:** `tests/cases/open-order.spec.ts`

**Steps:**
  1. 切换到当前委托 Tab，等待 Modify order 按钮出现
     - expect: Modify order 按钮可见
  2. 循环 29 次：点击 Modify order 按钮打开编辑弹窗，修改价格（66000 + ((i % 9) + 1)），提交
     - expect: 每次修改成功 Toast 出现
  3. 等待 2 秒后进行下一次修改
     - expect: 29 次全部完成

#### 1.4. 撤销全部 Open Orders

**File:** `tests/cases/open-order.spec.ts`

**Steps:**
  1. 切换到当前委托 Tab，查找「一键撤销全部」按钮（取消所有/撤销全部/Cancel All/全部撤销 等）
     - expect: 若找到则点击并确认弹窗，检测撤销成功 Toast
  2. 若无一键撤销，则循环逐条点击取消按钮直到无订单为止
     - expect: 所有订单被撤销