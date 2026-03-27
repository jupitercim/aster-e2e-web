# AsterDEX Shield 模式交易

## Application Overview

AsterDEX Shield 模式交易页面（/zh-CN/trade/shield/futures/BTCUSDT）的功能测试，验证 Shield 页面加载、限价买入下单、取消委托单的完整流程，以及网格交易策略的手动创建、详情查看和终止操作。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - Shield 模式交易

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. Shield 模式页面可正常加载

**File:** `tests/cases/shield-order.spec.ts`

**Steps:**
  1. 导航至 Shield URL（/zh-CN/trade/shield/futures/BTCUSDT），等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空
  2. 查找交易面板（#tour-guide-place-order / input[placeholder="数量"] 等）
     - expect: 交易面板可见，或记录警告（URL 可能需要确认）

#### 1.2. Shield 模式限价买入 0.001 BTC

**File:** `tests/cases/shield-order.spec.ts`

**Steps:**
  1. 查找并点击限价按钮（若不可见则跳过）
     - expect: 限价模式激活
  2. 填入价格 60000（低于市价不成交）和数量 0.001
     - expect: 价格和数量输入框可编辑
  3. 点击第一个 submit 按钮，处理确认弹窗
     - expect: 确认弹窗被关闭
  4. 检测下单成功 Toast
     - expect: Toast 出现（或记录警告）
  5. 切换到当前委托 Tab（尝试多种 Tab 文案）
     - expect: 当前委托 Tab 激活

#### 1.3. 取消 Shield 委托单

**File:** `tests/cases/shield-order.spec.ts`

**Steps:**
  1. 切换到当前委托 Tab（尝试多种 Tab 文案）
     - expect: 当前委托 Tab 激活
  2. 点击第一个取消按钮
     - expect: 取消按钮可见；若无订单则跳过
  3. 确认取消弹窗
     - expect: 确认弹窗被关闭
  4. 检测取消成功 Toast
     - expect: Toast 出现（或记录警告）

#### 1.4. 网格交易 - 手动创建做多策略（价格区间 mark-2000 ~ mark-1000，5格）

**File:** `tests/cases/shield-order.spec.ts`

**Steps:**
  1. 导航至网格交易 URL（/zh-CN/strategy/futures/grid/BTCUSDT），等待加载并关闭欢迎/step guide 弹窗
     - expect: 页面正常加载
  2. 从页面读取标记价格（50,000~500,000 之间的数值）
     - expect: 标记价格大于 0
  3. 计算价格区间：最低 = mark-2000，最高 = mark-1000
  4. 点击「手动创建」Tab
     - expect: 手动创建表单显示
  5. 点击「做多」方向
     - expect: 做多方向被选中
  6. 填入最低价格（#gridLowerLimit）和最高价格（#gridUpperLimit）
     - expect: 输入框可见且可编辑
  7. 填入网格数量 5（#gridCount），按 Tab 触发计算
     - expect: 网格数量填入成功
  8. 填入保证金（#gridInitialValue，取 placeholder 中最小值的 10 倍，至少 100）
     - expect: 保证金输入框可见且填入成功
  9. 等待「创建」按钮变为可点击（最多 5 秒），点击创建
     - expect: 创建按钮可点击
  10. 处理确认弹窗（若出现）
      - expect: 弹窗被关闭
  11. 检测策略创建成功 Toast
      - expect: Toast 出现（或记录警告，继续验证）

#### 1.5. 网格交易 - 查看策略详情并终止

**File:** `tests/cases/shield-order.spec.ts`

**Steps:**
  1. 导航至网格交易 URL，等待加载并关闭引导弹窗
     - expect: 页面正常加载
  2. 等待策略列表加载，检查是否有运作中策略
     - expect: 若无策略则跳过后续步骤（记录警告）
  3. 点击「详情」按钮（若存在）
     - expect: 详情内容可见（BTCUSDT、做多等）
  4. 关闭详情弹窗或返回列表
     - expect: 回到策略列表页
  5. 点击「终止」按钮
     - expect: 终止确认弹窗出现；若无终止按钮则跳过
  6. 确认终止弹窗
     - expect: 弹窗被关闭
  7. 检测终止成功 Toast
     - expect: Toast 出现（或记录警告）