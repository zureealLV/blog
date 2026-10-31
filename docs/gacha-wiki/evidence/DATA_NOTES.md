# osu! gacha public rules snapshot

Snapshot refreshed on 2026-10-31 (Asia/Shanghai); prior 2026-10-30 snapshots retained. See `UPDATE-20261031.md` for the full-bundle comparison. No login, account tokens, private inventory, mutations, purchases or combat requests were used.

## Sources

- Homepage: https://osugacha.com/
- Main rule bundle: https://osugacha.com/assets/rpg-Rm3zoMWw.js
- Chinese content/UI dictionary: https://osugacha.com/assets/zh-BrYAqR0c.js
- Chinese dictionary discovery: public `overlays-NbLz_OEv.js` dynamic locale import.
- Exact SHA-256 values, fetch time and counts: `source-manifest.json`.

## Reproduce

From the blog repository root, run `node scripts/gacha-wiki/extract-data.mjs --offline` to rebuild `public/gacha-wiki/data.json` and `public/gacha-wiki/data.js` from retained source snapshots, then `node --test scripts/gacha-wiki/tests/data-catalog.test.mjs`.

Without `--offline`, the script rediscovers assets from the homepage and retrieves the public static bundles. It rejects changed RPG/Chinese source fingerprints until the new initializers and translations have been manually reviewed. This is deliberate: minified symbol names are not a stable API. Update the approved hashes only after review. No full remote application is executed; the extractor selects approved data initializers, evaluates those in an isolated context without host/network/DOM APIs, and uses locally defined percentage formatters.

## Catalog coverage

4 classes, 16 ordinary Skills, 19 ordinary passives, 16 matched Skill/passive synergies, 12 MOD types (with all 5 star-specific intrinsic effect descriptions), 28 MOD combinations, 9 signature kits, 16 team synergy descriptions, 6 floor MODs, 4 boss traits, 20 mechanics notes, 10 status types. The JSON also retains stat names, MOD main-stat weights, rarity scalars, level caps, initial substat ranges, base stat tables and class Eidolon text.

Ordinary Chinese descriptions come from the current site's own Chinese content dictionary. Signature skill kit Chinese names/descriptions and supplementary mechanics explanations are manually translated/summarized, and English is retained. MOD names have Chinese search aliases. Percentage matching tests compare the English and Chinese ordinary effect text numerically. This does not prove all possible in-game interactions or server parity.

## Important interpretation boundaries

- Signature IDs identify skill templates, not player names, artwork or current banner entries. No mapping is guessed.
- `ot()` returns one matching three-MOD combo, otherwise all matching two-MOD combos. This does not remove intrinsic single-MOD bonuses or item stats.
- Shape team bonuses are gated on four units and use first-match precedence: Siege, Hex Circle, Twin Blades, Iron Wall, Choir. Other eligible ordinary team contributions may coexist. Team ATK/HP/SPD contribution caps are each +35%.
- The ordinary same-type status merge takes max duration and max magnitude, not sum.
- Current battle code caps shields at 50% of the recipient's max HP and accumulated action push at 60% between actions.
- Runtime initiative derives its interval from the square root of effective speed. SPD percentages are not literal equal increases in total action count.
- E2 is not universally a blind ×1.3: ordinary Undying retains 10% max HP at the enhanced passive tier, while its Counter Stance matched synergy follows its separate 50% HP rule.
- The catalog is an observed frontend snapshot, not a declaration of current private/server authority, tested win rates or personal inventory.

## Validation

`scripts/gacha-wiki/tests/data-catalog.test.mjs`: 20 tests passed during the latest extraction. Covers unique IDs and counts, Chinese presence, all skill/passive/MOD links, numerical percentage agreement in ordinary descriptions, identical JSON/JS payloads, source fingerprints, all MOD star descriptions, normalized generation weights, the exact observed three-MOD precedence implementation, and the two full-source equivalence comparisons for the 2026-10-31 refresh.
