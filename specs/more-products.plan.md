# AsterDEX More Products（资源）页面

## Application Overview

AsterDEX 顶部导航「更多」下拉菜单中「资源」区域的功能测试，验证下拉菜单可打开、资源链接可见、链接 href 有效、点击链接不出现 404/500 错误。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage），从 /zh-CN 主页出发。

## Test Scenarios

### 1. AsterDEX - More Products（资源）页面

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 顶部"更多"按钮下拉框可打开，资源区域可见

**File:** `tests/cases/more-products.spec.ts`

**Steps:**
  1. 导航至 /zh-CN，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面正常加载
  2. hover「更多/More」导航按钮，等待 800ms
     - expect: 找到并 hover 到顶部导航；若未找到则跳过
  3. 验证「资源」标签可见
     - expect: 资源标签可见

#### 1.2. 资源区域下所有产品链接可见

**File:** `tests/cases/more-products.spec.ts`

**Steps:**
  1. hover「更多」按钮打开下拉，验证「资源」标签可见
     - expect: 资源标签可见；若未找到则跳过
  2. 通过 JS 找到「资源」标签的父容器，提取所有 `<a>` 链接文本和 href
     - expect: 找到至少 1 个资源链接

#### 1.3. 资源区域所有链接 href 有效

**File:** `tests/cases/more-products.spec.ts`

**Steps:**
  1. hover 打开下拉，提取资源区域所有链接
     - expect: 找到链接
  2. 验证每个链接 href 非空且非 `#`
     - expect: 无效 href 数量为 0（soft 断言）

#### 1.4. 点击资源链接后页面正常跳转，无 404/500

**File:** `tests/cases/more-products.spec.ts`

**Steps:**
  1. hover 打开下拉，获取第一个有效链接
     - expect: 找到可点击链接；若未找到则跳过
  2. 点击链接（处理新标签页或当前页跳转），等待 domcontentloaded 后再等待 2 秒
     - expect: 跳转后页面无 404/500 错误页（soft 断言）