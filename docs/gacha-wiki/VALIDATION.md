# Acceptance record — osu! gacha Wiki

## Scope

Target: a usable Chinese searchable Wiki on Lv's blog, with source-grounded
skills/passives, MOD combinations, mechanics and practical build guidance.
No private-account access or live-game mutations.

## Rule acquisition

- 2026-10-31: re-read live game entrypoint; new `rpg-Rm3zoMWw.js` and
  `overlays-NbLz_OEv.js` were compared with the prior day's snapshot.
- The RPG bundle changed only its overlays import filename. Overlays changed
  only the `x-client-build` value. Rules and the Chinese locale were unchanged.
- Provenance and exact hashes: `evidence/source-manifest.json` and
  `evidence/UPDATE-20261031.md`.
- 160 catalog records, 12 editorial builds, 16 glossary terms, 10 editorial
  rule notes. Builds explicitly distinguish deduction from measured performance.

## Automated checks

- Catalog/reference/translation integrity; JSON/JS parity; all 299 distinct
  zero-to-three MOD selections; three-item priority; simultaneous pair matching;
  Chinese/English/shorthand search; class/favorite filters; share-link round trip;
  invalid build normalization; signature fixed class and known warnings.
- Source-bundle fingerprint and historical equivalence tests run against the
  locally cached public bundles, not just manifest text.

## Browser checks completed on local candidate

- Desktop: search `HD DT HR` returns the matching combo and explanatory rule,
  not unrelated word fragments. Full combo description and source are visible.
- Favorite add, reload persistence, remove and empty-state recovery.
- Class filtering yields four Support skills; no-result search can reset to all.
- Builder: Heavy Strike + Guard Breaker activates the exact extra hit rule;
  HD + DT + HR displays Hypercarry and suppresses Burst/Crit pair effects.
- Selecting a fourth MOD is rejected with feedback; existing selection stays.
- Signature `replay` shows fixed Starlight / Grace / replacement Basic; refreshing
  the fragment restores the build.
- 390 × 844 viewport: mobile navigation drawer, guide class filter (three Support
  guides), one-click guide import, readable single-column builder. Document width
  375 px inside a 390 px viewport (scrollbar space); no horizontal overflow.
- Browser console error list empty for these interactions.

## Release gates

Release verification is split between local build checks and live deployment.
- Wiki tests: 34 passed, 0 failed, 0 skipped with both audited snapshots cached.
- Astro check: 0 errors, 0 warnings, 1 existing hint. Changed navigation passed Biome.
- Full blog build: Astro, pinned ORBIT and Pagefind completed. The first build stopped in an unrelated ORBIT LAN test; the unchanged isolated LAN suite (3/3), complete ORBIT suite and full blog retry passed. No test or workflow was bypassed.
- Production deployment status is available in the GitHub Actions run for the release commit; a successful local build alone does not establish live availability.
