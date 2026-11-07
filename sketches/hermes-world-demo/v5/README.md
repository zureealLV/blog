# Cyber Room × 3D Memory Atlas — V5

An isolated, working local prototype. The room is full-viewport; the central memory field uses real XYZ coordinates and a Three.js perspective camera. The reference-based companion lives in a separate portrait display. No decorative headings, fake status labels or command terminal.

## Run

Prerequisites: the parent Firefly repository with its existing dependencies installed; Node.js 22+; Corepack/pnpm 9.14.4. The demo uses Three.js **0.180.0** and Playwright **1.56.1** (tests only). No production dependency manifest was changed.

```powershell
Set-Location 'D:/blog/Firefly_zureeallv/sketches/hermes-world-demo/v5'
corepack pnpm install --ignore-workspace --frozen-lockfile
./Start-Demo.ps1
```

Open <http://127.0.0.1:8767/v5/>. The server binds to loopback only, exposes a static allowlist and public-article APIs, and watches content changes. If 8767 belongs to another service, do not stop it; use `./Start-Demo.ps1 -Port 8768`.

Do not open `index.html` as `file:` or use a plain static server: the live index and on-demand reader require `server.mjs`. Ctrl+C stops the foreground server. The server started during implementation is running hidden on 8767; the start script detects it without duplicating it.

## Explore

- Click a cluster → theme → individual star → sourced introduction → read full Markdown text.
- Drag the memory field to orbit; wheel to dolly. Keyboard: arrows, +/- and Enter on the canvas; Tab/Enter on controls and contextual node labels.
- `/` opens search. Search supports title, description, tags and body-derived keywords; author, original category and theme filters are independent.
- Esc/back restores the prior camera, filters and selection. Reader close leaves the camera untouched. Session storage restores settled views on reload, but stores no article bodies.
- The companion responds only on interaction, with the original four-frame atlas, not Live2D or an online model.
- Settings contain reduced motion, list fallback, warm light, instructions, privacy/material notes and measured rendering diagnostics.

## Source map

| File | Responsibility |
| --- | --- |
| `index.html`, `room.css` | Full-bleed architectural composition, portrait display, dialogs, responsive layout |
| `scene.js` | Three.js perspective camera, batched 3D stars, ray/projected picking, interruptible flight, sparse links |
| `app.js` | Exploration history, search, reader, automatic index sync, accessibility and companion feedback |
| `indexer.mjs`, `topics.mjs` | Reusable public-source index and deterministic topic/layout rules |
| `topic-overrides.json` | Optional small corrections, keyed by actual Astro content ID |
| `server.mjs` | Loopback static allowlist, live content watcher and lazy reader API |
| `tests/` | Isolated content fixtures and actual Chromium browser acceptance |

See [README_CN.md](./README_CN.md), [INDEX.md](./INDEX.md), [TESTING.md](./TESTING.md), and [PROMPTS.md](./PROMPTS.md) for details and limitations.

## Validation

```powershell
corepack pnpm test
node tests/browser.mjs
node tests/live-browser.mjs
corepack pnpm run index
```

Browser tests use installed Microsoft Edge in headless mode and write genuine viewport screenshots plus `browser-test-report.json`. The source tests use temporary fixture directories, never the real article directory. The report is a local measurement, not a 60 FPS guarantee or production/Swup acceptance.

## Boundaries

V1–V4 remain intact. No changes to production `src/`, `public/`, deployment configuration or root dependencies. After local acceptance, Lv explicitly authorized committing and pushing this isolated demo to `master`. The existing master-push workflow may deploy the production blog; this demo stays outside `src/` and `public/` and is not added to production routes or the deployed site. Source material is read locally; remote assets and article bodies are not downloaded by the interface. Opening “original article” is an explicit external navigation. The generated metadata snapshot `index.report.json` remains local and can be regenerated with the index command.
