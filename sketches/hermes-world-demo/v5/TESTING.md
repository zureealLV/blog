# V5 验收记录 — 2026-11-07（Asia/Shanghai）

后续交付说明：本记录描述本地实现验收时的状态。验收完成后，Lv 另行明确要求将 V5 源码提交并推送至 `master`。这会触发现有博客部署工作流，但 Demo 仍位于 sketches/，未加入生产路由。下文“未提交/推送/部署”指原始本地验收阶段。

## 环境与边界

- 实际执行环境：Windows，Node.js **24.15.0**，Corepack pnpm **9.14.4**，Three.js **0.180.0**，Playwright **1.56.1**。
- 浏览器：本机 Microsoft Edge/Chromium **156.0.4314.58**，headless，真实 WebGL 页面渲染；移动端是视口模拟，不是真机 Safari 验证。
- 初始与最终根仓库状态均为 `master...origin/master`，只有既有未跟踪 `sketches/`；`git diff --name-only` 无生产文件变动。没有 commit/push/publish/部署。
- 只在 `D:/blog/Firefly_zureeallv/sketches/hermes-world-demo/v5/` 实现；V1–V4 未改。角色与 WOFF 直接复制保留。
- 不运行生产 Astro build/check：此 Demo 不属于 Astro 的 src/public，不更改生产路由或依赖。不能将本记录当成生产集成或 Swup 验收。

## 可重复命令

```powershell
Set-Location 'D:/blog/Firefly_zureeallv/sketches/hermes-world-demo/v5'
corepack pnpm test
node tests/browser.mjs
node tests/live-browser.mjs
corepack pnpm run index
```

普通浏览器验收使用正在运行的 8767 服务；热更新验收在 **8769** 自动创建并关闭临时 fixture 服务，正式文章目录完全不写入。测试完成后只清理通过绝对路径前缀验证的临时 fixture 文件夹。

## 结果

### 4 组 Node 索引测试通过

1. 当前覆盖、正文分离、Hermes 跨主题、正式 URL 适配器漂移检查。
2. Unicode/嵌套 index/显式 slug、draft/password 排除、脚本/危险链接清理、简介源文本优先。
3. 隔离新增/修改/删除、旧节点 XYZ 稳定、手工主题纠正。
4. 真正定时 watcher 响应修改/删除/转私密与语法错误 fail-closed，不重启。

当前扫描为 **194/194**，原分类 Hermes 150 / 随笔 36 / 技术 8；草稿 0、加密 0。不是沿用 V4 的 15 篇样本。

### 32 项普通浏览器检查通过

详见 `browser-test-report.json`：

- 首屏无全文请求、无外部网络素材、无被禁止的装饰文案。
- 实际点击主题和星点，相机 target 与 distance 改变；不是 CSS scale。
- 简介、按需全文、阅读器关闭保持原视角、返回恢复主题视角。
- 键盘节点选择、画布 Enter、搜索无结果、原分类筛选、筛选保留。
- 连续选择替换镜头、刷新恢复选择/筛选及**已完成**的相机位置。
- 静态模式、系统减少动态、用户低性能列表、模拟 WebGL 不可用均可搜索全部文章。
- 1920×1080（16:9）、1440×900（16:10）、2560×1080（超宽）、390×844、360×740：视口满铺、无横向溢出、竖屏高于宽、人物图集单帧正方形无拉伸，工具入口在视口内。
- 浏览器 pageerror 与 console error 为 0。

### 7 项热更新端到端检查通过

详见 `live-test-report.json`。临时真实源文件 → 实际 watcher → HTTP index/body API → 浏览器自动刷新，全链路验证：

1. 新文章无需重启或刷新页面出现。
2. 新增后既有 XYZ 不变。
3. 修改文章，已打开阅读器的标题与正文随之更新。
4. 删除选中文章，星点与阅读器陈旧内容撤下。
5. 公开转加密后元数据移除。
6. 未变化索引返回 304 无正文，避免每两秒重复传输全索引。
7. 静态白名单拒绝读取服务端源文件。

## 真实性能记录

星点已合并为单批 Points 渲染，六个主题轨道与最多三条关系线另绘制。只在 resize、交互或镜头移动时请求帧，待机不持续重绘；限制像素比到 1.5。最新版一轮浏览器运行末段 **180 样本平均 JS 渲染提交耗时约 0.23 ms，动画帧间隔约 5.72 ms**；该焦点视角 draw calls 为 4。具体数值以 JSON 最新一次结果为准。

这些是本机 headless 环境的观测，**不等于 GPU 完成时间、不等于真机 FPS、更不保证 60 FPS**。未做多 GPU/低端手机的广泛基准；提供列表降级与减少动态选项。

## 真实截图

- `preview-room.png`：1440×900 默认全景。
- `preview-sector.png`：进入主题，渐显少量文章标题。
- `preview-focus.png`：实际点选节点后简介。
- `preview-mobile.png`：390×844 手机重新排布。
- `preview-mobile-focus.png`：手机聚焦与简介。
- `preview-16x9.png`、`preview-ultrawide.png`、`preview-mobile-small.png`：补充尺寸。

这些来自 Playwright 的浏览器截图，不是生图工具生成的 UI。背景原图只作为场景素材，星点、镜头、控件和文字均实时渲染。

## 视觉自审

主表面：Explore，非仪表盘/营销页。按 claude-design 的 10 项反模板检查，本次自评 **0/10**：无默认蓝紫渐变、等权功能卡、装饰统计或中央 hero；玻璃仅服务人物光学舱与有深度关系的简介层；中文正文字体为可读性有意选用微软雅黑，像素字体仅短对白。此项是设计自审，不替代 Lv 的审美验收。

## 仍有限制

房间本体是二维背景、星图是真实 3D；主题是关键词规则且不均分；人物是四帧表情；阅读器不执行复杂 MDX/图示/图片插件；两篇媒体型短文不凑 60 字简介；授权与生产集成均未验收。详见 README_CN.md / INDEX.md / PROMPTS.md。
