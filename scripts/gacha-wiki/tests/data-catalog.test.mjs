import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
const data = JSON.parse(
	fs.readFileSync(
		new URL("../../../public/gacha-wiki/data.json", import.meta.url),
	),
);
const kinds = [
	"classes",
	"skills",
	"passives",
	"synergies",
	"mods",
	"combos",
	"signatures",
	"teamSynergies",
	"floorMods",
	"bosses",
	"mechanics",
	"statuses",
];
for (const k of kinds)
	test(`${k}: IDs unique, counts match, Chinese content present`, () => {
		const items = data[k];
		assert.equal(new Set(items.map((x) => x.id)).size, items.length);
		assert.equal(items.length, data.meta.counts[k]);
		for (const x of items) {
			assert.ok(x.id);
			if (k === "synergies") {
				assert.match(x.bonusZh, /[\u4e00-\u9fff]/);
			} else if (k === "signatures") {
				assert.match(x.skill.textZh, /[\u4e00-\u9fff]/);
				assert.match(x.passive.textZh, /[\u4e00-\u9fff]/);
			} else {
				assert.ok(x.name);
				assert.ok(x.nameZh);
				assert.ok(x.textZh);
				if (!(k === "mods" && x.id === "dt"))
					assert.match(x.textZh, /[\u4e00-\u9fff]/);
			}
		}
	});
test("all relationship IDs resolve", () => {
	const skills = new Map(data.skills.map((x) => [x.id, x])),
		passives = new Set(data.passives.map((x) => x.id)),
		mods = new Set(data.mods.map((x) => x.id)),
		classes = new Set(data.classes.map((x) => x.id));
	for (const x of data.synergies) {
		assert.ok(skills.has(x.skill));
		assert.ok(passives.has(x.passive));
	}
	for (const x of data.combos) {
		assert.ok(x.mods.length === 2 || x.mods.length === 3);
		for (const m of x.mods) assert.ok(mods.has(m));
	}
	for (const x of [...data.skills, ...data.signatures])
		assert.ok(classes.has(x.cls));
});
test("English and Chinese percentages agree", () => {
	const nums = (s) =>
		(s.match(/\d+(?:\.\d+)?%/g) || [])
			.map((x) => parseFloat(x))
			.sort((a, b) => a - b);
	for (const k of [
		"skills",
		"passives",
		"synergies",
		"combos",
		"teamSynergies",
		"floorMods",
		"bosses",
	])
		for (const x of data[k])
			assert.deepEqual(
				nums(x.text || x.bonus),
				nums(x.textZh || x.bonusZh),
				`${k}/${x.id}`,
			);
});
test("standalone data.js equals JSON data", () => {
	const ctx = vm.createContext({ window: {} });
	new vm.Script(
		fs.readFileSync(
			new URL("../../../public/gacha-wiki/data.js", import.meta.url),
			"utf8",
		),
	).runInContext(ctx);
	assert.equal(JSON.stringify(ctx.window.WIKI_DATA), JSON.stringify(data));
});
test("RPG and locale fingerprints match snapshots", (t) => {
	if (!hasSnapshots([data.meta.build, data.meta.localeUrl.split("/").at(-1)]))
		return t.skip("Run extract-data.mjs to download pinned source snapshots.");
	for (const [url, hash] of [
		[data.meta.sourceUrl, data.meta.sourceHash],
		[data.meta.localeUrl, data.meta.localeHash],
	]) {
		const file = url.split("/").at(-1);
		const b = fs.readFileSync(
			new URL("../../../docs/gacha-wiki/evidence/" + file, import.meta.url),
		);
		assert.equal(crypto.createHash("sha256").update(b).digest("hex"), hash);
	}
});
test("all MOD stars and generation weights complete", () => {
	for (const m of data.mods) {
		assert.deepEqual(
			m.effectsByStar.map((x) => x.star),
			[1, 2, 3, 4, 5],
		);
		assert.equal(
			Object.values(m.mainStatWeights).reduce((a, b) => a + b, 0),
			100,
		);
	}
});
test("three-mod priority matches pinned implementation", (t) => {
	if (!hasSnapshots([data.meta.build]))
		return t.skip("Run extract-data.mjs to download the pinned RPG snapshot.");
	const src = fs.readFileSync(
		new URL(
			"../../../docs/gacha-wiki/evidence/" + data.meta.build,
			import.meta.url,
		),
		"utf8",
	);
	assert.ok(
		src.includes(
			"r=it.find(e=>e.mods.length===3&&n(e));return r?[r.id]:it.filter(e=>e.mods.length===2&&n(e)).map(e=>e.id)",
		),
	);
});
test("2026-10-31 review: RPG differs only by overlays import name", (t) => {
	if (!hasSnapshots(["rpg-Dm4muRFI.js", "rpg-Rm3zoMWw.js"]))
		return t.skip(
			"Historical differential evidence not available in this checkout.",
		);
	const old = fs.readFileSync(
		new URL(
			"../../../docs/gacha-wiki/evidence/rpg-Dm4muRFI.js",
			import.meta.url,
		),
		"utf8",
	);
	const current = fs.readFileSync(
		new URL(
			"../../../docs/gacha-wiki/evidence/rpg-Rm3zoMWw.js",
			import.meta.url,
		),
		"utf8",
	);
	assert.equal(
		old.replaceAll("overlays-B7A9WJav.js", "overlays-NbLz_OEv.js"),
		current,
	);
});
test("2026-10-31 review: overlays differs only by client build timestamp", (t) => {
	if (!hasSnapshots(["overlays-B7A9WJav.js", "overlays-NbLz_OEv.js"]))
		return t.skip(
			"Historical differential evidence not available in this checkout.",
		);
	const old = fs.readFileSync(
		new URL(
			"../../../docs/gacha-wiki/evidence/overlays-B7A9WJav.js",
			import.meta.url,
		),
		"utf8",
	);
	const current = fs.readFileSync(
		new URL(
			"../../../docs/gacha-wiki/evidence/overlays-NbLz_OEv.js",
			import.meta.url,
		),
		"utf8",
	);
	assert.equal(old.replaceAll("1793345822460", "1793399313925"), current);
	assert.equal(data.meta.clientBuild, "1793399313925");
});

function hasSnapshots(files) {
	return files.every((f) =>
		fs.existsSync(
			new URL("../../../docs/gacha-wiki/evidence/" + f, import.meta.url),
		),
	);
}
