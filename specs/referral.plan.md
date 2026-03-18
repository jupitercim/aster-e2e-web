# AsterDEX 推荐（Referral）

## Application Overview

AsterDEX 推荐页面（/zh-CN/referral）的功能测试，验证页面加载（推荐相关关键词）、复制推荐链接（复制成功 Toast）、推荐收益统计数据区域可见。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - 推荐（Referral）

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 推荐页面正常加载

**File:** `tests/cases/referral.spec.ts`

**Steps:**
  1. 导航至 /zh-CN/referral，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空
  2. 查找推荐相关关键词（推荐/Referral/邀请/Invite/佣金/Commission）
     - expect: 找到至少一个推荐元素

#### 1.2. 复制推荐链接，显示复制成功提示

**File:** `tests/cases/referral.spec.ts`

**Steps:**
  1. 查找复制按钮（复制链接/复制邀请链接/Copy Link/复制 等），若未找到则 fallback 到 SVG 图标按钮
     - expect: 找到复制按钮；若未找到则跳过
  2. 滚动到按钮位置，点击复制按钮，等待 1 秒
     - expect: 点击成功
  3. 检测复制成功 Toast（已复制/复制成功/Copied/Copy success 等）
     - expect: Toast 出现（或记录警告）

#### 1.3. 推荐收益统计数据区域可见

**File:** `tests/cases/referral.spec.ts`

**Steps:**
  1. 查找统计数据区域（邀请/佣金/收益/奖励/Invited/Commission/Reward/Earnings 等关键词）
     - expect: 找到至少一个统计数据元素；若未找到记录警告