<div align="center">

# ✦ 𝓩𝓤𝓡𝓔𝓔𝓐𝓛 ✦ Personal Blog

**基于 Firefly 主题的 Astro 静态博客 · AI 驱动 · 持续进化**

[![Astro](https://img.shields.io/badge/Astro-6.3-FF5D01?logo=astro&logoColor=white)](https://astro.build)
[![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

🌐 **[在线访问](https://zureeallv.com)** · 📖 **[文章归档](https://zureeallv.com/archive)** · 💬 **[留言板](https://zureeallv.com/guestbook)**

<img src="docs/images/homepage.png" alt="博客首页预览" width="100%" />

</div>

---

## ✨ 特性

| 特性 | 说明 |
|------|------|
| 🎨 **精美主题** | 基于 [Firefly](https://github.com/CuteLeaf/Firefly) 主题，支持亮色/暗色/跟随系统三种模式 |
| 🎵 **音乐播放器** | 内置 Meting API 音乐播放器，支持网易云音乐歌单 |
| 🎮 **osu! 数据卡片** | 通过 osu! API v2 实时获取游戏数据，展示在侧边栏 |
| 📺 **Bangumi 番组计划** | 集成 Bangumi API，展示追番、游戏、书籍和音乐进度 |
| 💬 **评论系统** | 集成 Twikoo 评论系统，支持自建后端 |
| 🔍 **全文搜索** | 基于 Pagefind 的静态全文搜索，无需外部服务 |
| 📱 **响应式设计** | 完美适配桌面端和移动端 |
| 🚀 **极致性能** | Lighthouse 四项全绿：性能 97 / 无障碍 97 / 最佳实践 100 / SEO 100 |
| 📸 **分享海报** | 文章页一键生成精美分享海报 |
| 🎂 **生日彩蛋** | 特定日期自动触发 Canvas 动画特效 |

---

## 📸 截图预览

<div align="center">

### 首页
<img src="docs/images/homepage.png" alt="首页" width="90%" />

### Lighthouse 性能
<img src="docs/images/Lighthouse.png" alt="Lighthouse 性能测试" width="60%" />

</div>

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **框架** | [Astro](https://astro.build) 6.3 + [Svelte](https://svelte.dev) 5 |
| **样式** | [Tailwind CSS](https://tailwindcss.com) 4 |
| **语言** | [TypeScript](https://www.typescriptlang.org) 5.9 |
| **评论** | [Twikoo](https://twikoo.js.org) v1.7.9 |
| **数据** | osu! API v2 (OAuth 2.0) · Bangumi API · Meting API |
| **部署** | GitHub Pages + GitHub Actions |
| **搜索** | [Pagefind](https://pagefind.app) 静态全文搜索 |
| **包管理** | [pnpm](https://pnpm.io) |

---

## 🚀 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 9

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/zureealLV/blog.git
cd blog

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 `http://localhost:4321` 即可预览。

### 构建与部署

```bash
# 构建静态站点
pnpm build

# 本地预览构建结果
pnpm preview
```

---

## ⚙️ 配置指南

### 站点配置

编辑 `src/config/siteConfig.ts`：

```typescript
export const siteConfig: {
  title: "你的站点标题",        // 导航栏标题
  subtitle: "你的站点副标题",    // 首页副标题
  site_url: "https://your-domain.com",  // 站点 URL
  description: "站点描述",      // 用于 SEO
  themeColor: {
    hue: 200,                  // 主题色相 (0-360)
    defaultMode: "system",     // "light" | "dark" | "system"
  },
}
```

### 个人资料

编辑 `src/config/profileConfig.ts` 配置头像、社交链接等。

### 导航栏

编辑 `src/config/navBarConfig.ts` 自定义导航菜单。

### 音乐播放器

在 `siteConfig.ts` 中配置 Meting API 参数，支持网易云音乐、QQ 音乐等平台。

### osu! 数据卡片

1. 在 [osu! API](https://osu.ppy.sh/home/account/edit) 创建 OAuth 应用
2. 在 GitHub Secrets 中添加 `OSU_CLIENT_SECRET`
3. GitHub Actions 会自动在每次部署时拉取最新数据

### Bangumi 番组计划

在 `siteConfig.ts` 中配置 `bangumi.userId` 即可自动展示你的追番、游戏、书籍和音乐。

---

## 📁 项目结构

```
blog/
├── src/
│   ├── components/       # UI 组件 (Svelte + Astro)
│   ├── config/           # 站点配置文件
│   │   ├── siteConfig.ts     # 站点基础配置
│   │   ├── profileConfig.ts  # 个人资料配置
│   │   ├── navBarConfig.ts   # 导航栏配置
│   │   ├── friendsConfig.ts  # 友链配置
│   │   └── fontConfig.ts     # 字体配置
│   ├── content/
│   │   ├── posts/        # 博客文章 (Markdown)
│   │   └── spec/         # 特殊页面 (关于/友链/留言)
│   ├── layouts/          # 页面布局
│   ├── pages/            # 路由页面
│   └── styles/           # 全局样式
├── public/
│   ├── assets/           # 静态资源 (图片/头像)
│   └── osu-stats.json    # osu! 数据缓存 (自动生成)
├── scripts/
│   └── fetch-osu-stats.sh  # osu! API 数据拉取脚本
├── docs/
│   └── images/           # README 文档图片
├── .github/
│   └── workflows/
│       ├── deploy.yml    # 自动部署到 GitHub Pages
│       ├── build.yml     # 构建检查
│       └── biome.yml     # 代码质量检查
├── astro.config.mjs      # Astro 配置
└── package.json
```

---

## 📝 写文章

在 `src/content/posts/` 目录下创建 Markdown 文件：

```markdown
---
title: 文章标题
published: 2026-06-14
description: 文章简介
image: /assets/images/cover.jpg   # 可选，封面图
tags: [标签1, 标签2]
category: 分类名
draft: false                      # true 为草稿，不会发布
---

文章正文内容...
```

---

## 🚢 部署到 GitHub Pages

1. Fork 或克隆本仓库
2. 在 GitHub 仓库设置中启用 Pages（Source: `pages` 分支）
3. 在 GitHub Secrets 中添加 `OSU_CLIENT_SECRET`（如果需要 osu! 数据）
4. 推送到 `master` 分支，GitHub Actions 会自动构建并部署

自定义域名：在 `public/CNAME` 文件中修改为你的域名，并在 DNS 中配置 CNAME 记录指向 `zureeallv.github.io`。

---

## 🎨 自定义

### 修改主题色

在 `siteConfig.ts` 中调整 `themeColor.hue`（0-360 色相值）：

| 色相 | 颜色 |
|------|------|
| 0 | 🔴 红色 |
| 120 | 🟢 绿色 |
| 200 | 🔵 蓝色 |
| 250 | 🟣 蓝紫色 |
| 345 | 🩷 粉色 |
| 165 | 🟢 青绿色（默认） |

### 修改字体

编辑 `src/config/fontConfig.ts` 自定义中英文字体。

### 开启/关闭页面

在 `siteConfig.ts` 的 `pages` 配置中控制各页面的开关：

```typescript
pages: {
  friends: true,    // 友链页面
  guestbook: true,  // 留言板
  bangumi: true,    // 番组计划
  gallery: true,    // 相册
  sponsor: false,   // 赞助页面
}
```

---

## 📊 Lighthouse 性能

<div align="center">
<img src="docs/images/Lighthouse.png" alt="Lighthouse 性能测试" width="50%" />
</div>

| 指标 | 得分 |
|------|------|
| 🚀 Performance | **97** / 100 |
| ♿ Accessibility | **97** / 100 |
| ✅ Best Practices | **100** / 100 |
| 🔍 SEO | **100** / 100 |

---

## 🤝 致谢

- 博客主题：[Firefly](https://github.com/CuteLeaf/Firefly)（基于 [Fuwari](https://github.com/saicaca/fuwari)）
- AI 助手：[Hermes Agent](https://github.com/NousResearch/hermes-agent)（Nous Research）
- 评论系统：[Twikoo](https://twikoo.js.org)
- 搜索引擎：[Pagefind](https://pagefind.app)

---

## 📄 License

本项目基于 [MIT License](LICENSE) 开源。

---

<div align="center">

**如果觉得不错，给个 ⭐ 吧~**

</div>
