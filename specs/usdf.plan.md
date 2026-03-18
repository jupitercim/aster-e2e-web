# AsterDEX USDF 稳定币

## Application Overview

AsterDEX USDF 稳定币页面（/zh-CN/usdf）的功能测试，验证页面加载（铸造/兑换 Tab 及统计数据）、铸造与兑换 Tab 切换、FAQ 折叠展开功能。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - USDF 稳定币

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. USDF 页面正常加载

**File:** `tests/cases/usdf.spec.ts`

**Steps:**
  1. 导航至 /zh-CN/usdf，等待 domcontentloaded 后再等待 3 秒，再等待 2 秒
     - expect: 页面标题不为空
  2. 查找「铸造」Tab（button/[role="tab"]），等待最长 8 秒
     - expect: 铸造 Tab 可见（soft 断言）
  3. 查找「兑换」Tab
     - expect: 兑换 Tab 可见（或记录警告）
  4. 查找统计数据区域（总铸造/可铸造/USDF价格/Total Minted/USDF Price 等关键词）
     - expect: 找到至少一个统计数据元素（soft 断言）

#### 1.2. 铸造与兑换 Tab 切换正常

**File:** `tests/cases/usdf.spec.ts`

**Steps:**
  1. 点击「兑换」Tab（若可见），等待 1 秒
     - expect: 兑换 Tab 激活；若不存在则跳过
  2. 验证兑换 UI 出现（兑换/从/到/From/To/Redeem 等关键词）
     - expect: 找到兑换 UI 元素（或记录）
  3. 切换回「铸造」Tab
     - expect: 铸造 Tab 激活

#### 1.3. FAQ 折叠展开功能正常

**File:** `tests/cases/usdf.spec.ts`

**Steps:**
  1. 查找 FAQ 条目（什么是USDF/USDF是什么/常见问题/FAQ/什么是智能铸造 等），若未找到则跳过
     - expect: 找到 FAQ 条目
  2. 点击 FAQ 条目，等待 1 秒
     - expect: FAQ 内容展开（出现 USDF/稳定币/收益/stable/yield 等关键词于第二个匹配元素）