# 记忆房间：生产接入与验收

生产入口：`https://zureeallv.com/memory-room/`。原 `/hermes/` 文章列表保留；主导航和 Hermes 页均新增入口。

## 数据与部署边界

- `src/pages/memory-room/index.astro` 是独立全页，不加载博客布局。Swup 对该路径执行完整导航，避免页面模块未启动或旧布局残留。
- `src/utils/memory-room.ts` 在 Astro 构建时读取正式 `posts` Collection，复用真实文章 ID 与 URL 工具。草稿和带密码文章一律排除，包括开发模式。
- `/memory-room/data/index.json` 只包含标题、摘要、分类、主题证据和稳定 XYZ 坐标等元数据，不包含全文。
- `/memory-room/data/body/<key>.json` 是逐篇生成的经安全清理的基本 Markdown HTML，在点击阅读时才请求。它不是完整 Astro Markdown/MDX 渲染：不含图片、复杂图表、执行脚本；原文按钮返回完整文章。
- 关键词加权规则在 `src/utils/memory-room-topics.ts`。位置由文章 ID 和主题确定；不按文章数量重新排队。关联线最多 3 条，不是向量数据库或语义理解服务。
- 每次正式构建自动纳入新增文章、移除删除文章；不是线上实时监听本地文件。已经打开的标签页重新显示时会检查索引。
- `siteConfig.pages.memoryRoom` 控制入口与路由。数据路由不进入 sitemap。

## 客户端与素材

- `public/memory-room/` 是独立运行资源。Three.js **0.180.0** 官方 ESM 固定随站部署，附 MIT LICENSE；无需 CDN 或本地 API 服务。
- Three.js 透视相机与 XYZ 星点是真正三维，房间背景是二维插画。镜头可中断、搜索/筛选、正文返回原位、会话恢复、键盘、减少动态效果和无 WebGL 列表均保留。
- 四帧人物图不是 Live2D 或在线 AI。素材来源和范围见 `public/memory-room/NOTICE.md`。不重新分发原型的 Zpix 字体。
- `sketches/hermes-world-demo/v5/` 保留原始本地 Demo，不作为生产目录。其源码 push 并不等于上线；生产需要上述 Astro 路由与公开资源完成构建部署。

## 本地验证

仓库根目录使用 pnpm 9.14.4：

```powershell
corepack pnpm check
corepack pnpm exec biome ci ./src
corepack pnpm build
```

生产回归测试使用保留的 V5 隔离测试依赖，不改变根项目依赖：

```powershell
corepack pnpm --dir sketches/hermes-world-demo/v5 install --frozen-lockfile
# 单独终端启动静态产物（不能用 V5 本地 API 代替）
py -3 -m http.server 8768 --bind 127.0.0.1 --directory dist
# 已安装 Microsoft Edge；可用 MEMORY_ROOM_BASE_URL 覆盖本地测试地址
node scripts/test-memory-room.mjs
```

脚本检查构建索引与所有公开文章数量一致、每个原文路由存在、正文懒加载、sitemap、故事文章标签与字数；随后检查真实星点点击、相机聚焦、读后返回、搜索/过滤、重载、五种尺寸、键盘、降级、减少动态效果和跨页面/历史导航。截图与报告仅写入系统临时目录 `memory-room-production-qa`。

本地 build 与完整 Cloudflare 流水线不同：部署还会优化图库和刷新 osu! 数据。完成发布必须继续检查 GitHub Actions 的部署结果及实际公网页面，不能只凭 push 成功宣称上线。

## 2026-11-07 本地验收

- Node.js 24.15.0 / pnpm 9.14.4 / Microsoft Edge 156.0.4314.58；CI 仍按仓库既定 Node 22/23 执行。
- Astro check：0 errors、0 warnings，原有 404 页面未使用导入提示保留。
- Biome src：0 errors；原有 2 warnings、1 info 保留，不批量格式化。
- 完整 build 成功；Bangumi 外部请求超时由既有逻辑处理，并非本页面数据请求。
- 195 篇公开文章的索引、正文、原文路径通过静态产物检查。故事正文 3366 个中文字符。
- 39 项浏览器回归通过；独立房间无运行时/控制台错误。原博客已有字体 CSP、评论服务连接等诊断单独记录，不冒充全站零告警。
- 发现并修正集成选项边界：`@swup/astro` 的配置名是 `ignore`，不是直接传 `ignoreVisit`。验收明确禁止依靠容器不匹配后的强制刷新伪装正常入口。
- 独立代码复核及针对 Swup 修复的复核均通过。
