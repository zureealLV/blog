# osu! gacha Field Guide

A buildless, browser-local Chinese reference and build checker, hosted at
<https://zureeallv.com/gacha-wiki/> as part of the existing Firefly deployment.

## Source of truth

- Application: `public/gacha-wiki/` (HTML, CSS, ES modules, generated JSON/JS).
- Data extraction: `scripts/gacha-wiki/extract-data.mjs`.
- Editorial builds: `scripts/gacha-wiki/generate-guides.mjs`.
- Tests: `scripts/gacha-wiki/tests/`.
- Provenance: `docs/gacha-wiki/evidence/` (hash manifest and audit notes).
- Blog entry: the **My → Gacha Wiki** navigation item. Swup ignores this route.

No framework, external font, CDN script, server-side service, account cookie or
private game API is needed by the Wiki. Favorites stay in browser localStorage.
Build links use URL fragments and contain only public skill/MOD selections.

## Verify

From the blog repository root (Node.js 22 or newer):

```powershell
node --test scripts/gacha-wiki/tests/*.test.mjs
node --check public/gacha-wiki/app.mjs
corepack pnpm check
corepack pnpm exec biome ci src/config/navBarConfig.ts
corepack pnpm build
corepack pnpm preview --host 127.0.0.1 --port 4326
```

The rule tests cover all 299 distinct zero-to-three-MOD selections, all 160
catalog entries, translations/percentages, reference integrity, recipes, search,
favorites filtering, build normalization and share-link round trips. Browser
interaction and responsive QA are separate evidence, not implied by unit tests.

## Refresh rules deliberately

```powershell
node scripts/gacha-wiki/extract-data.mjs
node scripts/gacha-wiki/generate-guides.mjs docs/gacha-wiki/evidence/rpg-Rm3zoMWw.js
node --test scripts/gacha-wiki/tests/*.test.mjs
```

The extractor downloads only publicly served HTML/JS assets. It does not execute
the upstream application. Selected constant initializers are evaluated in a
restricted VM only after source hashes match a reviewed allowlist. **A changed
hash stops extraction**: review the changes, formulas, translations and recipes
before changing the approved hashes/mappings. Do not blindly update the hash.

Raw downloaded application bundles are local evidence and excluded from Git;
they are not hosted by the Wiki. A clean checkout without these bundles skips
the four source-snapshot/differential tests explicitly, while retaining all
catalog and engine tests. Running the extractor downloads the current reviewed
sources; historical differential checks additionally require the old bundles.
The tracked audit notes record the historical comparison.

An offline rebuild uses `node scripts/gacha-wiki/extract-data.mjs --offline`
and requires the locally cached source assets. It preserves the snapshot date.
The ordinary blog build never fetches game rules or mutates the generated data.

## Evidence boundary

This is a dated public-client snapshot, not a claim of complete server logic,
real-time synchronization, actual account gear, full player-card catalog,
measured win rates or an optimal tier list. Signature entries are skill kits,
not inferred player/card/banner mappings. English source text is retained.
Editorial recommendations are labeled separately from extracted game rules.

See [中文说明](README_CN.md) and [acceptance record](VALIDATION.md).
