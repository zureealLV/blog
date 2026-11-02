import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
	buildWarnings,
	filterEntries,
	flatten,
	buildParams,
	parseBuild,
	synergyFor,
	resolveCombos,
} from "../../../public/gacha-wiki/engine.mjs";
const read = (name) =>
	JSON.parse(
		fs.readFileSync(
			new URL("../../../public/gacha-wiki/" + name, import.meta.url),
		),
	);
const data = read("data.json"),
	guides = read("guides.json");
test("v1.1 live fingerprints and guide provenance match", () => {
	assert.equal(data.meta.version, "1.1");
	assert.equal(guides.meta.version, data.meta.version);
	assert.equal(guides.meta.sourceUrl, data.meta.sourceUrl);
	assert.equal(data.meta.clientBuild, "1793582738377");
	assert.match(data.meta.patchHash, /^[a-f0-9]{64}$/);
});
test("localized signature skill/passive/basic percentages match reviewed tables", () => {
	const pct = (s) => (s.match(/\d+(?:\.\d+)?%/g) || []).sort();
	for (const x of data.signatures)
		for (const type of ["skill", "passive", "basic"])
			if (x[type])
				assert.deepEqual(
					pct(x[type].textZh),
					pct(x[type].text),
					x.id + "/" + type,
				);
	assert.match(
		data.signatures.find((s) => s.id === "stream").skill.textZh,
		/攻击 3 次/,
	);
	assert.match(
		data.signatures.find((s) => s.id === "rain").skill.textZh,
		/3 个回合/,
	);
});
test("v1.1 effects replace old figures on guides, MOD stars and growth", () => {
	assert.match(
		synergyFor({ skill: "heavy-strike", passive: "guard-breaker" }, data)
			.bonusZh,
		/60%/,
	);
	for (const g of guides.guides) {
		const sy = synergyFor(g, data);
		assert.ok(g.why.includes(sy.bonusZh));
		for (const c of resolveCombos(g.mods, data.combos))
			assert.ok(g.why.some((x) => x.includes(c.textZh)));
	}
	assert.match(
		data.mods.find((m) => m.id === "pf").effectsByStar[4].text,
		/20%.*10%/,
	);
	assert.match(
		data.mods.find((m) => m.id === "so").effectsByStar[4].text,
		/35%.*15%/,
	);
	assert.equal(data.growth.ascensionCaps[24], 170);
});
test("Execute needs Bloodlust and an eligible active combo", () => {
	const warning = (mods, passive = "bloodlust") =>
		buildWarnings({ skill: "execute", mods, passive }, data).some((x) =>
			x.includes("处决再动未就绪"),
		);
	assert.ok(warning(["sd", "pf"]));
	assert.ok(warning(["hd", "dt", "hr"], "deadeye"));
	for (const mods of [
		["hd", "dt", "hr"],
		["sd", "pf", "fl"],
		["hd", "hr", "pf"],
	])
		assert.ok(!warning(mods));
});
test("depth templates have 72 valid loadouts; builder links do not discard any selection", () => {
	for (const team of data.depthTeams) {
		assert.equal(team.slots.length, 4);
		for (const slot of team.slots) {
			const b = { ...slot, mods: slot.gear.map((x) => x.mod), star: 5 },
				decoded = parseBuild(buildParams(b), data);
			for (const k of ["skill", "cls", "passive", "mods"])
				assert.deepEqual(decoded[k], b[k], team.id + "/" + k);
			for (const item of slot.gear)
				assert.ok(data.stats.some((x) => x.id === item.stat));
		}
	}
	assert.equal(data.depthTeams.length, 18);
});
test("current Mage, older CC label, all seven gates and mode rules are searchable", () => {
	const all = flatten(data);
	for (const q of ["法师", "控制"])
		assert.ok(
			filterEntries(all, { query: q, kind: "skills" }, data).some(
				(x) => x.id === "stall",
			),
		);
	assert.equal(data.depthGates.length, 7);
	for (const id of ["tower", "depths", "stones", "rally"])
		assert.ok(all.find((x) => x.kind === "mechanics" && x.id === id));
	assert.ok(
		filterEntries(all, { kind: "depthTeams", query: "战歌" }, data).length > 0,
	);
});
