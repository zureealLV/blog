import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { buildWarnings } from "../../../public/gacha-wiki/engine.mjs";

test("signature links normalize to their fixed class", () => {
	const value = validateBuild({ cls: "dps", sig: "replay", mods: [] }, data);
	assert.equal(value.cls, "support");
	assert.ok(buildWarnings(value, data).some((text) => text.includes("不攻击")));
});

test("Mend plus Sustain warns against adding separate shield limits", () => {
	const value = validateBuild(
		{ cls: "support", skill: "mend", passive: "lifeline", mods: ["ez", "ht"] },
		data,
	);
	assert.ok(buildWarnings(value, data).some((text) => text.includes("35%")));
});

test("unrestricted passives remain available under a class filter", () => {
	assert.equal(
		filterEntries(all, { kind: "passives", cls: "tank" }, data).length,
		data.passives.length,
	);
});
import {
	resolveCombos,
	comboResolution,
	flatten,
	filterEntries,
	validateBuild,
	synergyFor,
	buildParams,
	parseBuild,
	label,
	describe,
} from "../../../public/gacha-wiki/engine.mjs";
const data = JSON.parse(
	fs.readFileSync(
		new URL("../../../public/gacha-wiki/data.json", import.meta.url),
	),
);
const guides = JSON.parse(
	fs.readFileSync(
		new URL("../../../public/gacha-wiki/guides.json", import.meta.url),
	),
);
const all = flatten(data);
test("all catalogs have visible searchable entries", () => {
	assert.equal(
		all.length,
		Object.values(data.meta.counts).reduce((a, b) => a + b, 0),
	);
	for (const e of all) {
		assert.ok(label(e, data));
		assert.ok(e.kind === "signatures" || describe(e));
	}
});
test("three mods suppress matching pairs", () => {
	const r = comboResolution(["hd", "dt", "hr"], data.combos);
	assert.deepEqual(
		r.active.map((x) => x.id),
		["hypercarry"],
	);
	assert.deepEqual(
		r.suppressed.map((x) => x.id),
		["burst", "crit"],
	);
});
test("multiple pairs stack without triple", () => {
	const r = resolveCombos(["ez", "ht", "rx"], data.combos);
	assert.deepEqual(
		r.map((x) => x.id),
		["sustain"],
	);
	const pairs = data.combos.filter((x) => x.mods.length === 2);
	for (const a of pairs)
		for (const b of pairs) {
			const mods = [...new Set([...a.mods, ...b.mods])];
			if (
				mods.length === 3 &&
				!data.combos.some(
					(x) => x.mods.length === 3 && x.mods.every((m) => mods.includes(m)),
				)
			) {
				const r = resolveCombos(mods, data.combos);
				assert.ok(r.includes(a) && r.includes(b));
			}
		}
});
test("exhaustive 0-3 mod selections obey source priority", () => {
	const ids = data.mods.map((x) => x.id),
		sets = [[]];
	for (const a of ids) sets.push([a]);
	for (let i = 0; i < ids.length; i++)
		for (let j = i + 1; j < ids.length; j++) {
			sets.push([ids[i], ids[j]]);
			for (let k = j + 1; k < ids.length; k++)
				sets.push([ids[i], ids[j], ids[k]]);
		}
	assert.equal(sets.length, 299);
	for (const mods of sets) {
		const expected = data.combos.filter((x) =>
				x.mods.every((m) => mods.includes(m)),
			),
			triple = expected.find((x) => x.mods.length === 3);
		assert.deepEqual(
			resolveCombos(mods, data.combos),
			triple ? [triple] : expected,
		);
	}
});
test("Chinese, English, mod shorthand, and AND search", () => {
	assert.ok(filterEntries(all, { query: "治疗" }, data).length > 10);
	assert.ok(
		filterEntries(all, { query: "Heavy Strike" }, data).some(
			(e) => e.id === "heavy-strike",
		),
	);
	assert.ok(
		filterEntries(all, { query: "HD DT HR" }, data).some(
			(e) => e.id === "hypercarry",
		),
	);
	assert.ok(
		filterEntries(all, { query: "重击 破韧者" }, data).some(
			(e) => e.kind === "synergies" && e.id === "heavy-strike",
		),
	);
	assert.equal(
		filterEntries(all, { query: "totallynonexistent7868" }, data).length,
		0,
	);
});
test("class filters and favorite filters intersect", () => {
	const skills = filterEntries(all, { kind: "skills", cls: "support" }, data);
	assert.equal(skills.length, 4);
	assert.ok(skills.every((e) => e.cls === "support"));
	assert.deepEqual(
		filterEntries(all, { favorites: new Set(["skills/mend"]) }, data).map(
			(e) => e.id,
		),
		["mend"],
	);
});
test("short MOD searches do not match unrelated substrings", () => {
	assert.ok(
		!filterEntries(all, { query: "HD DT HR" }, data).some(
			(e) => e.kind === "synergies",
		),
	);
});
test("build parameters are normalized, unique, class-valid and capped", () => {
	const b = validateBuild(
		{
			cls: "cc",
			skill: "mend",
			passive: "bad",
			mods: ["hd", "hd", "bad", "dt", "hr", "fl"],
			star: 99,
			sig: "bad",
		},
		data,
	);
	assert.equal(b.cls, "cc");
	assert.notEqual(b.skill, "mend");
	assert.equal(b.star, 5);
	assert.deepEqual(b.mods, ["hd", "dt", "hr"]);
	assert.equal(b.sig, "");
});
test("build link round trip and signature exclusion", () => {
	const b = validateBuild(
		{
			cls: "tank",
			skill: "bulwark",
			passive: "bastion",
			mods: ["nf", "ht"],
			star: 3,
		},
		data,
	);
	assert.deepEqual(parseBuild(buildParams(b), data), b);
	assert.ok(synergyFor(b, data));
	assert.equal(synergyFor({ ...b, sig: "bite" }, data), null);
});
test("all guides reference valid class skill passive and mod data", () => {
	assert.ok(guides.guides.length >= 12);
	for (const g of guides.guides) {
		assert.ok(
			data.skills.some((s) => s.id === g.skill && s.cls === g.cls),
			g.id,
		);
		assert.ok(data.passives.some((p) => p.id === g.passive));
		for (const m of g.mods) assert.ok(data.mods.some((x) => x.id === m));
		assert.ok(g.mods.length <= 3);
		assert.ok(resolveCombos(g.mods, data.combos).length > 0);
		for (const k of ["why", "cautions", "stats", "rotation", "team"])
			assert.ok(g[k].length > 0);
	}
});
test("guide JS and JSON agree", () => {
	const context = vm.createContext({ window: {} });
	new vm.Script(
		fs.readFileSync(
			new URL("../../../public/gacha-wiki/guides.js", import.meta.url),
			"utf8",
		),
	).runInContext(context);
	assert.equal(
		JSON.stringify(context.window.WIKI_GUIDES),
		JSON.stringify(guides),
	);
});
