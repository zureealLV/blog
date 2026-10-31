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
const rpgAsset = homepage.match(/href="(\/assets\/rpg-[^"]+\.js)"/)?.[1];
const overlayAsset = homepage.match(
	/href="(\/assets\/overlays-[^"]+\.js)"/,
)?.[1];
if (!rpgAsset || !overlayAsset)
	throw Error("Asset layout changed; manual review required.");
const rpg = await get(base + rpgAsset, path.basename(rpgAsset));
const overlay = await get(base + overlayAsset, path.basename(overlayAsset));
const zhAsset =
	"/assets/" +
	overlay.match(/zh:\(\)=>[^;]{0,50}?import\(`\.\/([^`]+)`\)/)?.[1];
if (zhAsset.endsWith("undefined"))
	throw Error("Chinese locale asset not found");
const zhSource = await get(base + zhAsset, path.basename(zhAsset));
// A changed build must be reviewed before any selected initializer is evaluated.
// Reviewed 2026-10-31: only the overlays import name changed in RPG; overlays
// itself only changed x-client-build. See evidence/UPDATE-20261031.md and tests.
const approvedHashes = {
	rpg: "0f7c0ff382b7c9f314bf04c15ce657f2f85290ae533cb31ed34c99c52757b9bb",
	zh: "bc19f4a87c20765f5955336173f5ef182e166dc7aeae4f31b7de39e09501d2b6",
};
for (const [k, s] of Object.entries({ rpg, zh: zhSource }))
	if (crypto.createHash("sha256").update(s).digest("hex") !== approvedHashes[k])
		throw Error(
			`The ${k} source changed. Review data initializers and translations, then update the approved hash; do not silently reuse the old extraction mapping.`,
		);

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
// Local formatting helpers, not remote code.
ctx.x = (e) => `${Math.round(e * 1000) / 10}%`;
ctx.T = (e) => `${Math.round(e * 100)}%`;
ctx.W = (e) => `${Math.round(e * 1000) / 10}%`;
ctx.q = (e) => `${+(e * 100).toFixed(1)}%`;
ctx.Jt = (e) => `${Math.round(e * 100)}%`;
const zh = {
	...read(zhSource, "e", "locale"),
	...read(zhSource, "t", "contentLocale"),
};
const classes = read(rpg, "_");
read(rpg, "y", "b");
const skills = read(rpg, "oe");
read(rpg, "C", "w");
const passives = read(rpg, "E");
read(rpg, "N", "P");
const synergies = read(rpg, "he");
const modIds = read(rpg, "Me"),
	mods = read(rpg, "Fe"),
	mainWeights = read(rpg, "B"),
	mainMax = read(rpg, "V"),
	subBase = read(rpg, "Ie"),
	rarityScale = read(rpg, "Re"),
	maxLevels = read(rpg, "H"),
	initialSubs = read(rpg, "ze"),
	modStarScale = read(rpg, "et");
read(rpg, "U");
const combos = read(rpg, "it");
read(rpg, "G", "K");
const signatures = read(rpg, "dt");
read(rpg, "J");
const teams = read(rpg, "Yt"),
	floorMods = read(rpg, "cn"),
	bosses = read(rpg, "ln");
const stats = read(rpg, "ke"),
	ascensionCaps = read(rpg, "ht"),
	rarityBase = read(rpg, "jt"),
	classEidolons = read(rpg, "D");
const tr = (key, fallback) => zh[key] ?? fallback;
const arr = (o) => Object.entries(o).map(([id, v]) => ({ id, ...v }));
const percent = (e) => `${+(e * 100).toFixed(2)}%`;
const starText = (id, star) => {
	const x = modStarScale[star],
		p = (n) => percent(n * x);
	return {
		ez: [
			`+${p(0.1)} HP, +${p(0.1)} Outgoing Healing`,
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
			`+${p(0.12)} CRIT DMG, +${p(0.06)} more while above 80% HP`,
			`暴击伤害 +${p(0.12)}；HP 高于 80% 时额外 +${p(0.06)}。`,
		],
		so: [
			`+${p(0.25)} Guard damage; +${p(0.1)} DMG to Broken enemies`,
			`削韧 +${p(0.25)}；对被击破敌人的伤害 +${p(0.1)}。`,
		],
		rx: [
			`Buffs it gives ${p(0.2)} stronger and 1 turn longer`,
			`施加的增益强度 +${p(0.2)}，持续时间延长 1 回合。`,
		],
	}[id];
};
const signatureZh = {
	volley: {
		name: "清垒打",
		skillName: "清垒打",
		skill:
			"造成总计 390% ATK 的伤害，均分给存活敌人，每名敌人最多承受 160% ATK；从 HP 最低者开始结算。击倒后的溢出伤害继续分给其他敌人。",
		passiveName: "强打者",
		passive:
			"每当一名队友使用战技，一名跑者上垒，最多 3 名。清垒打消耗所有跑者，每名使其伤害提高 20%。",
	},
	payload: {
		name: "双重曝光",
		skillName: "双重曝光",
		skill:
			"对一名敌人造成 170% ATK 伤害并留下裁切标记。下一个敌方回合开始前，对即将行动的那名敌人再造成 140% ATK 伤害。",
		passiveName: "裁切标记",
		passive:
			"有裁切标记的敌人在其下次回合前，受到所有来源的伤害提高 25%。若其先被击倒，标记转移至 HP 最低的敌人。",
	},
	replay: {
		name: "星光",
		skillName: "星光",
		skill:
			"全体队友恢复相当于此卡 HP 上限 7.5% 的生命，行动提前 25%，并返还此次战技点。不造成伤害。",
		passiveName: "恩典",
		passive:
			"从不攻击：普攻改为治疗一名队友，恢复相当于此卡 HP 上限 15% 的生命，并获得 2 战技点。",
		basicName: "恩典普攻",
		basic: "治疗一名队友，恢复相当于此卡 HP 上限 15% 的生命。获得 2 战技点。",
	},
	bite: {
		name: "心灵咬击",
		skillName: "心灵咬击",
		skill:
			"对一名敌人造成 120% ATK 伤害与高额削韧；令其在 2 回合内必须攻击此卡，且伤害降低 25%。为自身提供相当于 DEF 100% 的护盾，为每名其他队友提供相当于 DEF 30% 的护盾。",
		passiveName: "暗流",
		passive:
			"此卡处于嘲讽时攻击它的敌人，或被咬击标记后攻击它的敌人，其下次行动推迟 15%。",
	},
	stream: {
		name: "连打",
		skillName: "连打",
		skill:
			"对一名敌人攻击 2 次，每层加速额外攻击 1 次，每击造成 60% ATK 伤害。目标倒下后，剩余攻击转向 HP 最低的敌人。随后清空加速层数。",
		passiveName: "渐入佳境",
		passive: "每次自身回合获得 +8% SPD，最多叠加 5 层。被减速时重置。",
	},
	ramen: {
		name: "酱油拉面",
		skillName: "酱油拉面",
		skill:
			"在碗中加入下一种配料后上餐：全体队友恢复相当于此卡 HP 上限 7% 的生命，并获得碗内所有配料效果。叉烧：ATK +15%，持续 2 回合；鸡蛋：5% 护盾；海苔：移除一个减益；葱花：行动提前 15%。",
		passiveName: "慢火熬煮",
		passive: "每次普攻使下一碗治疗量提高 20%，最多 +60%。",
	},
	heatwave: {
		name: "热浪",
		skillName: "热浪",
		skill:
			"对一名敌人造成 70% ATK 伤害；使所有敌人减速 20%，持续其下一个回合。",
		passiveName: "热身",
		passive: "每次热浪也使全体队友 ATK +20%，持续 2 回合。",
	},
	rain: {
		name: "雨幕",
		skillName: "降雨",
		skill:
			"全体队友在接下来的 2 次自身回合开始时，各恢复相当于此卡 HP 上限 13% 的生命。",
		passiveName: "绵绵细雨",
		passive:
			"再次施放降雨时，仍处于降雨效果中的队友立即恢复相当于此卡 HP 上限 13% 的生命。",
	},
	haze: {
		name: "迷雾",
		skillName: "迷雾",
		skill:
			"对一名敌人造成 45% ATK 伤害。使所有敌人在其下一个回合陷入迷雾，单体攻击改为随机选择目标。",
		passiveName: "低能见度",
		passive: "迷雾中的敌人有 10% 的单体攻击会落空。",
	},
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
			"普通条目采用原站中文词典；签名技能、补充机制为人工整理，并保留英文原文。",
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
					"weak-point": "与使用诅咒的控制角色搭配。",
					"follow-up": "与破韧者和盾击搭配。",
					momentum: "与盾击及重击搭配：击破能带动全队。",
					opportunist: "与任意控制角色搭配。",
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
		const t = signatureZh[v.id];
		return {
			...v,
			name: v.skill.name,
			nameZh: t.name,
			skill: { ...v.skill, nameZh: t.skillName, textZh: t.skill },
			passive: { ...v.passive, nameZh: t.passiveName, textZh: t.passive },
			...(v.basic
				? { basic: { ...v.basic, nameZh: t.basicName, textZh: t.basic } }
				: {}),
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
data.meta.signatureScope =
	"仅收录公开前端的 9 套签名技能模板，不猜测模板对应的玩家、卡面、当期卡池或持有情况；中文签名名称为本站辅助译名。";
data.meta.rulePriority =
	"数值以本次英文规则和实现快照为核对基准；中文保留原站表述。战斗实装的限制和例外在机制条目中单列。";
data.meta.clientBuild = overlay.match(/"x-client-build":`(\d+)`/)?.[1] ?? null;
data.meta.updateNote =
	"2026-10-31 已对比上一快照：仅依赖导入文件名与客户端构建时间戳改变，公开 RPG 规则和中文词典无实质变化。";
if (offline) {
	try {
		data.meta.fetchedAt = JSON.parse(
			await fs.readFile(path.join(evidence, "source-manifest.json"), "utf8"),
		).fetchedAt;
	} catch {}
}
// Additional mechanics are concise explanations checked against the same bundle.
data.mechanics = [
	{
		id: "sp",
		name: "Shared Skill Points",
		nameZh: "共享战技点",
		text: "Normally starts at 3, capped at 5. Basic attacks grant 1; Skills cost 1. Special kits and battlefield rules can change this.",
		textZh:
			"通常初始 3 点，上限 5 点，全队共用。普通攻击获得 1 点，战技消耗 1 点。序曲、星光等技能以及特殊战场规则会改变点数收支，不能把所有技能都当成同样的净消耗。",
	},
	{
		id: "basic",
		name: "Basic attacks",
		nameZh: "普通攻击与辅助普攻",
		text: "Ordinary Basic hits one enemy for 100% ATK. Support Basics also heal the lowest-HP ally for 3% of the Support’s max HP. Signature kits may replace the Basic.",
		textZh:
			"普通普攻对一名敌人造成 100% ATK 伤害。辅助的普通普攻还治疗 HP 最低的队友，治疗基数为辅助 HP 上限的 3%。签名技能组可替换普攻，例如恩典改为治疗且回复 2 战技点。",
	},
	{
		id: "mod-priority",
		name: "MOD combo priority",
		nameZh: "三件组合优先，不与两件组合自动叠加",
		text: "The combo resolver picks the first matching 3-mod combo. Only when no 3-mod combo matches does it return every matching 2-mod combo.",
		textZh:
			"判定器先寻找匹配的三件组合；存在时仅返回该三件组合，不再叠加其中的两件组合。若没有三件组合，才同时返回所有匹配的两件组合。单件 MOD 固有加成与主副词条仍保留。例：HD + DT + HR 激活核心输出，而非同时激活爆发输出、暴击输出。",
	},
	{
		id: "mod-slots",
		name: "Three equipment slots",
		nameZh: "三个 MOD 槽位",
		text: "Each card has three mod slots. Mod types carry intrinsic effects; main and substats add independently of combo identity.",
		textZh:
			"每张卡有 3 个 MOD 槽位。类型固有效果、主副词条、组合效果是不同层次：同一组合可以因星级和词条不同而强弱不同。实验台只核对技能与组合，不会替你虚构实际装备词条。",
	},
	{
		id: "mod-level",
		name: "MOD rarity and enhancement",
		nameZh: "MOD 星级与强化",
		text: "1–5 star mods cap at +3/+6/+9/+12/+15. Intrinsic effect scaling is 0.4/0.55/0.7/0.85/1; several durations and flat mitigation effects do not scale.",
		textZh:
			"1★ 到 5★ 的强化上限依次为 +3 / +6 / +9 / +12 / +15。类型固有效果通常按 0.4 / 0.55 / 0.7 / 0.85 / 1 缩放；固定回合数、NF 有盾减伤 8% 等不随星级缩放。每种 MOD 的逐星效果见其详情。",
	},
	{
		id: "substats",
		name: "MOD substats",
		nameZh: "MOD 主副词条",
		text: "Initial substat count ranges by rarity: 0; 0–1; 1–2; 2–3; 3–4. New substats exclude the main stat and existing substat types. Individual rolls use 80%, 90% or 100% of their rarity-scaled base.",
		textZh:
			"1★ 到 5★ 初始副词条数量依次为 0、0–1、1–2、2–3、3–4。新副词条不会重复主词条或现有副词条类型。单次副词条数值为基准 × 星级系数 × 80% / 90% / 100% 档位。主词条权重是该类型的随机生成权重，不是实战推荐优先级。",
	},
	{
		id: "guard-break",
		name: "Guard Break",
		nameZh: "韧性与击破",
		text: "Breaking adds 30% damage taken and attempts to delay the target by 60% of a turn. At its next turn, the target recovers full Guard. Delay is subject to a per-turn push cap and resistance.",
		textZh:
			"韧性降至零会击破：基础受到伤害提高 30%，并尝试推迟 60% 回合。目标下次自身回合开始时恢复全部韧性并解除击破。推迟会受抗推迟效果和单次行动间累计推迟上限影响；破韧者另有击破易伤，不能只看基础 30%。",
	},
	{
		id: "push-cap",
		name: "Turn push cap",
		nameZh: "推迟上限与速度",
		text: "The engine caps accumulated push at 60% between turns. Action interval uses the square root of effective speed, not a simple inverse-linear SPD multiplier.",
		textZh:
			"当前战斗实现把角色两次行动间累计被推迟的幅度限制在 60%。因此多次推条不一定全部生效。行动间隔按有效 SPD 的平方根换算，不应把“速度 +40%”直接理解成实际行动次数也精确增加 40%。",
	},
	{
		id: "shield-cap",
		name: "Shield limit",
		nameZh: "护盾上限",
		text: "Shield gain is capped by the recipient’s current shield and 50% of its maximum HP. Sudden Death floor rules disable shields.",
		textZh:
			"当前战斗实现的护盾总量上限为受盾者 HP 上限的 50%。施加新护盾时只补到上限；楼层 SD 规则会禁用护盾。装备 SD 的效果与楼层 SD 不同，勿混为一谈。",
	},
	{
		id: "status-merge",
		name: "Same-type statuses",
		nameZh: "同类状态不简单相加",
		text: "A repeated status of the same kind keeps the larger duration and the larger value. General debuff application caps Weaken at 60% and other handled debuffs at 80%.",
		textZh:
			"同类状态重复施加时，分别保留较长持续时间和较强数值，不直接把强度逐层相加。通用减益施加逻辑把虚弱上限设为 60%，其处理的其他减益上限设为 80%；部分独立标记另行结算。",
	},
	{
		id: "team-shape",
		name: "Team shape precedence",
		nameZh: "阵容形态的优先级与满队条件",
		text: "Shape bonuses require four units. Siege > Hex Circle > Twin Blades > Iron Wall > Choir; only the first match applies. Other eligible ordinary bonuses may still add.",
		textZh:
			"阵容形态加成需满 4 人。按“攻城 → 咒术圈 → 双刃 → 铁壁 → 唱诗班”顺序只取第一个匹配项（中英文对照见队伍羁绊）。满编、双职业、同国等其他符合条件的普通羁绊仍可参与加算。",
	},
	{
		id: "team-cap",
		name: "Team synergy cap",
		nameZh: "队伍加成上限",
		text: "Team bonus contributions add, capped at +35% each for ATK, HP and SPD. Four of one class applies −20% ATK and HP.",
		textZh:
			"队伍羁绊采用加算，每张卡的 ATK、HP、SPD 正向加成各自最多 +35%。四张同职业会承受 ATK、HP 各 −20% 的惩罚；该惩罚并非 SPD −20%。",
	},
	{
		id: "level-growth",
		name: "Level and ascension",
		nameZh: "等级与晋阶上限",
		text: "Ascension 0–6 caps levels at 20, 30, 40, 50, 60, 70 and 80. Card stats depend on rarity, class, level, ascension and equipment; rarity alone is not a full ranking.",
		textZh:
			"晋阶 0–6 的等级上限依次为 20、30、40、50、60、70、80。卡牌面板由稀有度、职业、等级、晋阶和装备共同决定，不能仅凭稀有度或名气判定强弱。签名卡另有 3% 基础属性加成。",
	},
	{
		id: "eidolon-shared",
		name: "Shared Eidolons E2/E3/E5",
		nameZh: "通用星魂 E2 / E3 / E5",
		text: "E2 strengthens the passive tier (generally ×1.3); E3 makes Skills 20% stronger and their buffs/debuffs/pushes 10% stronger; E5 makes Basic attacks 30% stronger with 50% more Guard damage.",
		textZh:
			"E2 提升被动档位（一般数值 ×1.3，但不代表每种被动都只是机械乘法）；E3 战技强度 +20%，其增益、减益和推条强度 +10%；E5 普攻强度 +30%，削韧 +50%。签名技能也有对应处理，特殊被动应看实现例外。",
	},
	{
		id: "eidolon-tank",
		name: "Tank Eidolons",
		nameZh: "坦克星魂 E1 / E4 / E6",
		text: "E1: 10% less damage taken while Taunting. E4: shields given are 20% stronger. E6: while Taunting, counter every hit for 60% ATK.",
		textZh:
			"E1：嘲讽时受到伤害降低 10%。E4：提供的护盾强度 +20%。E6：嘲讽时每次受击以 60% ATK 反击。签名心灵咬击的锁定目标在相应实现中也可触发坦克嘲讽相关判定。",
	},
	{
		id: "eidolon-dps",
		name: "DPS Eidolons",
		nameZh: "输出星魂 E1 / E4 / E6",
		text: "E1: +10% CRIT Rate. E4: +20% CRIT DMG. E6: its Skill hits a second time for half damage.",
		textZh:
			"E1：暴击率 +10%。E4：暴击伤害 +20%。E6：战技以一半伤害再打一次。是否值得堆暴击还应结合实际暴击率、技能与敌人规则，不宜无条件全堆暴伤。",
	},
	{
		id: "eidolon-support",
		name: "Support Eidolons",
		nameZh: "辅助星魂 E1 / E4 / E6",
		text: "E1: heals 10% more. E4: heals also cleanse one debuff. E6: its Skill also heals the lowest-HP other ally for half as much.",
		textZh:
			"E1：治疗量 +10%。E4：治疗同时净化一个减益。E6：战技还以一半治疗量治疗 HP 最低的另一名队友。净化和群体治疗会改变对控制阵容的应对价值。",
	},
	{
		id: "eidolon-cc",
		name: "CC Eidolons",
		nameZh: "控制星魂 E1 / E4 / E6",
		text: "E1: debuffs applied are 5 points stronger. E4: debuffs last 1 turn longer. E6: the Skill also lands on the enemy whose turn comes next: half damage, whole effect.",
		textZh:
			"E1：施加的减益增加 5 个百分点。E4：减益延长 1 回合。E6：战技也命中下一个行动的敌人，造成一半伤害但施加完整效果。",
	},
	{
		id: "undying-e2",
		name: "Undying E2 exception",
		nameZh: "不死被动的 E2 例外",
		text: "Above the base passive tier, ordinary Undying revives at 10% max HP instead of 1 HP. Counter Stance’s matched synergy instead restores 50% HP and enters Counter Stance.",
		textZh:
			"不死达到强化被动档位时，普通触发改为保留 10% HP 上限，而不是 1 HP。若与反击架势形成专属联动，则走另一条规则：恢复至 50% HP 并进入反击架势。不要把所有效果都仅按 ×1.3 推算。",
	},
	{
		id: "snapshot-boundary",
		name: "Snapshot and recommendation boundary",
		nameZh: "快照与搭配建议的边界",
		text: "This catalog documents public frontend rules, not private inventory or verified current server authority. Recommendations are reasoning, not measured win rates.",
		textZh:
			"本图鉴整理公开前端快照，不包含你的真实背包、账号隐私或已验证的服务器全部判定。搭配建议是根据技能联动推导，不是实测胜率榜；遇到版本更新、特殊楼层和签名卡，应以当前游戏显示及实战为准。",
	},
];
data.statuses = arr(read(rpg, "li")).map((v) => {
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
			"敌方单体攻击必须攻击嘲讽者；嘲讽者分担队友受到的部分伤害。嘲讽结束后有一回合不能再次嘲讽。",
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
const extrasPath = path.join(
	root,
	"scripts/gacha-wiki",
	"data-supplement.json",
);
try {
	const extra = JSON.parse(await fs.readFile(extrasPath, "utf8"));
	Object.assign(data, extra);
} catch (e) {
	if (e.code !== "ENOENT") throw e;
}
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
