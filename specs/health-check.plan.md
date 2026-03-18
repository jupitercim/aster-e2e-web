# AsterDEX 系统健康检查

## Application Overview

AsterDEX 系统级健康检查，验证主页和合约交易页是否正常加载（无 404/500 错误页），以及页面加载过程中无 5xx 网络请求错误。测试使用 extensionContext fixture（未登录的浏览器扩展上下文），每个测试独立打开新页面并关闭。

## Test Scenarios

### 1. AsterDEX - 系统健康检查

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 主页可正常加载

**File:** `tests/cases/health-check.spec.ts`

**Steps:**
  1. 新建页面，导航至 /zh-CN，等待 domcontentloaded 后再等待 2 秒
     - expect: 页面标题不为空
  2. 检查是否出现 HTTP 错误页（h1 为 404/500/Not Found/Internal Server Error）
     - expect: 无错误页

#### 1.2. 合约交易页可正常加载

**File:** `tests/cases/health-check.spec.ts`

**Steps:**
  1. 新建页面，导航至 EXCHANGE_URL，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空
  2. 检查是否出现 HTTP 错误页
     - expect: 无错误页

#### 1.3. 网络请求无 5xx 错误

**File:** `tests/cases/health-check.spec.ts`

**Steps:**
  1. 新建页面，监听所有 response 事件，记录 status >= 500 的请求 URL
     - expect: 监听器已挂载
  2. 导航至 EXCHANGE_URL，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面正常加载
  3. 验证收集到的 5xx 请求数量为 0
     - expect: failedRequests.length === 0