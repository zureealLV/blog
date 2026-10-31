export const categories = {
	skills: { name: "战技", en: "Skills", icon: "✦" },
	passives: { name: "被动", en: "Passives", icon: "◈" },
	synergies: { name: "专属联动", en: "Skill synergies", icon: "⌘" },
	mods: { name: "MOD 图鉴", en: "Equipment mods", icon: "⬡" },
	combos: { name: "MOD 组合", en: "Mod combinations", icon: "⨯" },
	signatures: { name: "签名技能", en: "Signature kits", icon: "✧" },
	classes: { name: "职业", en: "Classes", icon: "◇" },
	teamSynergies: { name: "阵容羁绊", en: "Team synergies", icon: "◎" },
	floorMods: { name: "楼层规则", en: "Floor modifiers", icon: "▤" },
	bosses: { name: "Boss 特性", en: "Boss traits", icon: "⚑" },
	mechanics: { name: "养成与机制", en: "Mechanics", icon: "≡" },
	statuses: { name: "状态效果", en: "Status effects", icon: "◌" },
};
export const classNames = {
	tank: "坦克",
	dps: "输出",
	support: "辅助",
	cc: "控制",
};
export const normalize = (v) =>
	String(v ?? "")
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[\s+＋\-_/·!]/g, "");
export function resolveCombos(mods, combos) {
	const set = new Set(mods),
		matches = combos.filter((c) => c.mods.every((m) => set.has(m)));
	const triple = matches.find((c) => c.mods.length === 3);
	return triple ? [triple] : matches.filter((c) => c.mods.length === 2);
}
export function comboResolution(mods, combos) {
	const active = resolveCombos(mods, combos);
	return {
		active,
		suppressed: combos.filter(
			(c) =>
				c.mods.length === 2 &&
				c.mods.every((m) => mods.includes(m)) &&
				!active.includes(c),
		),
	};
}
export function flatten(data) {
	return Object.keys(categories).flatMap((kind) =>
		(data[kind] || []).map((item) => ({
			...item,
			kind,
			key: `${kind}/${item.id}`,
		})),
	);
}
export function label(item, data) {
	if (!item) return "未知条目";
	if (
		item.kind === "synergies" ||
		(item.skill && typeof item.skill === "string" && item.passive)
	) {
		const s = data.skills.find((s) => s.id === (item.skill || item.id)),
			p = data.passives.find((p) => p.id === item.passive);
		return `${s?.nameZh || s?.name || item.skill} × ${p?.nameZh || p?.name || item.passive}`;
	}
	return item.nameZh || item.titleZh || item.name || item.title || item.id;
}
export function describe(item) {
	return (
		item.textZh ||
		item.bonusZh ||
		item.descriptionZh ||
		item.text ||
		item.bonus ||
		item.description ||
		""
	);
}
export function searchable(item, data) {
	const related =
		item.kind === "synergies"
			? [
					data.skills.find((s) => s.id === (item.skill || item.id)),
					data.passives.find((p) => p.id === item.passive),
				]
			: [];
	return normalize(
		[
			label(item, data),
			categories[item.kind]?.name,
			JSON.stringify(item),
			...related.map((x) => JSON.stringify(x)),
			classNames[item.cls],
		].join(" "),
	);
}
function stringValues(v) {
	return typeof v === "string"
		? [v]
		: Array.isArray(v)
			? v.flatMap(stringValues)
			: v && typeof v === "object"
				? Object.values(v).flatMap(stringValues)
				: [];
}
function matchesTerm(item, term, data) {
	if (data.mods.some((m) => m.id === term)) {
		const words =
			stringValues(item)
				.join(" ")
				.toLowerCase()
				.match(/\b(?:ez|nf|ht|hr|sd|dt|hd|fl|nc|pf|so|rx)\b/g) || [];
		return words.includes(term);
	}
	return searchable(item, data).includes(term);
}
export function filterEntries(
	entries,
	{ query = "", kind = "all", cls = "all", favorites = null },
	data,
) {
	const terms = query.trim().split(/\s+/).map(normalize).filter(Boolean);
	return entries.filter((e) => {
		const entryClass =
			e.cls ||
			(e.kind === "classes"
				? e.id
				: e.kind === "synergies"
					? data.skills.find((s) => s.id === (e.skill || e.id))?.cls
					: null);
		return (
			(kind === "all" || e.kind === kind) &&
			(cls === "all" || !entryClass || entryClass === cls) &&
			(!favorites || favorites.has(e.key)) &&
			terms.every((t) => matchesTerm(e, t, data))
		);
	});
}
export function validateBuild(raw, data) {
	const sig = data.signatures.some((s) => s.id === raw.sig) ? raw.sig : "";
	const cls = sig
		? data.signatures.find((s) => s.id === sig).cls
		: Object.hasOwn(classNames, raw.cls)
			? raw.cls
			: "dps";
	const skill =
		data.skills.find((s) => s.id === raw.skill && s.cls === cls)?.id ||
		data.skills.find((s) => s.cls === cls)?.id;
	const passive = data.passives.some((p) => p.id === raw.passive)
		? raw.passive
		: data.passives[0]?.id;
	const mods = [
		...new Set(
			(raw.mods || []).filter((m) => data.mods.some((x) => x.id === m)),
		),
	].slice(0, 3);
	const star = Math.max(1, Math.min(5, Number(raw.star) || 5));
	return { cls, skill, passive, mods, sig, star: Math.round(star) };
}
export function buildWarnings(build, data) {
	const warnings = [];
	if (build.sig === "replay")
		warnings.push(
			"星光 / 恩典技能组不攻击。命中暴击或削韧组合，不代表它能触发收益；请优先检查治疗、增益与行动提前方向。",
		);
	if (
		!build.sig &&
		build.skill === "mend" &&
		build.passive === "lifeline" &&
		resolveCombos(build.mods, data.combos).some((c) => c.id === "sustain")
	)
		warnings.push(
			"治愈专属联动的 25% 与续航的 10% 是各自转盾路径的限制，不能直接相加成固定 35% 护盾。",
		);
	return warnings;
}
export function synergyFor(build, data) {
	return build.sig
		? null
		: data.synergies.find(
				(s) => (s.skill || s.id) === build.skill && s.passive === build.passive,
			) || null;
}
export function buildParams(build) {
	const p = new URLSearchParams();
	for (const k of ["cls", "skill", "passive", "sig", "star"])
		if (build[k]) p.set(k, build[k]);
	p.set("mods", build.mods.join(","));
	return p.toString();
}
export function parseBuild(query, data) {
	const p = new URLSearchParams(query);
	return validateBuild(
		{
			cls: p.get("cls"),
			skill: p.get("skill"),
			passive: p.get("passive"),
			sig: p.get("sig"),
			mods: (p.get("mods") || "").split(","),
			star: p.get("star"),
		},
		data,
	);
}
