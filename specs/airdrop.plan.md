# AsterDEX 空投（Airdrop）

## Application Overview

AsterDEX 空投页面（/zh-CN/airdrop）的功能测试，验证页面加载（阶段信息/统计数据）、阶段切换下拉菜单可用、FAQ 折叠展开交互。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - 空投（Airdrop）

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 空投页面正常加载，显示阶段信息

**File:** `tests/cases/airdrop.spec.ts`

**Steps:**
  1. 导航至 /zh-CN/airdrop，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空
  2. 查找阶段标题（空投/Airdrop/阶段/Phase/ASTER 等关键词）
     - expect: 找到至少一个阶段信息元素
  3. 查找统计数据字段（总燃烧/空投锁定/Burned/Locked/ASTER 等关键词）
     - expect: 找到至少一个统计数据元素（soft 断言）

#### 1.2. 阶段切换下拉菜单可用

**File:** `tests/cases/airdrop.spec.ts`

**Steps:**
  1. 查找阶段选择器（[role="combobox"]:has-text("阶段") 等），若未找到则跳过
     - expect: 阶段下拉选择器可见
  2. 点击下拉，等待 1 秒
     - expect: 下拉被打开
  3. 验证下拉选项出现（[role="option"] 等）
     - expect: 选项可见（或记录警告）
  4. 按 Escape 关闭下拉
     - expect: 下拉已关闭

#### 1.3. FAQ 折叠展开功能正常

**File:** `tests/cases/airdrop.spec.ts`

**Steps:**
  1. 查找 FAQ 条目（ASTER 代币是什么/常见问题/FAQ 等），若未找到则跳过
     - expect: 找到 FAQ 条目
  2. 点击 FAQ 条目，等待 1 秒
     - expect: FAQ 内容展开，页面无 500/Error 错误