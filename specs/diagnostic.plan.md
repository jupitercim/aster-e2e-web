# DOM 诊断 - 底部面板

## Application Overview

DOM 诊断测试，用于检查期货合约交易页面（EXCHANGE_URL）底部仓位 Tab 的 DOM 结构，包括表格行选择器统计、空状态关键词检测、以及大型面板容器的可见性信息。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage），输出诊断信息到控制台，不作业务断言。

## Test Scenarios

### 1. DOM diagnostic - bottom panel

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. DOM diagnostic - bottom panel

**File:** `tests/cases/diagnostic.spec.ts`

**Steps:**
  1. 导航至 EXCHANGE_URL，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面正常加载
  2. 点击「仓位」Tab，等待 1.5 秒
     - expect: 仓位 Tab 被激活
  3. 通过 JS 统计各行选择器（tbody tr/[role="row"]/tr/[role="rowgroup"] > *）的元素数量和第一行文本
     - expect: 诊断信息输出到控制台
  4. 检测页面内空状态关键词（暂无数据/No Data/No orders 等）
     - expect: 空状态关键词匹配结果输出到控制台
  5. 查找底部大型面板容器（class 含 panel/table/position/order，宽度 > 300px，高度 > 100px，top > 400px）
     - expect: 大型容器信息输出到控制台
  6. 查找页面下半部分可见元素（top > 60% viewport，高度 10-60px，宽度 > 200px）
     - expect: 可见元素信息输出到控制台