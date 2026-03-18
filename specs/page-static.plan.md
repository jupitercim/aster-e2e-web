# 全站页面视觉检查

## Application Overview

全站页面视觉检查，通过 PageDiscovery 工具从 pages.config.ts 配置的一级页面出发自动发现二级页面，然后使用 VisualChecker 对每个页面执行视觉规则检查（如内容非空、无 JS 错误、无明显异常等），汇总输出各页面的通过/警告/失败状态。测试使用 Playwright 标准 fixture（page/context），无需登录。

## Test Scenarios

### 1. 全站页面视觉检查

**Seed:** `tests/cases/seed.spec.ts`

#### 1.1. 全站视觉检查

**File:** `tests/cases/page-static.spec.ts`

**Steps:**
  1. 验证请求头：导航至 BASE_URL，捕获第一个同域请求，记录关键请求头（k8scluster 等）到测试 annotations
     - expect: 捕获到请求（或记录未捕获到）
  2. 发现页面：使用 PageDiscovery 从一级页面列表（pages.config.ts 中的 LEVEL1_PAGES）发现所有一级和二级页面
     - expect: 发现页面列表记录到控制台
  3. 逐页视觉检查：对每个发现的页面使用 VisualChecker.run() 执行视觉规则检查
     - expect: 每个页面的检查结果（通过/警告/失败）记录到控制台
  4. 对所有失败级别（error）的检查项记录 expect.soft 软断言失败
     - expect: 所有页面所有检查项无 error 级别失败
  5. 汇总输出：显示扫描页面列表（一级/二级）、检查结果统计（完全通过/存在失败/存在警告）、失败页面列表
     - expect: 汇总报告输出到控制台