# AsterDEX Rocket Launch 页面

## Application Overview

AsterDEX 火箭发射页面（/zh-CN/rocket-launch）的综合功能测试，包括：页面加载（H1/H2 可见）、Tab 切换（火箭发射/Trade Arena）、筛选按钮（全部/进行中/即将到来/已结束）、项目卡片「交易赚取」链接有效性验证、点击交易赚取跳转 Spot 页、查看更多加载、FAQ 手风琴展开收起、「了解更多」链接指向文档、以及已结束卡片数据验证（结束时间/最小持仓/链接有效性）。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - Rocket Launch 页面

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. Rocket Launch 页面可正常加载

**File:** `tests/cases/rocket-launch.spec.ts`

**Steps:**
  1. 导航至 /zh-CN/rocket-launch，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空
  2. 验证 H1 heading 文本不为空
     - expect: H1 文本存在
  3. 验证 H2 可见（或记录警告），验证无 404 错误
     - expect: 无 404

#### 1.2. Tab 切换：火箭发射 / Trade Arena

**File:** `tests/cases/rocket-launch.spec.ts`

**Steps:**
  1. 验证「火箭发射」和「Trade Arena」两个 Tab 均可见
     - expect: 两个 Tab 均可见
  2. 点击 Trade Arena Tab，等待 1.5 秒
     - expect: Trade Arena 被激活
  3. 切回「火箭发射」Tab，等待 1 秒
     - expect: 火箭发射 Tab 被激活

#### 1.3. 筛选按钮切换正常

**File:** `tests/cases/rocket-launch.spec.ts`

**Steps:**
  1. 依次点击「全部」「进行中」「即将到来」「已结束」四个筛选按钮（若可见），每次等待 1 秒
     - expect: 可见的筛选按钮均可点击
  2. 切回「全部」
     - expect: 全部筛选激活

#### 1.4. 项目卡片列表可见，交易赚取链接有效

**File:** `tests/cases/rocket-launch.spec.ts`

**Steps:**
  1. 进入「已结束」筛选，查找「交易赚取」链接
     - expect: 找到至少 1 个交易赚取链接
  2. 验证前 3 个链接 href 包含 /trade/
     - expect: 每个链接 href 有效（soft 断言）

#### 1.5. 点击交易赚取进入 Spot 交易页

**File:** `tests/cases/rocket-launch.spec.ts`

**Steps:**
  1. 进入「已结束」筛选，获取第一个「交易赚取」链接的 href
     - expect: href 存在；若不存在则跳过
  2. 直接导航至 href 对应 URL，等待 domcontentloaded 后再等待 2 秒
     - expect: 当前 URL 包含 /trade/，且无 404 错误页
  3. 导航回火箭发射页
     - expect: 成功返回

#### 1.6. "查看更多"加载更多项目

**File:** `tests/cases/rocket-launch.spec.ts`

**Steps:**
  1. 进入「已结束」筛选，记录当前交易赚取链接数量
     - expect: 数量记录到控制台
  2. 点击「查看更多」按钮（若可见），等待 2 秒
     - expect: 点击后链接数量 >= 点击前数量

#### 1.7. FAQ 手风琴展开与收起

**File:** `tests/cases/rocket-launch.spec.ts`

**Steps:**
  1. 依次查找并展开三个 FAQ 条目（什么是火箭发射？/如何符合活动条件？/我什么时候可以收到奖励？）
     - expect: 可见的 FAQ 按钮均可展开
  2. 点击已展开的 FAQ 按钮收起
     - expect: FAQ 可收起

#### 1.8. "了解更多"链接指向文档

**File:** `tests/cases/rocket-launch.spec.ts`

**Steps:**
  1. 查找「了解更多」链接（等待最长 5 秒）
     - expect: 链接可见
  2. 验证 href 包含 docs 关键词
     - expect: href 包含 docs

#### 1.9. 火箭发射 Tab - 已结束卡片：结束时间/最小持仓/交易赚取链接

**File:** `tests/cases/rocket-launch.spec.ts`

**Steps:**
  1. 导航至火箭发射页，点击「已结束」筛选，滚动并点击「查看更多」（若有）
     - expect: 已结束卡片数 > 0
  2. 对每个卡片验证：活动周期结束时间 < 当前时间
     - expect: 所有卡片结束时间早于当前时间（soft 断言）
  3. 对每个卡片验证：最小持仓 >= 0（0 表示无持仓要求，为合法值）
     - expect: 信息记录到控制台
  4. 对每个卡片验证：「交易赚取」链接 href 包含 /trade/
     - expect: 所有链接 href 有效（soft 断言）
  5. Hover 第一个「交易赚取」链接，验证 href 包含 /trade/
     - expect: hover href 包含 /trade/（soft 断言）

#### 1.10. Trade Arena Tab - 已结束卡片：结束时间/最小持仓/交易赚取链接

**File:** `tests/cases/rocket-launch.spec.ts`

**Steps:**
  1. 导航至火箭发射页，切换到 Trade Arena Tab，点击「已结束」筛选，滚动并点击「查看更多」（若有）
     - expect: 已结束卡片数 > 0
  2. 对每个卡片验证：活动周期结束时间 < 当前时间，最小交易量 > 10（若字段存在），「交易赚取」链接 href 包含 /trade/
     - expect: 所有校验通过（soft 断言）