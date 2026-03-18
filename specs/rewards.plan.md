# AsterDEX Rewards 页面

## Application Overview

AsterDEX Rewards 页面（/zh-CN/trade-and-earn）的功能测试，验证页面加载、奖励内容显示、任务/活动列表查看、积分排行榜数据、交易挖矿规则说明展开。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - Rewards 页面

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. Rewards 页面可正常加载

**File:** `tests/cases/rewards.spec.ts`

**Steps:**
  1. 导航至 /zh-CN/trade-and-earn，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空

#### 1.2. 验证奖励内容正常显示

**File:** `tests/cases/rewards.spec.ts`

**Steps:**
  1. 查找奖励相关元素（奖励/Rewards/积分/Points/领取/Claim/排行榜/Leaderboard 等关键词）
     - expect: 找到至少一个奖励元素；若未找到记录警告
  2. 验证无 404 错误
     - expect: 无 404

#### 1.3. 查看任务或活动列表

**File:** `tests/cases/rewards.spec.ts`

**Steps:**
  1. 查找任务/活动相关元素（任务/Task/活动/Activity/每日/Daily 等关键词）
     - expect: 找到至少一个任务元素；若未找到记录警告

#### 1.4. 积分排行榜列表可见

**File:** `tests/cases/rewards.spec.ts`

**Steps:**
  1. 查找排行榜入口 Tab/链接（排行榜/Leaderboard/积分榜/Points Ranking 等），若未找到则跳过
     - expect: 找到排行榜入口
  2. 点击排行榜入口，等待 2 秒
     - expect: 排行榜内容加载
  3. 查找排行榜数据（#1/排名/Rank/积分/Points/地址/Address 等关键词）
     - expect: 找到至少一个排行榜数据元素；若未找到记录警告

#### 1.5. 交易挖矿规则说明可展开

**File:** `tests/cases/rewards.spec.ts`

**Steps:**
  1. 重新导航至 /zh-CN/trade-and-earn，查找规则入口（规则/了解更多/Rules/Learn More/奖励规则/查看规则 等），若未找到则跳过
     - expect: 找到规则入口
  2. 点击规则入口，等待 1.5 秒
     - expect: 规则内容展开（截图保存）