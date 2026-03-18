# AsterDEX 现货交易

## Application Overview

AsterDEX 现货交易页面（/zh-CN/trade/pro/spot/BTCUSDT）的功能测试，验证页面加载、限价买入挂单、交易对切换（BTCUSDT → ETHUSDT）、历史成交记录 Tab 切换。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - 现货交易

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 现货交易页面正常加载

**File:** `tests/cases/spot-order.spec.ts`

**Steps:**
  1. 导航至现货 URL（/zh-CN/trade/pro/spot/BTCUSDT），等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空且包含 BTCUSDT
  2. 验证买入/卖出按钮可见
     - expect: 买入按钮可见（soft 断言）

#### 1.2. BTC/USDT 限价买入挂单

**File:** `tests/cases/spot-order.spec.ts`

**Steps:**
  1. 选择限价单，填入价格 60000（低于市价不成交）和数量 0.003
     - expect: 价格和数量输入框可编辑
  2. 点击买入按钮，处理确认弹窗
     - expect: 确认弹窗被关闭
  3. 检测下单成功 Toast
     - expect: Toast 出现（或记录警告）

#### 1.3. 切换交易对（BTCUSDT → ETHUSDT）

**File:** `tests/cases/spot-order.spec.ts`

**Steps:**
  1. 点击交易对选择器（BTC / BTCUSDT 相关元素），等待 1 秒
     - expect: 交易对选择器被打开
  2. 在搜索框输入 ETH，点击 ETHUSDT 选项
     - expect: ETHUSDT 被选中，页面标题更新为含 ETH；若无搜索框则直接导航到 ETHUSDT 页面

#### 1.4. 历史成交记录 Tab 可切换

**File:** `tests/cases/spot-order.spec.ts`

**Steps:**
  1. 导航回 BTC/USDT 现货页，查找历史成交 Tab（历史成交/成交记录/Order History 等）
     - expect: 找到历史成交 Tab 并点击；若未找到则跳过
  2. 等待 1 秒后验证内容区域可见（BTCUSDT/暂无数据/买入/卖出 等）
     - expect: 内容区域有内容（有数据或空状态提示）