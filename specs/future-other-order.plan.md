# AsterDEX 期货其他委托（止盈止损 / 计划委托）

## Application Overview

AsterDEX 期货合约交易页面的止盈止损委托、一键撤销、TWAP 策略入口以及资金费率信息的功能测试。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage），导航至 EXCHANGE_URL。

## Test Scenarios

### 1. AsterDEX - 期货其他委托（止盈止损 / 计划委托）

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 止盈止损限价委托下单

**File:** `tests/cases/future-other-order.spec.ts`

**Steps:**
  1. 导航至 EXCHANGE_URL，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面正常加载
  2. 读取标记价格，选择「限价止盈止损」委托类型（combobox 或 Tab）
     - expect: 止盈止损委托类型被选中
  3. 输入触发价格（markPrice + 500）和委托价格（markPrice + 600），数量 0.001 BTC
     - expect: 各输入框可编辑
  4. 点击买入做多，处理确认弹窗
     - expect: 确认弹窗被关闭
  5. 检测下单成功 Toast
     - expect: Toast 出现（或记录警告）
  6. 切换到当前委托 Tab
     - expect: 当前委托 Tab 激活

#### 1.2. 取消止盈止损委托单

**File:** `tests/cases/future-other-order.spec.ts`

**Steps:**
  1. 切换到当前委托 Tab，等待 1 秒
     - expect: 当前委托 Tab 激活
  2. 点击第一个取消按钮，确认取消弹窗
     - expect: 确认弹窗被关闭；若无订单则跳过
  3. 检测取消成功 Toast
     - expect: Toast 出现（或记录警告）

#### 1.3. 一键撤销所有委托单

**File:** `tests/cases/future-other-order.spec.ts`

**Steps:**
  1. 切换到当前委托 Tab，查找全部撤销按钮
     - expect: 若无委托或无该按钮则跳过
  2. 点击全部撤销，确认弹窗
     - expect: 确认弹窗被关闭
  3. 检测取消成功 Toast
     - expect: Toast 出现（或记录警告）

#### 1.4. TWAP 策略创建入口可用

**File:** `tests/cases/future-other-order.spec.ts`

**Steps:**
  1. 点击底部 TWAP Tab（若不可见则跳过）
     - expect: TWAP Tab 被激活
  2. 等待 1.5 秒后查找 TWAP 策略参数面板（总数量/执行间隔/Create 等关键词）
     - expect: 找到至少一个 TWAP UI 元素；若未找到记录警告

#### 1.5. 页面顶部资金费率和倒计时信息格式正确

**File:** `tests/cases/future-other-order.spec.ts`

**Steps:**
  1. 查找资金费率元素（资金费率/Funding Rate/倒计时）
     - expect: 找到资金费率相关元素；若未找到则跳过
  2. 验证倒计时格式（HH:MM:SS）
     - expect: 倒计时元素可见且格式正确，或记录警告
  3. 验证资金费率数值（含 % 号）
     - expect: 资金费率数值可见，或记录警告