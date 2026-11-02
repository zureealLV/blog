import fs from "node:fs/promises";
import { resolveCombos } from "../../public/gacha-wiki/engine.mjs";
const read = (name) =>
	fs.readFile(new URL(name, import.meta.url), "utf8").then(JSON.parse);
const data = await read("../../public/gacha-wiki/data.json");
const { recipes, glossary, rules } = await read("editorial.json");
const guides = recipes.map((g) => {
	const active = resolveCombos(g.mods, data.combos);
	const synergy = data.synergies.find(
		(s) => s.skill === g.skill && s.passive === g.passive,
	);
	if (
		!active.length ||
		!synergy ||
		!data.skills.some((s) => s.id === g.skill && s.cls === g.cls)
	)
		throw Error("Recipe no longer matches rules: " + g.id);
	return {
		...g,
		why: [
			synergy.bonusZh,
			...active.map(
				(c) =>
					c.nameZh +
					"（" +
					c.mods.map((m) => m.toUpperCase()).join(" + ") +
					"）：" +
					c.textZh,
			),
		],
	};
});
const meta = {
	sourceUrl: data.meta.sourceUrl,
	sourceCheckedDate: data.meta.fetchedAt.slice(0, 10),
	version: data.meta.version,
	language: "zh-CN",
	evidenceType: "public-frontend-rules",
	guideType: "mechanics-based-inference",
	disclaimer:
		"构筑是 v" +
		data.meta.version +
		" 公开规则推导的示例，不是官方推荐、实测胜率榜或全局最优解。",
};
const result = { meta, guides, glossary, rules };
for (const [file, content] of [
	["guides.json", JSON.stringify(result, null, 2) + "\n"],
	["guides.js", "window.WIKI_GUIDES = " + JSON.stringify(result) + ";\n"],
])
	await fs.writeFile(
		new URL("../../public/gacha-wiki/" + file, import.meta.url),
		content,
	);
console.log("Generated " + guides.length + " v" + meta.version + " guides");
