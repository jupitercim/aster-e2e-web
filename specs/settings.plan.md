# AsterDEX Settings 设置页面

## Application Overview

AsterDEX 设置页面（实际导航至 /zh-CN/api-management）的功能测试，验证页面加载（无错误页）、设置选项正常显示、语言切换功能可用、主题切换（暗黑/明亮模式）、通知设置可用。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - Settings 设置页面

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. Settings 页面可正常加载

**File:** `tests/cases/settings.spec.ts`

**Steps:**
  1. 导航至 /zh-CN/api-management，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空（soft 断言）
  2. 验证无错误页（404/500/Not Found/Internal Server Error）
     - expect: 无错误页
  3. 验证 body 可见
     - expect: body 可见

#### 1.2. 验证设置选项正常显示

**File:** `tests/cases/settings.spec.ts`

**Steps:**
  1. 查找设置相关关键词（设置/Settings/语言/Language/通知/Notifications/主题/Theme/安全/Security/偏好/Preferences 等）
     - expect: 找到至少一个设置元素；若未找到记录警告
  2. 验证无 404 错误
     - expect: 无 404

#### 1.3. 验证语言切换功能可用

**File:** `tests/cases/settings.spec.ts`

**Steps:**
  1. 查找语言设置入口（语言/Language/中文/English/lang/locale 等）
     - expect: 找到语言设置入口；若未找到则跳过
  2. 点击语言设置入口，等待 1 秒，查找语言选项（中文/简体中文/English/한국어/日本語/Türkçe 等）
     - expect: 找到至少一个语言选项（或记录警告）
  3. 按 Escape 关闭语言选择器
     - expect: 选择器已关闭

#### 1.4. 验证主题切换（暗黑/明亮模式）

**File:** `tests/cases/settings.spec.ts`

**Steps:**
  1. 查找主题切换入口（主题/Theme/暗黑/Dark/明亮/Light/夜间/日间 等）
     - expect: 若找到则记录
  2. 若找到，记录切换前背景色，点击主题切换，等待 1 秒
     - expect: 切换后背景色变化，或 body/html class 含 dark/light 类名（记录结果）

#### 1.5. 验证通知设置可用

**File:** `tests/cases/settings.spec.ts`

**Steps:**
  1. 查找通知设置入口（通知/Notifications/推送/Push/邮件/Email 等）
     - expect: 找到通知设置入口；若未找到则跳过
  2. 点击通知设置入口，等待 1.5 秒
     - expect: 点击成功（截图保存）