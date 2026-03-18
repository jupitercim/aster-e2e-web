# AsterDEX 推荐码页面

## Application Overview

AsterDEX 推荐码页面（/zh-CN/referral）的功能测试，专注于验证推荐码相关 UI：页面标题关键词、推荐码文本可见、复制按钮存在。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - 推荐码页面

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 推荐码页面标题可见

**File:** `tests/cases/referral-test.spec.ts`

**Steps:**
  1. 导航至 /zh-CN/referral，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空
  2. 查找推荐/邀请相关标题文字（推荐/Referral/邀请/Invite/推荐码/Referral Code 等关键词）
     - expect: 找到至少一个标题元素

#### 1.2. 推荐码文本可见

**File:** `tests/cases/referral-test.spec.ts`

**Steps:**
  1. 查找推荐码标签（推荐码/Referral Code/邀请码/Invite Code/我的推荐码/My Code 等关键词）
     - expect: 找到推荐码标签；若未找到则 fallback 到 class 含 code/referral-code/invite-code 的元素
  2. 验证推荐码元素可见
     - expect: 推荐码元素可见

#### 1.3. 复制按钮存在

**File:** `tests/cases/referral-test.spec.ts`

**Steps:**
  1. 依次查找文字复制按钮（复制/Copy/复制推荐码/复制链接/Copy Code/Copy Link 等）
     - expect: 找到复制按钮
  2. 若文字按钮未找到，fallback 查找带 SVG 图标的复制按钮（main/section/referral 区域内）
     - expect: 找到 SVG 图标按钮；若未找到则 fallback 到 class 含 copy 的元素
  3. 验证至少通过一种方式找到复制按钮
     - expect: 找到复制按钮（必须断言）