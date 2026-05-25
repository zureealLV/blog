# 𝓞𝓢𝓤！𝓣𝓥 — zureealLV Blog

> **AI Agent 驱动的个人博客自动化搭建与运维**
>
> 本项目展示如何通过自然语言对话，让 AI Agent 自主完成博客的全生命周期管理——从零搭建、内容迁移、个性化配置、API 集成，到持续运维。

🌐 **在线访问**: [https://zureeallv.com](https://zureeallv.com)

---

## 项目背景

传统个人博客搭建需要手动编写配置文件、逐篇迁移文章、手动配置 CI/CD 流水线。整个过程繁琐且容易出错。

本项目探索了一种新范式：**用户只需要用自然语言描述需求，AI Agent 自主完成所有技术实现**。

---

## Agent 能力展示

### 1. 零代码博客搭建与配置

**指令**: 「帮我搭建博客」

Agent 自主完成：
- 阅读 Firefly 主题文档（`web_extract`）
- 修改 22 个配置文件（`siteConfig`、`profileConfig`、`navBarConfig`...）
- 部署 Twikoo 评论系统并配置自建后端
- 集成 Bangumi 番组计划
- 配置音乐播放器、导航栏、友链系统

```
自然语言指令 → Hermes Agent (DeepSeek-V4)
    ├── 理解意图
    ├── 阅读文档 → 分析配置结构
    ├── 逐一修改 → 验证正确性
    └── 反馈结果
```

### 2. 34 篇文章全自动迁移

**指令**: 「把桌面上的文章合集上传到博客」

Agent 自主完成：
- 解析 `.docx` 文件，提取 13 篇新文章 + 配图
- 从旧 GitHub Pages 抓取 21 篇文章并格式化
- 生成完整 frontmatter（标题/日期/标签/封面图）
- 下载并关联所有配图
- 修复 YAML 嵌套引号导致的构建失败

### 3. osu! API v2 实时数据集成

**指令**: 「搞个 osu! 实时数据卡片」

Agent 自主设计并实现了完整的数据管道：

```
每次 push → GitHub Actions
    ├── OAuth 2.0 获取 Token
    ├── 调用 osu! API v2 拉取数据
    ├── 生成 JSON 存入静态资源
    └── 前端卡片动态渲染
```

- 编写 Shell 脚本 (`scripts/fetch-osu-stats.sh`)
- 修改 GitHub Actions deploy workflow 注入定时抓取步骤
- 设计侧边栏卡片 UI 组件（联动主题色相、暗色适配）
- 安全存储 API Secret 于 GitHub Secrets

### 4. 生日彩蛋特效

**指令**: 「5月26是我生日，搞个特效」

Agent 自主实现：
- Canvas Confetti 彩带动画
- 公告栏动态替换为生日祝福
- 首页横幅字体改为 🎂 Happy Birthday 🎂
- Canvas 蛋糕雨动画（🎂 emoji 旋转飘落）
- 头像悬浮蛋糕装饰

### 5. 跨平台操作能力

Agent 自主处理多种异构环境：
- WSL (Linux) ↔ Windows (PowerShell) 文件路径映射
- GitHub Actions CI/CD 调试与修复
- Biome 代码格式化冲突解决
- CDN 资源下载与本地化

---

## 技术栈

| 层 | 技术 |
|------|------|
| **框架** | Astro 6.3 + Svelte 5 + Tailwind CSS 4 |
| **语言** | TypeScript 5.9 |
| **AI Agent** | Hermes Agent (Nous Research) + DeepSeek-V4 |
| **评论** | Twikoo v1.7.9 (自建 Vercel 后端) |
| **数据** | osu! API v2 (OAuth 2.0) |
| **部署** | GitHub Pages + GitHub Actions |
| **自托管** | 字体 CDN、音乐播放器 (Meting API) |

---

## Agent 操作统计

| 指标 | 数据 |
|------|------|
| 配置文件修改 | 22+ 个 |
| 文章迁移 | 34 篇 (21 旧博客 + 13 新文章) |
| 工具调用 | 单次任务平均 15+ 工具 |
| 跨平台操作 | WSL / Windows / GitHub Actions |
| 集成服务 | osu! API, Twikoo, Bangumi, Meting |
| 特效开发 | Canvas Confetti + 蛋糕雨 + 头像装饰 |

---

## 项目结构

```
src/
├── config/           ← Agent 逐一修改的 22 个配置
├── content/
│   ├── posts/        ← 34 篇 Agent 生成的 markdown
│   └── spec/         ← 关于/友链/留言板
├── components/       ← UI 组件
├── pages/            ← 路由页面
└── styles/           ← 样式
public/
├── osu-stats.json    ← Agent 设计的 API 数据缓存
└── assets/           ← 静态资源
scripts/
└── fetch-osu-stats.sh ← Agent 编写的 osu! API 脚本
.github/workflows/    ← Agent 修改的 CI/CD 流水线
```

---

## 致谢

- 博客主题基于 [Firefly](https://github.com/CuteLeaf/Firefly)（基于 [Fuwari](https://github.com/saicaca/fuwari)）
- AI Agent 由 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 驱动
