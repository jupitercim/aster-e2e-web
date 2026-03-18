# AsterDEX 期货止盈止损功能测试

## Application Overview

AsterDEX 期货交易页面（BTC/USDT）止盈止损功能测试。测试通过市价单建立多头仓位，然后对该仓位设置、修改、撤销止盈止损，最后市价平仓清理。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage），直接导航至合约交易页面。

## Test Scenarios

### 1. AsterDEX - 期货止盈止损

**File:** `tests/cases/future-other-order.spec.ts`

---

#### 1.1. 市价开多建立仓位（止盈止损测试准备）

**Steps:**
  1. 导航至合约交易页面（EXCHANGE_URL），等待 domcontentloaded 后等待 3 秒
  2. 读取当前标记价格（Mark Price）
     - expect: markPrice > 0
  3. 选择「市价」订单类型
  4. 选择数量单位为 BTC
  5. 输入数量 0.001
  6. 点击「买入/做多」提交按钮
  7. 处理「订单确认」弹窗（点击确认）
     - expect: 检测到「下单成功 / 委托成功」Toast
  8. 切换到「仓位」Tab，等待 2 秒
     - expect: BTCUSDT 仓位行可见，仓位数 >= 1
  9. 截图保存

---

#### 1.2. 对仓位设置止盈止损

**Steps:**
  1. 确认仍在「仓位」Tab
  2. 在仓位行找到「止盈止损」按钮（selector: `button:has-text("止盈止损")` 或仓位行内的 TP/SL 图标），点击
     - expect: 止盈止损设置弹窗/面板出现（包含触发价输入框）
  3. 输入止盈触发价 = markPrice * 1.02（上涨 2%，取整）
     - selector: `input[placeholder*="止盈"], input[placeholder*="触发价"], input[placeholder*="Take Profit"]`
  4. 输入止损触发价 = markPrice * 0.98（下跌 2%，取整）
     - selector: `input[placeholder*="止损"], input[placeholder*="Stop Loss"]`
  5. 点击确认按钮（selector: `button:has-text("确认"), button:has-text("Confirm")`）
  6. 处理可能出现的二次确认弹窗
     - expect: 检测到「设置成功 / 修改成功」Toast，或弹窗关闭
  7. 验证仓位行显示 TP 价格和 SL 价格（可通过 `text=/\d+(\.\d+)?/` 在仓位行附近检测）
  8. 截图保存

---

#### 1.3. 修改止盈止损价格

**Steps:**
  1. 确认仍在「仓位」Tab
  2. 再次点击仓位行的「止盈止损」按钮打开设置弹窗
     - expect: 弹窗出现，原有 TP/SL 价格已填入（或输入框可编辑）
  3. 清空止盈触发价，重新填入 markPrice * 1.03（上涨 3%）
  4. 清空止损触发价，重新填入 markPrice * 0.97（下跌 3%）
  5. 点击确认
     - expect: 检测到「修改成功 / 设置成功」Toast，或弹窗关闭
  6. 截图保存

---

#### 1.4. 撤销止盈止损

**Steps:**
  1. 确认仍在「仓位」Tab
  2. 点击仓位行的「止盈止损」按钮打开设置弹窗
  3. 清空止盈触发价输入框（填入空或点击清除按钮）
  4. 清空止损触发价输入框
  5. 点击确认
     - expect: 检测到「撤销成功 / 已取消 / 修改成功」Toast，或弹窗关闭
     - expect: 仓位行不再显示 TP/SL 价格，或显示 "--"
  6. 截图保存

---

#### 1.5. 市价平仓（清理仓位）

**Steps:**
  1. 确认仍在「仓位」Tab，读取当前仓位数量
     - expect: 仓位数 >= 1
  2. 点击仓位行的「市价」平仓按钮（selector: `button:text("市价")` 最后一个）
  3. 确认平仓弹窗
     - expect: 使用 expect.poll 轮询（最长 15 秒），仓位数量减少
  4. 截图保存