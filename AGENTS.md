# AGENTS.md — zureeallv.com 博客仓库协作指南

本文件适用于整个仓库。进入子目录工作时，如存在更深层的 `AGENTS.md`，以更深层文件为准。

## 1. 项目定位

- 这是 Lv 的个人博客 [zureeallv.com](https://zureeallv.com)，基于 Firefly 主题深度定制。
- 内容主题包括：osu!、个人随笔与诗歌、精神分析/哲学、技术文章、复古与视觉小说，以及 Hermes 的独立 AI 随笔板块。
- 当前部署目标是 Cloudflare Pages 项目 `firefly`，生产分支为 `master`。
- 站点语言为简体中文，时区固定为 `Asia/Shanghai`。
- 保留项目已有的赛博、PC-98、vaporwave、osu! 与 Hermes 视觉气质；不要把界面改成通用企业模板。

## 2. 技术栈与工具链

- Astro `6.3.1`，静态输出与文件路由。
- Svelte `5.55.5`，只用于需要客户端状态或复杂交互的岛组件。
- Tailwind CSS `4.2.4`（通过 Vite 插件加载）。
- TypeScript `5.9.2`，模块解析为 `bundler`。
- pnpm `9.14.4`；仓库通过 `only-allow pnpm` 禁止混用 npm/yarn。
- Node.js `22` 是部署环境；CI 额外在 Node.js `23` 上检查兼容性。
- Biome 负责格式化和 lint；源码默认使用 Tab、双引号。
- Pagefind 在完整构建后为 `dist/` 生成静态搜索索引。

不要提交 `package-lock.json`、`yarn.lock` 或 `bun.lockb`。依赖变更应使用 pnpm，并同步更新 `pnpm-lock.yaml`。

## 3. 目录与架构

```text
.
├─ src/
│  ├─ assets/                 # 由 Astro 处理和优化的图片
│  ├─ components/
│  │  ├─ analytics/          # 分析平台集成
│  │  ├─ comment/            # Twikoo/Waline/Giscus 等评论适配
│  │  ├─ common/             # 通用展示组件
│  │  ├─ controls/           # 搜索、主题、布局、壁纸等交互控件
│  │  ├─ features/           # 音乐、KaTeX、Fancybox、看板娘、特效
│  │  ├─ layout/             # 导航、侧栏、文章卡片和文章列表
│  │  ├─ misc/               # 许可证、推荐文章、分享海报
│  │  ├─ pages/              # 页面专属组件
│  │  └─ widget/             # 侧栏小组件
│  ├─ config/                # 站点功能与视觉配置
│  ├─ constants/             # 常量及图标数据
│  ├─ content/
│  │  ├─ posts/              # 正式文章 Markdown/MDX
│  │  └─ spec/               # About/Friends/Guestbook 等内容片段
│  ├─ i18n/                  # 多语言键与翻译
│  ├─ layouts/               # 全局 Layout 与主网格布局
│  ├─ pages/                 # Astro 文件路由
│  ├─ plugins/               # Remark/Rehype 插件
│  ├─ styles/                # 全局 CSS/Stylus
│  ├─ types/                 # 配置与业务类型
│  └─ utils/                 # 内容、图片、URL、布局等工具
├─ public/                   # 原样复制的静态文件和独立页面
├─ scripts/                  # 构建、图标、图库、osu! 数据和内容辅助脚本
├─ staging/                  # 本地 Hermes 草稿池；被 Git 忽略
├─ .github/workflows/        # 检查、构建、Cloudflare Pages 部署
├─ astro.config.mjs          # Astro/Markdown/Swup/Vite 总配置
├─ publish_today.py          # 每日文章发布、提交、推送脚本
└─ package.json              # 命令与精确工具链入口
```

### 核心数据流

1. `src/content.config.ts` 用 Astro Content Collections 定义 `posts` 与 `spec`。
2. `src/utils/content-utils.ts` 读取文章、在生产环境过滤草稿、排序，并补充上一篇/下一篇和相关文章。
3. `src/pages/[...page].astro` 生成首页分页；`src/pages/posts/[...slug].astro` 生成文章详情页。
4. `src/pages/hermes/[...page].astro` 只筛选包含精确标签 `Hermes` 的文章。
5. 页面经 `src/layouts/MainGridLayout.astro` 组合横幅、导航、左右侧栏、正文、浮动控件和全局特效。
6. `astro.config.mjs` 串接 Remark/Rehype、KaTeX、Mermaid、PlantUML、Expressive Code、Svelte、Sitemap 与 Swup。

`MainGridLayout.astro` 是体积较大的核心集成点。修改前先确认功能能否放入已有 config、utility 或专用组件，避免继续把无关逻辑堆进布局文件。

## 4. 配置约定

- 配置统一放在 `src/config/`，类型统一放在 `src/types/config.ts`。
- 新配置需要从 `src/config/index.ts` 导出；组件优先从 `@/config` 聚合入口导入。
- 站点标题、URL、语言、主题色、页面开关、分页与文章列表布局在 `src/config/siteConfig.ts`。
- 导航菜单在 `src/config/navBarConfig.ts`；个人资料在 `profileConfig.ts`；侧栏组件顺序在 `sidebarConfig.ts`。
- 壁纸、音乐、评论、相册、友链、页脚、特效与看板娘均已有独立配置文件，先复用现有配置模型。
- 路径别名见 `tsconfig.json`：`@/*`、`@components/*`、`@assets/*`、`@constants/*`、`@utils/*`、`@i18n/*`、`@layouts/*`。
- 不要把 token、OAuth secret 或 Cloudflare API token 写入源码。`OSU_CLIENT_SECRET` 与 `CF_PAGES_API_TOKEN` 只来自 GitHub Secrets/环境变量。

## 5. 页面、组件与客户端行为

- 简单静态页面优先使用 `.astro`；确实需要客户端状态时才使用 `.svelte`，并选择尽可能轻的 `client:*` 指令。
- 通用 UI 放 `components/common/`，全局功能放 `components/features/`，页面专属功能放 `components/pages/`。
- 新页面放入 `src/pages/` 后会自动成为路由；页面开关需同时考虑 `siteConfig.pages` 与 sitemap 过滤。
- `public/ascii/index.html` 和 `public/osu-pp-tool/index.html` 是不使用博客布局的独立静态体验页，不要强行套入 `MainGridLayout`。
- `astro.config.mjs` 明确让 Swup 忽略 `/ascii/` 与 `/osu-pp-tool/`。新增独立全页应用时，也要评估是否应加入 `ignoreVisit`。
- 博客使用 Swup 局部导航。客户端脚本不能只假设首次 `DOMContentLoaded`；修改交互时同时验证首次加载、站内跳转、前进/后退和重复进入页面。
- 需要在 Swup 导航后重新执行的外链脚本，沿用项目已有的 `data-swup-reload-script` 模式。
- 全局 CSS 放 `src/styles/`；页面局部样式优先放在对应 Astro/Svelte 文件中，避免污染全站。
- 图标优先使用已安装的 Iconify 集合，不要为一个图标额外引入整套 UI 库。

## 6. 文章内容模型

正式文章位于 `src/content/posts/`。最小 frontmatter：

```yaml
---
title: "文章标题"
published: 2026-07-22
description: "文章摘要"
tags: [随笔]
category: 随笔
draft: false
image: ./images/example.jpg
---
```

`src/content.config.ts` 中的完整字段约定：

- 必填：`title`、`published`。
- 常用可选：`updated`、`draft`、`description`、`image`、`tags`、`category`、`lang`、`pinned`、`author`、`comment`。
- 授权/来源：`sourceLink`、`licenseName`、`licenseUrl`。
- 加密文章：`password`、`passwordHint`。
- `prevTitle`、`prevSlug`、`nextTitle`、`nextSlug` 是内部计算字段，不要在文章里手工维护。

内容规则：

- 日期使用 `YYYY-MM-DD`；站点以 `Asia/Shanghai` 为准。
- 生产构建会排除 `draft: true`，开发模式会显示草稿。
- 与文章同目录的图片放 `src/content/posts/images/`，文章内用 `./images/...` 引用。
- 需要 Astro 优化的站点图片放 `src/assets/`；无需处理且必须保持原路径的资源放 `public/`，并用 `/...` 绝对站点路径引用。
- 文件名和标题允许中文。PowerShell/Git 操作中文路径时始终用引号和 `-LiteralPath`。
- 摘要可由 `description` 提供；缺省时文章卡片会使用 Remark 生成的 excerpt。
- Markdown 管线已支持数学公式、callout、代码高亮、Mermaid、PlantUML、图片网格与 GitHub 卡片；新增语法前先检查现有插件。

### Hermes 板块的硬性约定

- Hermes 文章使用且只使用标签 `tags: [Hermes]`，分类为 `category: Hermes`。
- 不给 Hermes 文章混入“随笔”“哲学”“AI”等其他标签；`/hermes/` 依赖精确的 `Hermes` 标签筛选。
- Hermes 文章从 Hermes 第一人称视角叙述，默认中文，保持傲娇、机敏、略毒舌但关心 Lv 的人格。
- 新的 Hermes 正文不少于 2000 个中文字符，除非 Lv 明确要求短文。
- 这些规则只约束 Hermes 文章，不要批量修改 Lv 自己的随笔或技术文章标签。

## 7. 本地每日发布流水线

`staging/` 是被 `.gitignore` 排除的本地草稿池，不属于仓库历史：

- `staging/posts/` 保存 `draft: true` 的预生成 Hermes 文章。
- `staging/images/` 保存以 `hermes-YYYYMMDD.jpg` 命名的对应封面。
- `publish_today.py` 按当天 `published` 查找 `update-*.md`，复制到正式文章目录，将 `draft: true` 改为 `false`，复制封面，然后执行 `git pull --rebase --autostash`、`git add`、`git commit` 和 `git push`。
- `发布今日文章.bat` 是 Windows 双击入口。

不要为了普通内容编辑运行 `publish_today.py`。它具有网络、提交和推送副作用，只有 Lv 明确要求“发布今日文章”时才运行。发布前应确认日期、文章、封面和当前 Git 工作区，不得顺带提交无关修改。

## 8. 构建、检查与常用命令

在仓库根目录执行：

```powershell
pnpm install              # 安装依赖
pnpm dev                  # Astro 开发服务器
pnpm check                # Astro 类型和内容检查
pnpm type-check           # 纯 TypeScript 检查
pnpm build                # 生成图标 + Astro 构建 + Pagefind 索引
pnpm preview              # 预览 dist/
pnpm exec biome ci ./src  # 与 CI 接近的只读代码质量检查
pnpm format               # 写入式格式化，仅在确实需要时使用
pnpm lint                 # 写入式 Biome 修复，仅在确实需要时使用
```

验证原则：

- 只改 Markdown：至少运行 `pnpm check`；涉及 Markdown 插件、图片解析或路由时再运行 `pnpm build`。
- 改 Astro/Svelte/TypeScript：运行 `pnpm check` 和针对 `src` 的 Biome 检查。
- 改构建配置、插件、依赖、静态路由或部署流程：运行完整 `pnpm build`。
- 改 Swup/音乐/主题/搜索等浏览器交互：除构建外，手工验证首次加载与站内导航后的行为。
- `dist/`、`.astro/`、`.wrangler/`、`node_modules/`、`__pycache__/` 都是生成或缓存目录，不要编辑或提交。

完整 Cloudflare 部署还会在 GitHub Actions 中：

1. 使用 pnpm `9.14.4` 安装依赖；
2. 运行 `scripts/optimize-gallery.mjs`；
3. 使用 `scripts/fetch-osu-stats.sh` 更新 `public/osu-stats.json`；
4. 执行 `pnpm run build`；
5. 将 `dist/` 部署到 Cloudflare Pages 项目 `firefly`。

本地 `pnpm build` 不会自动执行图库优化或在线抓取 osu! 数据，不要把本地构建与完整部署流水线混为一谈。

## 9. CI/CD 与故障处理

- `.github/workflows/build.yml` 在 Node.js 22/23 上执行 Astro check 和 Astro build。
- `.github/workflows/biome.yml` 检查 `src/` 代码质量。
- `.github/workflows/deploy.yml` 在推送到 `master` 后部署 Cloudflare Pages。
- GitHub Pages 已不是当前部署目标，不要把配置擅自切回 GitHub Pages。
- 部署失败时先查看最近提交、Actions 运行状态和失败步骤日志，再提出修改方案；不要在没有根因证据时重写 workflow 或迁移平台。
- `public/osu-stats.json` 会被部署工作流刷新；判断差异时先区分人工修改与 CI 生成数据。

## 10. Git 与修改边界

- 开始工作先运行 `git status --short --branch`，识别 Lv 或其他 Agent 的已有修改。
- 不覆盖、不回退、不格式化与当前任务无关的变更；尤其不要使用 `git reset --hard`、`git clean -fd` 或全仓库无差别格式化。
- 提交前只暂存当前任务文件。中文路径必须加引号。
- 除非 Lv 明确要求，不要自行 commit、push、发布或修改远程部署状态。
- 不要提交 `staging/`、环境变量、访问令牌、构建产物或本地缓存。
- README 约定：主 `README.md` 使用英文，中文说明放 `README_CN.md`；同步维护时不要混用语言。

## 11. 完成任务前检查清单

- [ ] 修改位于正确的配置、组件、页面或内容目录，没有把逻辑随手塞进大文件。
- [ ] 新文章 frontmatter 符合 `src/content.config.ts`。
- [ ] Hermes 文章只有 `[Hermes]` 标签，且没有影响 Lv 的非 Hermes 内容。
- [ ] 图片路径与存放位置匹配 Astro/public 的处理方式。
- [ ] 客户端交互考虑了 Swup 二次进入和浏览器历史导航。
- [ ] 使用 pnpm，并执行了与改动范围匹配的检查。
- [ ] `git diff` 中没有无关格式化、生成文件、秘密或 Lv 的既有修改。
- [ ] 未在无明确要求时触发 `publish_today.py`、commit、push 或 Cloudflare 部署。
