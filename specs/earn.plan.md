# AsterDEX 赚取（Earn）

## Application Overview

AsterDEX Earn 页面（/zh-CN/earn）的功能测试，验证页面加载（标题/策略列表）、赚取与生态系统 Tab 切换、点击产品进入详情（铸造/查看详情）。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - 赚取（Earn）

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. Earn 页面正常加载，标题与策略列表可见

**File:** `tests/cases/earn.spec.ts`

**Steps:**
  1. 导航至 /zh-CN/earn，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空
  2. 验证标题包含 Earn/earn/赚币/赚取/Aster 等关键词
     - expect: 标题关键词命中（soft 断言）
  3. 查找策略/产品列表区域（策略/Strategy/asBTC/asCAKE/ALP/TVL/APY 等关键词）
     - expect: 找到至少一个列表元素
  4. 验证无 404 错误页
     - expect: 页面不含 404

#### 1.2. 赚取与生态系统 Tab 切换正常

**File:** `tests/cases/earn.spec.ts`

**Steps:**
  1. 点击「生态系统」Tab（若可见），等待 1.5 秒
     - expect: 生态系统 Tab 激活；若不存在则跳过
  2. 切换回「赚取」Tab
     - expect: 赚取 Tab 激活

#### 1.3. 点击产品能进入详情

**File:** `tests/cases/earn.spec.ts`

**Steps:**
  1. 依次尝试点击铸造/Mint/查看详情/Detail/asBTC/asCAKE/ALP 等入口
     - expect: 找到可点击的产品入口；若未找到则 fallback 到点击列表第一行
  2. 等待 1.5 秒后验证出现详情相关 UI（铸造/Mint/数量/Amount/赎回/Redeem 等关键词），或 URL 已跳转
     - expect: 找到详情 UI 或 URL 发生变化（soft 断言）
  3. 按 Escape 关闭弹窗（如有）
     - expect: 弹窗已关闭