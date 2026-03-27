# AsterDEX 期货限价委托

## Application Overview

AsterDEX 期货合约交易页面的限价委托功能测试，验证限价挂单、取消委托、历史委托记录核实、隐藏订单和只减仓选项的交互，以及改单流程（多次改价、无变化提示、取消所有订单）。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage），导航至 EXCHANGE_URL。

## Test Scenarios

### 1. AsterDEX - 期货限价委托

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 限价挂单 BTC/USDT 0.001 BTC（mark price - 1000）

**File:** `tests/cases/future-limit-order.spec.ts`

**Steps:**
  1. 导航至 EXCHANGE_URL，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面正常加载
  2. 读取标记价格（dt:has-text("标记价格")），计算限价 = floor(markPrice - 1000)
     - expect: 标记价格元素可见，且解析为有效数值
  3. 选择限价单，填入限价和数量（0.001 BTC，选 BTC 单位）
     - expect: 价格输入框和数量输入框均可编辑
  4. 点击买入/做多按钮，处理确认弹窗
     - expect: 确认弹窗被关闭
  5. 检测下单成功 Toast（下单成功/委托成功/Order placed 等）
     - expect: Toast 出现（或记录警告）
  6. 切换到当前委托 Tab，验证 BTCUSDT 订单出现
     - expect: BTCUSDT 文本在当前委托列表中可见

#### 1.2. 取消刚才的限价委托单

**File:** `tests/cases/future-limit-order.spec.ts`

**Steps:**
  1. 切换到当前委托 Tab，等待 1 秒
     - expect: 当前委托 Tab 激活
  2. 点击第一个订单的取消按钮
     - expect: 取消按钮可见；若无订单则跳过
  3. 确认取消弹窗
     - expect: 确认弹窗被关闭
  4. 检测取消成功 Toast（取消成功/撤单成功/Cancelled 等）
     - expect: Toast 出现（或记录警告）

#### 1.3. 验证历史委托中订单状态、价格与数量

**File:** `tests/cases/future-limit-order.spec.ts`

**Steps:**
  1. 切换到历史委托 Tab（历史委托/订单历史/Order History）
     - expect: 找到并成功切换到历史委托 Tab
  2. 等待 2 秒后读取第一行订单文本
     - expect: 第一行可见
  3. 验证订单状态含取消关键词（已取消/取消/Cancelled 等）
     - expect: 状态为已取消
  4. 验证行内数值中包含限价单价格和数量 0.001
     - expect: 价格和数量匹配（或记录警告）

#### 1.4. 验证隐藏订单 checkbox 可正常勾选

**File:** `tests/cases/future-limit-order.spec.ts`

**Steps:**
  1. 导航至 EXCHANGE_URL，切换到限价单
     - expect: 限价单模式激活
  2. 查找隐藏订单选项（隐藏订单/Hidden Order/Hidden）
     - expect: 找到隐藏订单选项；若未找到则跳过
  3. 点击隐藏订单 label，验证 checkbox 状态切换
     - expect: checkbox 状态发生变化

#### 1.5. 验证只减仓 checkbox 可正常勾选

**File:** `tests/cases/future-limit-order.spec.ts`

**Steps:**
  1. 查找只减仓选项（只减仓/Reduce Only/Reduce-only）
     - expect: 找到只减仓选项；若未找到则跳过
  2. 点击只减仓选项
     - expect: 点击成功，截图保存

#### 1.6. 改单：修改价格成功，无变化时提示不用修改，最后取消所有订单

**File:** `tests/cases/future-limit-order.spec.ts`

**Steps:**
  1. 导航至 EXCHANGE_URL，清除前序测试遗留的 localStorage 表单状态，重新加载页面
     - expect: 页面正常加载
  2. 读取标记价格，计算挂单价格 = floor(markPrice - 5000)
     - expect: 标记价格可见且为有效数值
  3. 选择限价单，填入价格和数量 0.001 BTC，点击买入/做多按钮并处理确认弹窗
     - expect: 下单成功 Toast 出现，或当前委托 Tab 计数大于 0
  4. 第一次改单：点击编辑按钮，读取预填价格并修改为当前价格 - 1，提交并处理确认弹窗
     - expect: 改单成功 Toast 出现（修改成功/改单成功/Order modified）
  5. 第二次改单：切换当前委托 Tab，点击编辑，价格再次 - 1，提交
     - expect: 改单成功 Toast 出现
  6. 第三次改单：切换当前委托 Tab，点击编辑，价格再次 - 1，提交
     - expect: 改单成功 Toast 出现
  7. 第四次：点击编辑后不修改价格，直接点保存
     - expect: 出现"不用修改/无需修改/No changes"相关 Toast（soft 断言）
  8. 取消所有订单（优先点「全部取消」按钮，否则逐个取消，最多 5 个）
     - expect: 所有订单被取消