<div align="center">

> 🇨🇳 [中文版](README_CN.md) | 🇬🇧 English

# ✦ 𝓩𝓤𝓡𝓔𝓔𝓐𝓛 ✦ Personal Blog

**Firefly-themed Astro static blog · Dark frosted glass style · osu! themed**

[![Astro](https://img.shields.io/badge/Astro-6.3-FF5D01?logo=astro&logoColor=white)](https://astro.build)
[![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

🌐 **[Visit Site](https://zureeallv.com)** · 📖 **[Archives](https://zureeallv.com/archive)** · 💬 **[Guestbook](https://zureeallv.com/guestbook)**

</div>

---

## 📸 Screenshots

### Splash Screen

Cyberpunk-style entry animation with Matrix digital rain, terminal login sequence, and osu! hit circle effects.

<div align="center">
<img src="docs/images/splash-screen.png" alt="Splash Screen" width="80%" />
</div>

### Homepage

Dark frosted glass three-column layout: profile + music player on the left, article feed in the center, site stats + calendar + osu! data card on the right.

<div align="center">
<img src="docs/images/homepage-dark.png" alt="Homepage" width="90%" />
</div>

### osu! Data Card

Real-time game data via osu! API v2, displaying PP, rank, accuracy, play count, and more.

<div align="center">
<img src="docs/images/osu-stats.png" alt="osu! Data Card" width="90%" />
</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎨 **Dark Frosted Glass Theme** | Semi-transparent purple frosted glass panels + full-screen anime background, supports light/dark/system mode |
| 🎵 **Built-in Music Player** | Meting API integration, supports Netease Cloud Music playlists, real-time playback status in sidebar |
| 🎮 **osu! Data Card** | OAuth 2.0 + osu! API v2, auto-fetches PP, rank, accuracy, and more |
| 📺 **Bangumi Integration** | Displays anime, game, book, and music progress |
| 💬 **Twikoo Comments** | Self-hosted Vercel backend comment system |
| 🔍 **Full-text Search** | Pagefind static search, no external service needed |
| 📱 **Responsive Layout** | Desktop 3-column / mobile single-column adaptive |
| 🚀 **Top Performance** | Lighthouse 100 across the board (see benchmarks below) |
| 📸 **Share Poster** | One-click generate beautiful share posters for articles |
| 🎂 **Birthday Easter Egg** | Auto-trigger canvas confetti + cake rain animation on specific dates |

---

## 🚀 Performance

Performance evaluation using [Google Lighthouse](https://developer.chrome.com/docs/lighthouse/). Lighthouse is Chrome's built-in open-source tool for assessing web page quality across Performance, Accessibility, Best Practices, and SEO.

**Test method**: Chrome DevTools (F12) → Lighthouse tab → Click "Analyze page load"

<div align="center">
<img src="docs/images/Lighthouse.png" alt="Lighthouse Performance" width="50%" />
</div>

| Metric | Score | Description |
|--------|-------|-------------|
| 🚀 **Performance** | **97** / 100 | Load speed, resource optimization, interaction responsiveness |
| ♿ **Accessibility** | **97** / 100 | Accessibility, semantic HTML, keyboard navigation |
| ✅ **Best Practices** | **100** / 100 | HTTPS, modern standards, security best practices |
| 🔍 **SEO** | **100** / 100 | Meta tags, structured data, search engine optimization |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Astro](https://astro.build) 6.3 + [Svelte](https://svelte.dev) 5 |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) 4 |
| **Language** | [TypeScript](https://www.typescriptlang.org) 5.9 |
| **Comments** | [Twikoo](https://twikoo.js.org) v1.7.9 |
| **Data** | osu! API v2 · Bangumi API · Meting API |
| **Deploy** | GitHub Pages + GitHub Actions |
| **Search** | [Pagefind](https://pagefind.app) static full-text search |
| **Package Manager** | [pnpm](https://pnpm.io) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 9

### Install & Run

```bash
# Clone the repository
git clone https://github.com/zureealLV/blog.git
cd blog

# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Visit `http://localhost:4321` to preview.

### Build & Deploy

```bash
# Build static site (includes osu! data fetch + Pagefind index)
pnpm build

# Preview the build output
pnpm preview
```

---

## ⚙️ Configuration Guide

### Site Configuration

Edit `src/config/siteConfig.ts`:

```typescript
export const siteConfig: {
  title: "Your Site Title",           // Navbar title
  subtitle: "Your Site Subtitle",     // Homepage subtitle
  site_url: "https://your-domain.com",  // Site URL
  description: "Site description",    // Used for SEO
  themeColor: {
    hue: 165,                     // Theme hue (0-360)
    defaultMode: "system",        // "light" | "dark" | "system"
  },
}
```

### Other Config Files

| File | Purpose |
|------|---------|
| `src/config/profileConfig.ts` | Profile, avatar, social links |
| `src/config/navBarConfig.ts` | Navbar menu |
| `src/config/friendsConfig.ts` | Friends page |
| `src/config/fontConfig.ts` | Font configuration |

### Music Player

Configure Meting API parameters in `siteConfig.ts`. Supports Netease Cloud Music, QQ Music, and more.

### osu! Data Card

1. Create an OAuth app on [osu! website](https://osu.ppy.sh/home/account/edit)
2. Add `OSU_CLIENT_SECRET` to GitHub repo Settings → Secrets
3. GitHub Actions will auto-fetch latest data on each deploy

### Bangumi Integration

Configure `bangumi.userId` in `siteConfig.ts` to auto-fetch anime/game/book/music data during build.

---

## 📁 Project Structure

```
blog/
├── src/
│   ├── components/       # UI components (Svelte + Astro)
│   ├── config/           # Site configuration files
│   │   ├── siteConfig.ts     # Site config
│   │   ├── profileConfig.ts  # Profile
│   │   ├── navBarConfig.ts   # Navbar
│   │   ├── friendsConfig.ts  # Friends
│   │   └── fontConfig.ts     # Fonts
│   ├── content/
│   │   ├── posts/        # Blog posts (Markdown)
│   │   └── spec/         # Special pages (About/Friends/Guestbook)
│   ├── layouts/          # Page layouts
│   ├── pages/            # Route pages
│   └── styles/           # Global styles
├── public/
│   ├── assets/           # Static assets
│   └── osu-stats.json    # osu! data cache (auto-generated)
├── scripts/
│   └── fetch-osu-stats.sh  # osu! API fetch script
├── .github/workflows/
│   ├── deploy.yml        # Auto deploy
│   ├── build.yml         # Build check
│   └── biome.yml         # Code quality check
├── astro.config.mjs
└── package.json
```

---

## 📝 Writing Posts

Create a Markdown file in `src/content/posts/`:

```markdown
---
title: Post Title
published: 2026-06-14
description: Post description
image: /assets/images/cover.jpg   # Optional cover image
tags: [tag1, tag2]
category: Category
draft: false                      # true for drafts
---

Content here...
```

---

## 🚢 Deploy to GitHub Pages

1. Fork or clone this repository
2. Enable Pages in repo Settings → Pages (Source: `pages` branch)
3. Add `OSU_CLIENT_SECRET` to Settings → Secrets (optional, for osu! data)
4. Push to `master` branch, GitHub Actions will auto-build and deploy

**Custom domain**: Edit `public/CNAME` to your domain, configure CNAME DNS record pointing to `zureeallv.github.io`.

---

## 🎨 Theme Color Reference

Adjust `themeColor.hue` (0-360) in `siteConfig.ts`:

| Hue | Color | Hue | Color |
|-----|-------|-----|-------|
| 0 | 🔴 Red | 200 | 🔵 Blue |
| 45 | 🟠 Orange | 250 | 🟣 Blue-Purple |
| 120 | 🟢 Green | 345 | 🩷 Pink |
| 165 | 🟢 Teal (default) | 280 | 🟪 Purple |

---

## 🤝 Credits

- Blog Theme: [Firefly](https://github.com/CuteLeaf/Firefly) (based on [Fuwari](https://github.com/saicaca/fuwari))
- AI Assistant: [Hermes Agent](https://github.com/NousResearch/hermes-agent) by Nous Research
- Comments: [Twikoo](https://twikoo.js.org)
- Search: [Pagefind](https://pagefind.app)

---

## 📄 License

This project is open source under the [MIT License](LICENSE).

---

<div align="center">

**If you like it, give it a ⭐~**

</div>
