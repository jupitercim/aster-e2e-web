# AsterDEX Aster Code（Builder 中心）

## Application Overview

AsterDEX Aster Code 页面（/zh-CN/aster-code）的功能测试，验证页面加载（成为 Builder 入口/特性介绍卡片）、「成为 Builder」按钮点击交互（处理新标签页或当前页弹窗）。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - Aster Code（Builder 中心）

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. Aster Code 页面正常加载

**File:** `tests/cases/aster-code.spec.ts`

**Steps:**
  1. 导航至 /zh-CN/aster-code，等待 domcontentloaded 后再等待 3 秒，再等待 2 秒
     - expect: 页面标题不为空
  2. 查找「成为 Builder」入口（a/button）
     - expect: 成为 Builder 入口可见（soft 断言）
  3. 查找特性介绍卡片（无需许可/Builder 奖励/高性能/品牌/Permissionless/Reward 等关键词）
     - expect: 找到至少一个特性卡片（soft 断言）

#### 1.2. 成为 Builder 按钮可点击

**File:** `tests/cases/aster-code.spec.ts`

**Steps:**
  1. 查找「成为 Builder」按钮，若不可见则跳过
     - expect: 按钮可见
  2. 点击按钮，捕获可能打开的新标签页
     - expect: 点击响应：新标签页打开或当前页出现相关响应（Builder/激活/注册/Activate/Register/Code 等关键词）
  3. 若新标签页打开，截图后关闭；否则按 Escape 关闭弹窗
     - expect: 新标签页有实质内容或当前页有弹窗响应