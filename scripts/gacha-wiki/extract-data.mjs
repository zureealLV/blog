// Public static-rule extraction. Never executes the remote application.
// Only pinned, selected data initializers are evaluated in an isolated VM with
// no process, require, imports, DOM, fetch or code generation capabilities.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);
const evidence = path.join(root, "docs/gacha-wiki/evidence");
await fs.mkdir(evidence, { recursive: true });
const base = "https://osugacha.com";
const offline = process.argv.includes("--offline");
async function get(url, file) {
	if (offline) return fs.readFile(path.join(evidence, file), "utf8");
	const res = await fetch(url);
	if (!res.ok) throw Error(`${res.status}: ${url}`);
	const text = await res.text();
	await fs.writeFile(path.join(evidence, file), text);
	return text;
}
const homepage = await get(base + "/", "homepage.html");
const asset = (prefix) => {
	const m = homepage.match(
		new RegExp('href="(/assets/' + prefix + '-[\\w-]+\\.js)"'),
	);
	if (!m) throw Error("Changed entry graph: " + prefix);
	return m[1];
};
const rpgAsset = asset("ui"),
	tipAsset = asset("Tip"),
	entryAsset = asset("rpg");
const rpg = await get(base + rpgAsset, path.basename(rpgAsset));
const overlay = await get(base + tipAsset, path.basename(tipAsset));
const entry = await get(base + entryAsset, path.basename(entryAsset));
if (
	!entry.includes("./" + path.basename(rpgAsset)) ||
	!entry.includes("./" + path.basename(tipAsset))
)
	throw Error("RPG dependencies changed");
const localeFile = overlay.match(
	/zh:\(\)=>[^;]{0,60}?import\(`\.\/([\w-]+\.js)`\)/,
)?.[1];
if (!localeFile) throw Error("Chinese locale import missing");
const zhAsset = "/assets/" + localeFile,
	zhSource = await get(base + zhAsset, localeFile);
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const indexPath = homepage.match(/src="(\/assets\/index-[\w-]+\.js)"/)?.[1];
if (!indexPath) throw Error("Missing app entry");
const indexSource = await get(base + indexPath, path.basename(indexPath));
const patchFile = indexSource.match(
	/import\(`\.\/(Changelog-[\w-]+\.js)`\)/,
)?.[1];
if (!patchFile) throw Error("Missing changelog import");
const patchAsset = "/assets/" + patchFile,
	changelog = await get(base + patchAsset, patchFile);
const patchVersion = changelog.match(/version:`([\d.]+)`/)?.[1];
if (
	patchVersion !== "1.1" ||
	sha(changelog) !==
		"dc3ea0ec00f03818c26b43d29035137337778ad23e2217313ca1e720f3881ea0"
)
	throw Error("Unreviewed game release notes");
// Reviewed rules, locale, dependency/translation adapters. Never evaluate full bundles.
for (const [s, h] of [
	[rpg, "0a289a1ee6cc1a3e1d58f9b29a239e45eb460b9697ccc69cf0ff36cc5e40a59a"],
	[entry, "049d26ecf89a40b44aec0ce04883ad2a3f08f1694fcc3e86bb6eb5338b5a1672"],
	[overlay, "bb6f0a81f4839b5b7ca4c6ab0da11cfec9d5a195c841db82eec0a3c7d5bd35f5"],
	[
		zhSource,
		"9a7e7c7eb9a25f9a63a4ea19a8f3be2f70f8f358d92645505cab767330e30320",
	],
])
	if (sha(s) !== h) throw Error("Unreviewed source fingerprint; stop.");
// Lexical, brace-aware extraction of an initializer. Strings and nested template
// interpolation are skipped as units; no evaluation occurs while finding it.
function initializer(src, name) {
	const re = new RegExp(
		`(?:var |[,;])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=`,
		"g",
	);
	const match = re.exec(src);
	if (!match) throw Error("Missing initializer " + name);
	const start = match.index + match[0].length;
	function string(i, q) {
		for (i++; i < src.length; i++) {
			if (src[i] === "\\") {
				i++;
				continue;
			}
			if (src[i] === q) return i + 1;
			if (q === "`" && src[i] === "$" && src[i + 1] === "{")
				i = code(i + 2, "}") - 1;
		}
		throw Error("Unclosed string");
	}
	function code(i, end) {
		for (; i < src.length; i++) {
			let c = src[i];
			if (c === end) return i + 1;
			if (c === '"' || c === "'" || c === "`") {
				i = string(i, c) - 1;
				continue;
			}
			if (c === "{" || c === "[" || c === "(") {
				i = code(i + 1, { "{": "}", "[": "]", "(": ")" }[c]) - 1;
				continue;
			}
			if (!end && (c === "," || c === ";")) return i;
		}
		throw Error("Unclosed expression " + name);
	}
	return src.slice(start, code(start, null));
}
const ctx = vm.createContext(Object.create(null), {
	codeGeneration: { strings: false, wasm: false },
});
function read(src, name, as = name) {
	const expr = initializer(src, name);
	if (
		/\b(?:import|require|eval|Function|process|fetch|window|document|globalThis|constructor|prototype|__proto__)\b/.test(
			expr,
		)
	)
		throw Error("Unsafe token in " + name);
	const value = new vm.Script("(" + expr + ")").runInContext(ctx, {
		timeout: 500,
	});
	ctx[as] = value;
	return value;
}
// Local, checked formatting helpers used by the selected data tables.
const pct = (v, n) => `${+(v * 100).toFixed(n)}%`;
ctx.M = (v) => pct(v, 1);
ctx.W = (v) => pct(v, 2);
ctx.L = ctx.ga = ctx.En = (v) => pct(v, 0);
ctx.q = (v) => pct(v, 1);
const statNames = {
	atk: "ATK",
	maxHp: "HP",
	def: "DEF",
	bonusAtk: "bonus ATK",
	bonusHp: "bonus HP",
	bonusDef: "bonus DEF",
};
function scaled(v) {
	return Object.entries(v)
		.filter(([, n]) => n)
		.map(([k, n]) => ctx.M(n) + " " + statNames[k])
		.join(" + ");
}
ctx.gn = (v) => (typeof v === "number" ? ctx.M(v) : scaled(v));
ctx.mn = (v, k) =>
	typeof v === "number" ? ctx.M(v) + " " + statNames[k] : scaled(v);
const zh = {
	...read(zhSource, "e", "locale"),
	...read(zhSource, "t", "contentLocale"),
};
const r = (n, alias) => read(rpg, n, alias || n);
for (const [n, a] of [
	["N", "P"],
	["F", "I"],
	["B", "Bn"],
	["G", "K"],
	["R", "z"],
	["un", "xn"],
	["ma", "ma"],
])
	r(n, a);
for (const n of ["tn", "nn", "ha", "si", "rn", "H"]) r(n);
ctx.U = ctx.H;
for (const n of ["ln", "dn", "hn", "_n", "vn", "yn", "bn"]) r(n);
const classes = r("an"),
	skills = r("Sn"),
	passives = r("Tn"),
	synergies = r("Vn"),
	modIds = r("pr"),
	mods = r("gr"),
	mainWeights = r("_r"),
	mainMax = r("vr"),
	subBase = r("yr"),
	rarityScale = r("xr"),
	maxLevels = r("Sr"),
	initialSubs = r("Cr"),
	modStarScale = r("Rr");
const combos = r("Hr"),
	signatures = r("ri"),
	teams = r("_a"),
	floorMods = r("ja"),
	bosses = r("Ma"),
	stats = r("ur"),
	ascensionCaps = r("ci"),
	rarityBase = r("Vi"),
	classEidolons = r("Dn");
const reviewedZh = {
	"sig.payload.skill.text":
		"对一名敌人造成 175% 伤害并打上裁切标记。在下一个敌人的回合开始前（无论是谁），第二次曝光落在该敌人身上，再造成 145% 伤害。",
	"sig.bite.skill.text":
		"撕咬一名敌人造成 140% 伤害与大量削韧，并钻进其脑中：2 回合内它必须攻击本卡，且造成的伤害降低 20%。为自身提供 DEF 50% 的护盾，为其他每名队友提供 8% 的护盾。",
	"sig.stream.skill.text":
		"对一名敌人攻击 3 次，每层 Ramp Up 额外攻击 1 次，每次造成 ATK 38% + 额外 ATK 5% 伤害（若其倒下，其余攻击转向 HP 最低的敌人）。随后 Ramp Up 重新开始。",
	"sig.ramen.skill.text":
		"把下一种配料加进碗里并端上：为每名队友恢复 HP 5%，再加上碗里每种配料的效果。\n叉烧：2 回合内 ATK +15%。\n溏心蛋：2.5% 的护盾。\n海苔：驱散一个减益。\n葱花：下个回合提前 15% 到来。",
	"sig.heatwave.skill.text":
		"对一名敌人造成 180% 伤害，热浪使所有敌人在下个回合减速 22%。",
	"sig.rain.skill.text":
		"雨落全队：每名队友在接下来 3 个回合的开始时各恢复本卡 HP 8%。",
	"sig.rain.passive.text":
		"再次施放 Rainfall 时仍处于其效果中的队友立即恢复 7%。",
	"sig.haze.skill.text":
		"对一名敌人造成 160% 伤害并让敌方全队陷入雾中：所有敌人在下个回合处于朦胧状态，看不清目标，单体攻击会落在随机目标身上。",
	"sig.haze.passive.text": "朦胧的敌人有 25% 的单体攻击会落空。",
};
const tr = (key, fallback) => {
	const value = reviewedZh[key] ?? zh[key] ?? fallback;
	return typeof value === "string"
		? value
				.replaceAll("而非一半", "而非 50%")
				.replaceAll("若其 target HP 低于", "若目标生命低于")
				.replaceAll("若其 ally HP 低于", "若队友生命低于")
				.replaceAll("target HP", "目标生命")
				.replaceAll("ally HP", "队友生命")
				.replaceAll("target DEF", "目标防御")
		: value;
};
const arr = (o) => Object.entries(o).map(([id, v]) => ({ id, ...v }));
const percent = (e) => `${+(e * 100).toFixed(2)}%`;
const starText = (id, star) => {
	const x = modStarScale[star],
		p = (n) => percent(n * x);
	return {
		ez: [
			`+${p(0.1)} HP, +${p(0.1)} Healing`,
			`HP +${p(0.1)}，治疗量 +${p(0.1)}。`,
		],
		nf: [
			`Shields ${p(0.15)} stronger; 8% less damage taken while shielded`,
			`提供的护盾 +${p(0.15)}；有护盾时受到伤害降低 8%。`,
		],
		ht: [
			`+${p(0.12)} DEF; slows it applies last 1 turn longer`,
			`DEF +${p(0.12)}；施加的减速延长 1 回合。`,
		],
		hr: [`+${p(0.06)} CRIT Rate`, `暴击率 +${p(0.06)}。`],
		sd: [
			`+${p(0.2)} DMG to enemies under 50% HP; −${p(0.08)} max HP`,
			`对 HP 低于 50% 的敌人伤害 +${p(0.2)}；自身 HP 上限 −${p(0.08)}。`,
		],
		dt: [
			`+${+(6 * x).toFixed(1)} SPD`,
			`速度 +${+(6 * x).toFixed(1)}（固定值）。`,
		],
		hd: [
			`Debuffs ${p(0.2)} stronger; +${p(0.1)} DMG to debuffed enemies`,
			`施加的减益强度 +${p(0.2)}；对带减益敌人的伤害 +${p(0.1)}。`,
		],
		fl: [
			`+${p(0.12)} DMG with single-target moves`,
			`单体招式伤害 +${p(0.12)}。`,
		],
		nc: [
			`Skills ${p(0.15)} stronger`,
			`战技的伤害、治疗和护盾效果 +${p(0.15)}。`,
		],
		pf: [
			`+${p(0.2)} CRIT DMG, +${p(0.1)} more while above 80% HP`,
			`暴击伤害 +${p(0.2)}；HP 高于 80% 时额外 +${p(0.1)}。`,
		],
		so: [
			`+${p(0.35)} Guard damage; +${p(0.15)} DMG to Broken enemies`,
			`削韧 +${p(0.35)}；对被击破敌人的伤害 +${p(0.15)}。`,
		],
		rx: [
			`Buffs it gives ${p(0.2)} stronger and 1 turn longer`,
			`施加的增益强度 +${p(0.2)}，持续时间延长 1 回合。`,
		],
	}[id];
};
const data = {
	meta: {
		fetchedAt: new Date().toISOString(),
		sourceUrl: base + rpgAsset,
		sourceHash: crypto.createHash("sha256").update(rpg).digest("hex"),
		build: rpgAsset.split("/").pop(),
		localeUrl: base + zhAsset,
		localeHash: crypto.createHash("sha256").update(zhSource).digest("hex"),
		scope: "公开前端规则快照；非账号库存、非实时服务端权威结算。",
		translation:
			"普通条目采用原站中文词典；签名说明按同版英文规则校正过期中文数值，签名名称与补充机制为人工整理，并保留英文原文。",
		counts: {},
	},
	classes: arr(classes).map((v) => ({
		...v,
		nameZh: tr("class." + v.id, v.name),
		text: v.identity,
		textZh: tr("class." + v.id + ".identity", v.identity),
	})),
	skills: arr(skills).map((v) => ({
		...v,
		nameZh: tr("skill." + v.id, v.name),
		textZh: tr("skill." + v.id + ".text", v.text),
	})),
	passives: arr(passives).map((v) => ({
		...v,
		nameZh: tr("passive." + v.id, v.name),
		textZh: tr("passive." + v.id + ".text", v.text),
		comboZh: v.combo
			? ({
					"guard-breaker": "快速击破，为乘虚而入、追击和势如破竹队友创造机会。",
					exploit: "与破韧者搭配。",
					"weak-point": "与使用诅咒的法师搭配。",
					"follow-up": "与破韧者和盾击搭配。",
					momentum: "与盾击及重击搭配：击破能带动全队。",
					opportunist: "与任意法师搭配。",
				}[v.id] ?? v.combo)
			: undefined,
	})),
	synergies: arr(synergies).map((v) => ({
		...v,
		skill: v.id,
		whyZh: tr("godroll." + v.id + ".why", v.why),
		bonusZh: tr("godroll." + v.id, v.bonus),
	})),
	mods: modIds.map((id) => ({
		id,
		...mods[id],
		nameZh: {
			ez: "简单",
			nf: "不失败",
			ht: "半速",
			hr: "困难",
			sd: "猝死",
			dt: "双倍速",
			hd: "隐藏",
			fl: "手电筒",
			nc: "夜核",
			pf: "完美",
			so: "自动转盘",
			rx: "放松",
		}[id],
		text: mods[id].bonus,
		textZh: tr("mod." + id + ".bonus", mods[id].bonus),
		identityZh: tr("mod." + id + ".identity", mods[id].identity),
		effectsByStar: [1, 2, 3, 4, 5].map((star) => {
			const [text, textZh] = starText(id, star);
			return { star, text, textZh };
		}),
		mainStatWeights: mainWeights[id],
	})),
	combos: combos.map((v) => ({
		...v,
		nameZh: tr("combo." + v.id, v.name),
		forWhoZh: tr("combo." + v.id + ".for", v.forWho),
		textZh: tr("combo." + v.id + ".text", v.text),
	})),
	signatures: arr(signatures).map((v) => {
		const alias = {
			volley: ["清垒打", "强打者"],
			payload: ["双重曝光", "裁切标记"],
			replay: ["星光", "恩典"],
			bite: ["心灵咬击", "暗流"],
			stream: ["连打", "渐入佳境"],
			ramen: ["酱油拉面", "慢火熬煮"],
			heatwave: ["热浪", "热身"],
			rain: ["降雨", "绵绵细雨"],
			haze: ["迷雾", "低能见度"],
		}[v.id];
		const localized = (key, obj, name) => {
			const text = tr("sig." + v.id + "." + key + ".text");
			if (!text) throw Error("Missing signature translation: " + v.id + key);
			return { ...obj, nameZh: name, textZh: text };
		};
		return {
			...v,
			name: v.skill.name,
			nameZh: alias[0],
			skill: localized("skill", v.skill, alias[0]),
			passive: localized("passive", v.passive, alias[1]),
			...(v.basic ? { basic: localized("basic", v.basic, "恩典普攻") } : {}),
		};
	}),
	teamSynergies: teams.map((v) => ({
		...v,
		nameZh: tr("synergy." + v.id, v.name),
		textZh: tr("synergy." + v.id + ".text", v.text),
	})),
	floorMods: arr(floorMods).map((v) => ({
		...v,
		nameZh: tr("floorMod." + v.id, v.name),
		textZh: tr("floorMod." + v.id + ".text", v.text),
	})),
	bosses: arr(bosses).map((v) => ({
		...v,
		nameZh: tr("boss." + v.id, v.name),
		textZh: tr("boss." + v.id + ".text", v.text),
	})),
	stats: arr(stats).map((v) => ({ ...v, nameZh: tr("stat." + v.id, v.name) })),
	modGrowth: {
		maxLevels,
		initialSubs,
		rarityScale,
		mainMax,
		subBase,
		subRollFactors: [0.8, 0.9, 1],
		mainFormula:
			"5★ 基准 × 星级系数 × (1 + 5.17 × 强化等级 / 15) / 6.17；百分比保留 4 位小数，固定值保留 1 位。",
		note: "mainMax 是 5★ +15 基准；其他星级必须同时应用星级系数和各自等级上限。",
	},
	growth: { ascensionCaps, rarityBase, classEidolons },
	mechanics: [],
};
// Designed enemy squads, not inferred player recommendations or actual inventories.
// These local constructors decode only the reviewed So table's J()/Y() records.
ctx.J = (cls, skill, passive, gear) => ({
	cls,
	skill,
	passive,
	gear: String(gear)
		.split(" ")
		.map((pair) => {
			const [mod, stat] = pair.split(":");
			return { mod, stat };
		}),
});
ctx.Y = (x) => x;
const squadTable = r("So");
data.depthTeams = Object.entries(squadTable).flatMap(([pool, teams]) =>
	teams.map((team) => {
		const nameZh = zh["comp." + team.id],
			textZh = zh["comp." + team.id + ".text"];
		if (!nameZh || !textZh || team.slots.length !== 4)
			throw Error("Unreviewed squad: " + team.id);
		return { ...team, pool: Number(pool), nameZh, textZh };
	}),
);

const gateNotes = [
	[
		"windup",
		"Wind-up",
		"敌人锁定目标蓄力，在第二个自身回合打出 300% ATK。用盾击或重击及时击破可以取消；来不及击破时，可用嘲讽接招或拖延施放者。",
		"A Break interrupts the charged attack; Taunting can intercept it.",
	],
	[
		"core",
		"Core",
		"核心韧性还在时，其他敌人受伤减半，核心受到的战技伤害也减半。用高削韧战技先击破核心，利用随后己方 2 个回合，全体敌人承伤 +30% 的窗口爆发。",
		"Break the Core first. The resulting two-turn opening makes all enemies take 30% more damage.",
	],
	[
		"caller",
		"Caller",
		"召唤者每第 3 个自身回合会让一名倒下的同伴以 40% 生命和满韧性复起。优先集火召唤者；如果做不到，拖延它的行动，别任由它反复拉起同一个目标。",
		"The Caller revives a fallen ally every third turn. Focus or delay it.",
	],
	[
		"holdout",
		"Hold out",
		"敌人每次行动会变强；阵亡后等己方 2 回合又会以 50% 生命复起并失去成长。撑过己方 26 回合即胜，每次击倒让计数少 2；同时击倒全部四名敌人也算赢。优先压住成长最高的敌人。",
		"Survive the counter or knock out all four at once. Each KO shortens the counter and resets that foe’s growth when it revives.",
	],
	[
		"mirror",
		"Mirror Wall",
		"战技攻击韧性未破的敌人会反弹 60% 伤害；普攻不反弹，且造成双倍削韧。先普攻击破，再交高伤战技。能直接击破或击倒目标的那次战技也不反弹。",
		"Basics do not reflect and deal double Guard damage. Save hard-hitting skills for the opening.",
	],
	[
		"choir",
		"Choir",
		"歌者每第 3 个自身回合治疗全队 30% 并清除减益。让法师拖延或让坦克击破歌者，然后在下一次治疗前集火；只铺减益而不改变其行动顺序容易白忙。",
		"The singer heals and cleanses every third turn. Time a delay or Break before that turn.",
	],
	[
		"hunt",
		"Hunt",
		"猎手盯上生命最低的卡，对其伤害 +60%；猎手普攻回 2 战技点。先保护被标记的队友，或用嘲讽接住攻击。目标倒下会换标记，不是牺牲一张就结束。",
		"The Hunter marks the weakest card for 60% more damage and gains 2 SP on Basics. Protect the marked ally.",
	],
];
data.depthGates = gateNotes.map(([id, name, textZh, text]) => ({
	id,
	name,
	nameZh: tr("depths.sit." + id + ".name", name),
	text,
	textZh,
}));
data.meta.signatureScope =
	"仅收录公开前端的 9 套签名技能模板，不猜测模板对应的玩家、卡面、当期卡池或持有情况；中文签名名称为本站辅助译名。";
data.meta.rulePriority =
	"数值以本次英文规则和实现快照为核对基准；中文词典数值滞后时按同版规则校正。战斗实装的限制和例外在机制条目中单列。";
data.meta.clientBuild = overlay.match(/"x-client-build":`(\d+)`/)?.[1] ?? null;
data.meta.version = patchVersion;
data.meta.patchHash = sha(changelog);
data.meta.patchUrl = "https://osugacha.com/changelog";
data.meta.patchAsset = base + patchAsset;
data.meta.entryUrl = base + entryAsset;
data.meta.updateNote =
	"v1.1（含 v1.0 / 1.0.1）：职业与技能平衡重做，加入深境、月度高塔、MOD 宝石和 A7–A24 晋阶。";
if (offline) {
	const prev = JSON.parse(
		await fs.readFile(path.join(evidence, "source-manifest.json"), "utf8"),
	);
	if (prev.sourceHash === data.meta.sourceHash)
		data.meta.fetchedAt = prev.fetchedAt;
}
// Additional mechanics are concise explanations checked against the same bundle.
data.mechanics = JSON.parse(
	await fs.readFile(
		path.join(root, "scripts/gacha-wiki/mechanics.json"),
		"utf8",
	),
);
data.statuses = arr(read(rpg, "ic")).map((v) => {
	const names = {
		expose: "易伤",
		weaken: "虚弱",
		slow: "减速",
		atk: "攻击提升",
		dmg: "伤害提升",
		taunt: "嘲讽",
		counter: "反击",
		ward: "减伤",
		fixate: "锁定",
		haze: "迷雾",
	};
	const texts = {
		expose: "受到更多伤害。",
		weaken: "造成的伤害降低。",
		slow: "行动变慢。",
		atk: "攻击力提升。",
		dmg: "造成的伤害提升。",
		taunt:
			"敌方单体攻击必须攻击嘲讽者；嘲讽者分担队友受到的部分伤害。被击破会解除嘲讽。",
		counter: "嘲讽状态下受到攻击会反击。",
		ward: "受到的伤害降低。",
		fixate: "必须攻击对自己施加咬击标记的卡牌。",
		haze: "单体攻击随机选择目标，并可能落空。",
	};
	return { ...v, nameZh: names[v.id], textZh: texts[v.id] };
});
for (const k of [
	"classes",
	"skills",
	"passives",
	"synergies",
	"mods",
	"combos",
	"signatures",
	"teamSynergies",
	"depthTeams",
	"depthGates",
	"floorMods",
	"bosses",
	"mechanics",
	"statuses",
])
	data.meta.counts[k] = data[k].length;
const expected = {
	classes: 4,
	skills: 16,
	passives: 19,
	synergies: 16,
	mods: 12,
	combos: 28,
	signatures: 9,
	teamSynergies: 16,
	floorMods: 6,
	bosses: 4,
};
for (const [k, n] of Object.entries(expected))
	if (data[k].length !== n)
		throw Error(`Unexpected ${k}: ${data[k].length}, review required.`);
await fs.mkdir(path.join(root, "public/gacha-wiki"), { recursive: true });
await fs.writeFile(
	path.join(root, "public/gacha-wiki", "data.json"),
	JSON.stringify(data, null, 2) + "\n",
);
await fs.writeFile(
	path.join(root, "public/gacha-wiki", "data.js"),
	"window.WIKI_DATA = " + JSON.stringify(data) + ";\n",
);
await fs.writeFile(
	path.join(evidence, "source-manifest.json"),
	JSON.stringify(data.meta, null, 2) + "\n",
);
console.log(JSON.stringify(data.meta, null, 2));
