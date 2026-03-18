# AsterDEX H5 页面兼容测试

## Application Overview

AsterDEX 移动端（H5）页面兼容性测试，覆盖移动端（390px iPhone 14）和平板（768px iPad）视口下各主要页面的加载与功能验证，包括：主页、合约交易页、现货页、Shield 页、1001x 页、空投页、奖励页、投资组合页、推荐页、火箭发射页、Earn 页、USDF 页、API 管理页，以及限价挂单/取消委托和导航菜单。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - H5 页面兼容测试

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 移动端视口（390px）主页可正常加载

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 /zh-CN，等待 domcontentloaded 后再等待 2 秒
     - expect: 页面标题不为空

#### 1.2. 移动端视口合约交易页可正常加载

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 EXCHANGE_URL，等待限价/市价按钮出现
     - expect: 至少一个交易元素（限价/市价/数量输入框）可见

#### 1.3. 平板视口（768px）页面布局正常

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 768×1024，导航至 EXCHANGE_URL，等待限价/市价按钮出现
     - expect: 页面标题不为空

#### 1.4. 恢复桌面视口（1440px）验证正常

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 1440×900，等待限价按钮或标记价格 dt 出现
     - expect: 桌面布局专有元素（标记价格/指数价格/#tour-guide-place-order）至少一个可见，且页面标题不为空

#### 1.5. H5 移动端各子页面内容存在

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至首页，查找「去中心化/ASTER/总交易量」等关键词
     - expect: 首页找到至少一个内容关键词
  2. 尝试打开汉堡菜单，点击行情入口，验证行情页内容（BTC/ETH/24h 等）
     - expect: 行情页找到至少一个内容关键词（或记录警告）
  3. 导航至 EXCHANGE_URL，查找限价/市价/BTC/开多/开空 等关键词
     - expect: 交易页找到至少一个内容关键词
  4. 点击资产 Tab，查找 USDT/余额/可用 等关键词
     - expect: 资产 Tab 找到至少一个内容关键词（或跳过）
  5. 点击当前委托 Tab，查找当前委托/BTCUSDT/取消 等关键词
     - expect: 委托 Tab 找到至少一个内容关键词（或跳过）
  6. 最终验证至少 3 个子页面找到内容
     - expect: successCount >= 3

#### 1.6. H5 移动端限价挂单 BTC/USDT 0.001 BTC

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 EXCHANGE_URL，等待买入/做多或开多按钮出现
     - expect: 核心元素出现
  2. 若当前为市价模式，切换到限价模式（点击市价按钮 → 选择限价选项）
     - expect: 价格输入框出现；切换失败则抛出错误
  3. 读取当前价格（多种方式：标记价格/点击输入框自动填充/从页面文字提取）
     - expect: 成功读取大于 0 的价格值；否则抛出错误
  4. 计算限价 = floor(markPrice - 1000)，填入价格和数量 0.001 BTC
     - expect: 输入框填入成功
  5. 点击买入/做多，处理确认弹窗，检测下单成功 Toast（6 秒）
     - expect: Toast 出现（或记录警告）
  6. 切换到当前委托 Tab，验证 BTCUSDT 订单出现
     - expect: BTCUSDT 文本可见（等待最长 5 秒）

#### 1.7. H5 移动端取消刚才的限价委托单

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 切换到当前委托 Tab，记录取消前委托数量
     - expect: 当前委托 Tab 激活
  2. 点击第一个取消按钮，确认取消弹窗
     - expect: 取消按钮可见；若无订单则跳过
  3. 检测取消成功 Toast（6 秒），轮询等待委托数量减少（最长 15 秒）
     - expect: 委托数量小于取消前的数量

#### 1.8. H5 移动端导航菜单可正常打开并展示各入口

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 /zh-CN，点击「Toggle Menu」按钮
     - expect: Toggle Menu 按钮可见，点击后 Close Menu 按钮出现
  2. 验证导航菜单项可见（空投/Shield/投资组合/推荐/奖励/火箭发射/更多）
     - expect: 至少 3 个菜单项可见
  3. 点击「更多」子菜单展开
     - expect: 更多子菜单被展开

#### 1.9. H5 移动端现货交易页可正常加载

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 ETHUSDT 现货页，等待买入/卖出按钮出现
     - expect: ETH 交易对标识可见，买入或卖出按钮至少一个可见
  2. 点击当前委托 Tab（若可见），等待 800ms
     - expect: 委托 Tab 激活（或跳过）

#### 1.10. H5 移动端 Shield 交易页可正常加载

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 Shield BTCUSDT 页，等待做多/做空按钮出现
     - expect: BTCUSDT 交易对标识可见，做多或做空按钮至少一个可见
  2. 验证 Chart/Data Tab 可见，滚动到底部查看仓位 Tab
     - expect: Tab 可见（或记录警告）

#### 1.11. H5 移动端 1001x 页面可正常加载

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 1001x BTCUSD 页，等待「看涨」label 出现
     - expect: BTCUSD 交易对标识可见
  2. 验证看涨/看跌 label 至少一个可见
     - expect: 看涨或看跌可见
  3. 验证 Degen 杠杆标签和图表 Tab 可见（记录警告）
     - expect: 页面无崩溃

#### 1.12. H5 移动端空投页面模块完整

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 /zh-CN/airdrop，等待「空投」文本出现
     - expect: 页面标题（Aster空投 heading）可见
  2. 验证阶段按钮可见，滚动到底部查看 FAQ
     - expect: 阶段按钮可见（或记录），FAQ 区域可见（或记录）
  3. 点击第一个 FAQ 条目（ASTER 代币是什么）
     - expect: FAQ 可点击展开

#### 1.13. H5 移动端奖励页面模块完整

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 /zh-CN/trade-and-earn，等待「USDF」文本出现
     - expect: USDF 或 asBNB Tab 可见
  2. 验证 APY 数字、铸造/兑换子 Tab 可见
     - expect: 相关元素可见（或记录）
  3. 滚动到底部，验证「如何参与」区域可见
     - expect: 区域可见（或记录）

#### 1.14. H5 移动端投资组合页面模块完整

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 /zh-CN/portfolio/pro，等待「投资组合」文本出现
     - expect: 投资组合 heading 可见
  2. 验证存款/提现/转账按钮至少一个可见
     - expect: 操作按钮 >= 1 个
  3. 验证总价值和盈亏区域可见
     - expect: 总价值可见，盈亏可见（或记录）
  4. 滚动查看日历/图表区域
     - expect: 页面无崩溃

#### 1.15. H5 移动端推荐页面模块完整

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 /zh-CN/referral，等待「邀请朋友」文本出现
     - expect: 邀请朋友 heading 可见
  2. 验证返利比例（10%）、推荐规则链接、立即邀请区块可见
     - expect: 立即邀请可见（必须），其余记录
  3. 验证邀请总览区块可见（或记录）
     - expect: 区块可见（或记录）

#### 1.16. H5 移动端火箭发射页面模块完整

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 /zh-CN/rocket-launch（networkidle），等待「火箭发射」heading 出现
     - expect: 火箭发射 heading 可见（等待最长 10 秒）
  2. 验证副标题、火箭发射/Trade Arena Tab、全部/进行中过滤 Tab 可见（记录）
     - expect: 相关元素可见（或记录）

#### 1.17. H5 移动端 Earn 页面模块完整

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 /zh-CN/earn，等待「asBTC」文本出现
     - expect: 赚取/生态系统 Tab 可见（或记录），策略标题可见
  2. 验证 asBTC/asCAKE/ALP/asUSDF/asBNB 策略卡片至少 2 个可见
     - expect: 策略卡片 >= 2 个
  3. 验证 TVL 数据可见（或记录）
     - expect: TVL 可见（或记录）

#### 1.18. H5 移动端 USDF 页面模块完整

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 /zh-CN/usdf，等待「USDF」文本出现
     - expect: USDF heading 可见
  2. 验证铸造/兑换/请求/领取 Tab 至少 2 个可见
     - expect: Tab 数量 >= 2
  3. 验证 APY 数据可见，滚动到底部查看统计数据
     - expect: APY 可见（或记录）

#### 1.19. H5 移动端 API 管理页面可正常加载

**File:** `tests/cases/h5-auto.spec.ts`

**Steps:**
  1. 设置视口为 390×844，导航至 /zh-CN/api-management，等待创建 API 按钮出现
     - expect: API 管理 heading 可见
  2. 验证 API/专业API Tab 可见，创建 API 按钮可见
     - expect: 创建 API 按钮可见（必须断言）