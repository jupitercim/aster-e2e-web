# AsterDEX API 管理

## Application Overview

AsterDEX API 管理页面（/zh-CN/api-management）的功能测试，验证页面加载（标题/创建 API 按钮）、API 与专业 API Tab 切换、点击创建 API 弹窗出现。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - API 管理

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. API 管理页面正常加载

**File:** `tests/cases/api-management.spec.ts`

**Steps:**
  1. 导航至 /zh-CN/api-management，等待 domcontentloaded 后再等待 3 秒，再等待 2 秒
     - expect: 页面标题不为空（soft 断言）
  2. 查找含 API 字样的 heading 元素
     - expect: heading 可见（soft 断言）
  3. 查找创建 API 按钮（创建 API/创建API/Create API）
     - expect: 创建 API 按钮可见（soft 断言）

#### 1.2. API 与专业API Tab 切换正常

**File:** `tests/cases/api-management.spec.ts`

**Steps:**
  1. 点击「专业API」Tab（若可见）
     - expect: 专业API Tab 激活；若不存在则跳过
  2. 切换回「API」Tab
     - expect: API Tab 激活

#### 1.3. 创建 API 按钮点击后弹窗出现

**File:** `tests/cases/api-management.spec.ts`

**Steps:**
  1. 按 Escape 关闭任何已打开弹窗，查找创建 API 按钮
     - expect: 按钮可见；若未找到则跳过
  2. 点击创建 API 按钮（若弹窗已打开则直接验证），等待 1.5 秒
     - expect: 弹窗被打开
  3. 验证弹窗内容（API标签/IP 白名单/权限/Create 等关键词）
     - expect: 找到至少一个弹窗元素；若未找到记录警告
  4. 按 Escape 关闭弹窗
     - expect: 弹窗已关闭