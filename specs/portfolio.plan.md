# AsterDEX Portfolio 页面

## Application Overview

AsterDEX 投资组合页面（/zh-CN/portfolio/pro）的功能测试，验证页面加载、资产概览数据显示、资产 Tab 切换（期货/现货/资金账户/统计）、总资产 USDT 数值显示正常（非空非 NaN）。测试使用已登录的 MetaMask 钱包 fixture（loggedInPage）。

## Test Scenarios

### 1. AsterDEX - Portfolio 页面

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. Portfolio 页面可正常加载

**File:** `tests/cases/portfolio.spec.ts`

**Steps:**
  1. 导航至 /zh-CN/portfolio/pro，等待 domcontentloaded 后再等待 3 秒
     - expect: 页面标题不为空

#### 1.2. 验证资产概览数据正常显示

**File:** `tests/cases/portfolio.spec.ts`

**Steps:**
  1. 查找总资产/账户余额相关元素（总资产/账户余额/Total Balance/Total Assets/Portfolio Value 等关键词）
     - expect: 找到至少一个资产元素；若未找到记录警告
  2. 验证无加载错误（404/500/Error）
     - expect: 无错误页

#### 1.3. 切换资产 Tab 页

**File:** `tests/cases/portfolio.spec.ts`

**Steps:**
  1. 查找并点击资产 Tab（期货/现货/Futures/Spot/资金账户/统计 等），等待 1 秒
     - expect: 找到可见 Tab 并点击；若未找到记录警告

#### 1.4. 总资产 USDT 数值显示正常（非空非NaN）

**File:** `tests/cases/portfolio.spec.ts`

**Steps:**
  1. 查找总资产数值元素（匹配 /\\d+\\.?\\d*\\s*USDT/ / /$\\d+/ / data-testid*="total" 等）
     - expect: 找到非空非 NaN 的数值；若未找到记录警告