# AsterDEX 网格交易

## Application Overview

AsterDEX 网格交易页面（/zh-CN/strategy/futures/grid/BTCUSDT）的功能测试，验证页面加载（合约网格标题/一键创建/手动创建按钮）、运行中与历史 Tab 切换、一键创建策略入口可用。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - 网格交易

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 网格交易页面正常加载

**File:** `tests/cases/grid-trading.spec.ts`

**Steps:**
  1. 导航至 /zh-CN/strategy/futures/grid/BTCUSDT，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空
  2. 查找页面标题元素（合约网格/网格交易/策略交易/Grid Trading/Strategy 等关键词）
     - expect: 找到至少一个标题元素（soft 断言）
  3. 验证「一键创建」按钮存在
     - expect: 一键创建按钮可见（或记录警告）
  4. 验证「手动创建」按钮存在
     - expect: 手动创建按钮可见（或记录警告）

#### 1.2. 运行中与历史 Tab 切换正常

**File:** `tests/cases/grid-trading.spec.ts`

**Steps:**
  1. 点击「历史」Tab（若可见），等待 1 秒
     - expect: 历史 Tab 激活；若不存在则跳过
  2. 切换回「运行中」Tab
     - expect: 运行中 Tab 激活；若不存在则跳过

#### 1.3. 一键创建网格策略入口可用

**File:** `tests/cases/grid-trading.spec.ts`

**Steps:**
  1. 点击「一键创建」按钮，若不可见则跳过
     - expect: 按钮可见
  2. 等待 1.5 秒后查找策略创建面板（创建策略/网格参数/起始价/结束价/每格/Create/Grid 等关键词）
     - expect: 找到至少一个策略创建面板元素；若未找到记录警告