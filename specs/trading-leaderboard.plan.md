# AsterDEX 交易排行榜

## Application Overview

AsterDEX 交易排行榜页面（/zh-CN/trading-leaderboard）的功能测试，验证页面加载（排行榜数据可见）、周期切换（日/周/月）、多空方向榜切换（如有）。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - 交易排行榜

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 排行榜页面正常加载，列表数据可见

**File:** `tests/cases/trading-leaderboard.spec.ts`

**Steps:**
  1. 导航至 /zh-CN/trading-leaderboard，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空
  2. 查找排行榜相关关键词（排行榜/Leaderboard/排名/Rank/交易者/Trader 等）
     - expect: 找到至少一个排行榜元素

#### 1.2. 周期切换（日/周/月）正常

**File:** `tests/cases/trading-leaderboard.spec.ts`

**Steps:**
  1. 依次查找并点击日/周/Daily/Weekly 等周期按钮（找到 2 个即停止），每次等待 1 秒
     - expect: 找到可见的周期按钮并点击；若未找到任何则记录警告

#### 1.3. 多空方向榜切换（如有）

**File:** `tests/cases/trading-leaderboard.spec.ts`

**Steps:**
  1. 查找多空方向切换按钮（多头/空头/Long/Short/做多/做空 等）
     - expect: 找到方向榜 Tab 并点击，等待 1 秒；若未找到则跳过（可能不支持该功能）