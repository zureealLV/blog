import {
	categories,
	classNames,
	flatten,
	label,
	describe,
	filterEntries,
	validateBuild,
	synergyFor,
	comboResolution,
	buildParams,
	parseBuild,
	buildWarnings,
} from "./engine.mjs";
const data = window.WIKI_DATA,
	editorial = window.WIKI_GUIDES || { guides: [], glossary: [], rules: [] };
const main = document.querySelector("main"),
	nav = document.querySelector("#nav"),
	dialog = document.querySelector("#detail");
const esc = (v) =>
	String(v ?? "").replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
const safeUrl = (v) => (/^https:\/\//.test(v || "") ? esc(v) : "#");
if (!data) {
	main.innerHTML =
		'<div class="empty"><strong>规则资料未能加载</strong>请刷新页面，或检查 data.js 是否可访问。</div>';
	throw new Error("Missing rules snapshot");
}
const entries = flatten(data),
	byKey = new Map(entries.map((e) => [e.key, e]));
let favorites = new Set();
try {
	const v = JSON.parse(localStorage.getItem("gacha-wiki-favorites") || "[]");
	if (Array.isArray(v)) favorites = new Set(v.filter((k) => byKey.has(k)));
} catch {}
let current = "home",
	query = "",
	classFilter = "all",
	pageSize = 36,
	detailOrigin = null;
let build = validateBuild(
	{
		cls: "dps",
		skill: "heavy-strike",
		passive: "guard-breaker",
		mods: ["so", "fl"],
		star: 5,
	},
	data,
);
const date = new Date(data.meta.fetchedAt)
	.toLocaleDateString("zh-CN", {
		timeZone: "Asia/Shanghai",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
	.replaceAll("/", ".");
document.querySelector("#snapshot-date").textContent = date + " 快照";
const count = (k) => (data[k] || []).length;
const badge = (cls) =>
	classNames[cls]
		? `<span class="badge ${esc(cls)}">${classNames[cls]}</span>`
		: "";
const modChips = (mods) =>
	`<div class="mod-chips">${mods.map((m) => `<span class="mod-chip">${esc(m.toUpperCase())}</span>`).join("")}</div>`;
const btn = (text, attrs = "", primary = false) =>
	`<button class="btn${primary ? " primary" : ""}" ${attrs}>${text}</button>`;
const linkEntry = (kind, id, text) =>
	`<button class="inline-link" data-detail="${esc(kind + "/" + id)}">${esc(text || label(byKey.get(kind + "/" + id), data))}</button>`;
const title = (e) => label(e, data);
const summary = (e) =>
	e.kind === "signatures"
		? `${e.skill?.textZh || e.skill?.text || ""}`
		: describe(e);
function modStatTable(mod) {
	const rows = Object.entries(mod.mainStatWeights || {})
		.map(([id, weight]) => {
			const stat = data.stats.find((s) => s.id === id),
				value = data.modGrowth.mainMax[id];
			return `<tr><td>${esc(stat?.nameZh || stat?.name || id)}</td><td>${weight}%</td><td>${stat?.pct ? +(value * 100).toFixed(2) + "%" : value}</td></tr>`;
		})
		.join("");
	return `<h3>主词条生成方向</h3><table class="source-table"><thead><tr><th>词条</th><td>生成权重</td><td>5★ +15 基准</td></tr></thead><tbody>${rows}</tbody></table><p>权重描述生成规则，不是你手中装备的实际词条。主词条基准也不是 MOD 自身固有效果，二者不要混为一谈。</p>`;
}
function toast(text) {
	const el = document.querySelector("#toast");
	el.textContent = text;
	el.classList.add("show");
	clearTimeout(toast.timer);
	toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}
function saveFavorites() {
	try {
		localStorage.setItem(
			"gacha-wiki-favorites",
			JSON.stringify([...favorites]),
		);
	} catch {
		toast("浏览器未允许保存；收藏仅保留在本次打开中。");
	}
}
function renderNav() {
	const groups = [
		[
			"工作台",
			[
				["home", "总览", "⌂"],
				["builder", "搭配实验台", "⌘"],
				["guides", "搭配手册", "↗"],
			],
		],
		[
			"规则资料",
			Object.entries(categories)
				.filter(([k]) => count(k))
				.map(([k, v]) => [k, v.name, v.icon]),
		],
		[
			"我的索引",
			[
				["glossary", "战斗术语", "Aa"],
				["favorites", "我的收藏", "☆"],
				["sources", "来源与版本", "◷"],
			],
		],
	];
	nav.innerHTML = groups
		.map(
			([name, items]) =>
				`<div class="nav-label">${name}</div>${items.map(([id, name, icon]) => `<a class="nav-link ${current === id ? "active" : ""}" href="#${id}" ${current === id ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icon}</span>${name}<span class="nav-count">${categories[id] ? String(count(id)).padStart(2, "0") : id === "favorites" ? favorites.size : ""}</span></a>`).join("")}`,
		)
		.join("");
}
const searchBox = (placeholder = "搜索战技、被动、MOD、效果…") =>
	`<div class="search-box"><span class="search-icon" aria-hidden="true">⌕</span><input id="search" type="search" autocomplete="off" aria-label="搜索图鉴" placeholder="${placeholder}" value="${esc(query)}"><button id="clear-search" aria-label="清空搜索" ${query ? "" : "hidden"}>×</button><kbd>/</kbd></div>`;
function head(name, subtitle, n) {
	return `<div class="page-head"><div><div class="eyebrow">OSU! GACHA / FIELD NOTES</div><h1>${name}</h1><p>${subtitle}</p></div>${n !== undefined ? `<div class="head-number">${String(n).padStart(2, "0")}</div>` : ""}</div>`;
}
function entryCard(e) {
	return `<article class="entry-card"><div class="card-meta"><span class="type-tag">${esc(categories[e.kind].en.toUpperCase())}</span>${badge(e.cls || data.skills.find((s) => e.kind === "synergies" && s.id === (e.skill || e.id))?.cls)}</div><button class="entry-title" data-detail="${esc(e.key)}">${esc(title(e))}</button><div class="entry-en">${esc(e.name || e.id)}</div>${e.mods ? modChips(e.mods) : ""}<p class="entry-text">${esc(summary(e))}</p><div class="card-foot"><button class="detail-button" data-detail="${esc(e.key)}">查看效果与关联 <span aria-hidden="true">↗</span></button><button class="favorite ${favorites.has(e.key) ? "on" : ""}" data-favorite="${esc(e.key)}" aria-label="${favorites.has(e.key) ? "取消收藏" : "收藏"} ${esc(title(e))}" aria-pressed="${favorites.has(e.key)}">${favorites.has(e.key) ? "★" : "☆"}</button></div></article>`;
}
function classFilters() {
	return `<div class="filter-row" id="class-filters">${[["all", "全部职业"], ...Object.entries(classNames)].map(([id, n]) => `<button class="pill ${classFilter === id ? "active" : ""}" data-class-filter="${id}" aria-pressed="${classFilter === id}">${n}</button>`).join("")}<span class="results-count" id="results-count"></span></div>`;
}
function home() {
	main.innerHTML = `<section class="hero"><div><div class="eyebrow">A LITTLE KNOWLEDGE. A BETTER BUILD.</div><h1>每一种搭配，<br>都<em>有迹可循。</em></h1><p>从战技与被动，到 MOD 的隐藏联动。<br>查清规则，再把你的下一套阵容搭出来。</p><div class="hero-actions"><a class="btn primary" href="#builder">进入搭配实验台 <span>↗</span></a><a class="btn ghost" href="#guides">先看搭配手册 →</a></div></div><div class="hero-diagram" aria-label="重击与破韧者专属联动示意"><div class="diagram-top"><span>SYNERGY / 专属联动</span><span>● MATCHED</span></div><div class="diagram-chain"><div class="ability-node">重击<small>HEAVY STRIKE</small></div><span class="diagram-plus">＋</span><div class="ability-node">破韧者<small>GUARD BREAKER</small></div></div><div class="diagram-result"><span class="mod-mini">↳</span><p><strong>击破时，再来一击。</strong>额外伤害由该击的 20% 提升至 100%</p></div></div></section>${searchBox("搜索「暴击」「治疗」「HD DT」或技能名称…")}<div id="home-search-results" hidden></div><div id="home-sections"><div class="stat-row">${[
		["skills", "种战技"],
		["passives", "种被动"],
		["mods", "种 MOD"],
		["combos", "种组合"],
	]
		.map(
			([k, n]) =>
				`<a href="#${k}" class="stat-tile"><strong>${count(k)}</strong><span>${n}</span></a>`,
		)
		.join(
			"",
		)}</div><div class="section-head"><h2>从这里开始 <small>QUICK ACCESS</small></h2><a href="#sources">${date} 规则快照 ↗</a></div><div class="quick-grid"><a href="#synergies" class="quick-card"><span class="quick-icon">⌘</span><div><strong>战技 × 被动</strong><p>${count("synergies")} 组专属联动，逐条拆解</p></div><span class="quick-arrow">↗</span></a><a href="#combos" class="quick-card"><span class="quick-icon">⬡</span><div><strong>MOD 组合库</strong><p>两件与三件，不只是属性相加</p></div><span class="quick-arrow">↗</span></a><a href="#signatures" class="quick-card"><span class="quick-icon">✧</span><div><strong>签名技能档案</strong><p>独立战技与被动机制</p></div><span class="quick-arrow">↗</span></a></div><div class="notice"><span>!</span><div><b>先记住这条：三件组合会取代两件组合。</b><br>例如 HD + DT + HR 触发「核心输出」，不会同时保留「爆发输出」与「暴击输出」。实验台会帮你检查。</div></div><div class="section-head"><h2>搭配灵感 <small>RULE-BASED BUILDS</small></h2><a href="#guides">全部搭配 →</a></div><div class="guide-grid">${editorial.guides.slice(0, 2).map(guideCard).join("")}</div><div class="section-head"><h2>规则与边界 <small>READ BEFORE BUILDING</small></h2></div><div class="notice mint"><span>◎</span><div><b>原站规则与搭配推导，分开呈现。</b><br>图鉴来自公开前端；手册是基于规则的分析，不是官方推荐或实测强度排名。装备 MOD 与同名楼层规则不是同一套效果。</div></div></div>`;
	bindSearch();
	updateHomeSearch();
}
function updateHomeSearch() {
	const target = document.querySelector("#home-search-results");
	if (!target) return;
	target.hidden = !query;
	document.querySelector("#home-sections").hidden = !!query;
	if (query) {
		const found = filterEntries(entries, { query }, data);
		target.innerHTML = `<div class="section-head"><h2>搜索结果</h2><span class="muted">${found.length} 条</span></div><div class="catalog">${found.slice(0, 36).map(entryCard).join("") || emptyResults()}</div>${found.length > 36 ? `<div class="load-more"><a class="btn" href="#search?q=${encodeURIComponent(query)}">查看全部 ${found.length} 条 →</a></div>` : ""}`;
	}
}
function emptyResults() {
	return `<div class="empty"><strong>没有找到匹配的条目</strong>试试「削韧」「治疗」「重击」或英文名称；多个词会同时匹配。<br>${btn("清空搜索与筛选", "data-reset-search")}</div>`;
}
function catalog() {
	const isAll = current === "search",
		isFav = current === "favorites",
		category = categories[current];
	main.innerHTML = `${head(isAll ? "全站搜索" : isFav ? "我的收藏" : category.name, isFav ? "收藏保存在当前浏览器，不上传、不跨设备同步。" : isAll ? "中文效果、英文名称、缩写都能查。多个关键词以空格分隔。" : current === "floorMods" ? "这些是战场规则，不是装备 MOD。进入楼层前，请先确认它怎样改变你的战术。" : current === "signatures" ? "签名卡独立技能配置。这里展示技能原型，不等同于当期卡面名单或卡池。" : current === "synergies" ? "精确的战技 + 被动配对，会触发额外效果；同职业不等于自动联动。" : "按名称或效果查找，点击条目查看完整数值、原文与相关搭配。", isAll ? entries.length : isFav ? favorites.size : count(current))}${searchBox()}${classFilters()}<div class="catalog" id="catalog-results"></div><div id="pagination"></div>`;
	bindSearch();
	updateCatalog();
}
function updateCatalog() {
	const found = filterEntries(
		entries,
		{
			query,
			kind: categories[current] ? current : "all",
			cls: classFilter,
			favorites: current === "favorites" ? favorites : null,
		},
		data,
	);
	document.querySelector("#results-count").textContent =
		`${found.length} 条结果`;
	document.querySelector("#catalog-results").innerHTML =
		found.slice(0, pageSize).map(entryCard).join("") ||
		(current === "favorites" && !favorites.size
			? `<div class="empty"><strong>把常用的效果留在手边</strong>点条目右下角的 ☆，下次就能在这里找到。<br><a href="#combos" class="btn">浏览 MOD 组合 →</a></div>`
			: emptyResults());
	document.querySelector("#pagination").innerHTML =
		found.length > pageSize
			? `<div class="load-more">${btn(`再显示 ${Math.min(36, found.length - pageSize)} 条（已显示 ${pageSize}/${found.length}）`, 'id="load-more"')}</div>`
			: "";
	document.querySelectorAll("[data-class-filter]").forEach((b) => {
		b.classList.toggle("active", b.dataset.classFilter === classFilter);
		b.setAttribute(
			"aria-pressed",
			String(b.dataset.classFilter === classFilter),
		);
	});
}
function bindSearch() {
	const el = document.querySelector("#search");
	el.addEventListener("input", () => {
		query = el.value;
		pageSize = 36;
		document.querySelector("#clear-search").hidden = !query;
		if (current === "home") updateHomeSearch();
		else if (current === "guides") updateGuides();
		else if (current === "glossary") updateGlossary();
		else updateCatalog();
	});
	document.querySelector("#clear-search").onclick = () => {
		query = "";
		el.value = "";
		el.dispatchEvent(new Event("input"));
		el.focus();
	};
}
function guideCard(g) {
	return `<article class="guide-card"><div class="guide-meta">${badge(g.cls)}<span class="badge inference">规则推导 · 非强度排名</span></div><h3>${esc(g.name)}</h3><p>${esc(g.summary)}</p>${modChips(g.mods)}<div class="tag-list">${(g.tags || []).map((t) => `<span>${esc(t)}</span>`).join("")}</div><details><summary>展开搭配理由与使用边界</summary><h4>战技与被动</h4><p>${linkEntry("skills", g.skill)} × ${linkEntry("passives", g.passive)}</p>${[
		["词条方向", g.stats],
		["为什么这样搭", g.why],
		["出手思路", g.rotation],
		["队友方向", g.team],
		["注意事项", g.cautions],
	]
		.map(
			([h, lines]) =>
				`<h4>${h}</h4><ul>${(lines || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`,
		)
		.join(
			"",
		)}</details><button class="btn" data-guide="${esc(g.id)}">带入实验台 <span>↗</span></button></article>`;
}
function guides() {
	main.innerHTML = `${head("搭配手册", "先选想解决的问题，再看技能与 MOD 怎样协作。每套都写明理由、词条方向和适用边界。", editorial.guides.length)}${searchBox("搜索流派、角色定位或关键词…")}${classFilters()}<div class="notice"><span>i</span><div><b>不是“照抄就赢”的攻略。</b>以下是从公开规则推导的起点，未经过服务器对战胜率测试。实际养成、主副词条、敌人和楼层规则都可能改变最合适的选择。</div></div><div id="guide-results" class="guide-grid"></div>`;
	bindSearch();
	updateGuides();
}
function updateGuides() {
	const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	const list = editorial.guides.filter(
		(g) =>
			(classFilter === "all" || g.cls === classFilter) &&
			terms.every((t) => JSON.stringify(g).toLowerCase().includes(t)),
	);
	document.querySelector("#guide-results").innerHTML =
		list.map(guideCard).join("") || emptyResults();
	document.querySelector("#results-count").textContent =
		list.length + " 套搭配";
	document.querySelectorAll("[data-class-filter]").forEach((b) => {
		b.classList.toggle("active", b.dataset.classFilter === classFilter);
		b.setAttribute(
			"aria-pressed",
			String(b.dataset.classFilter === classFilter),
		);
	});
}
function builder() {
	main.innerHTML = `${head("搭配实验台", "选择战技、被动和最多 3 种 MOD；检查专属联动与组合优先级。这里不模拟伤害、胜率或你的实际库存。")}<div class="builder-layout"><section class="panel"><div class="panel-title"><span class="step">01</span><h2>选择技能配置</h2></div><div class="field"><label for="signature-select">技能类型</label><select id="signature-select"><option value="">普通角色 · 自由选择战技 / 被动</option>${data.signatures.map((s) => `<option value="${s.id}" ${build.sig === s.id ? "selected" : ""}>签名技能 · ${esc(s.nameZh)} (${esc(s.name)})</option>`).join("")}</select></div><div class="small-title">职业 CLASS</div><div class="class-buttons">${Object.entries(
		classNames,
	)
		.map(
			([id, n]) =>
				`<button class="class-button ${build.cls === id ? "selected" : ""}" data-build-class="${id}" aria-pressed="${build.cls === id}" ${build.sig ? "disabled" : ""}>${n}</button>`,
		)
		.join(
			"",
		)}</div><div class="form-row"><div class="field"><label for="skill-select">战技</label><select id="skill-select" ${build.sig ? "disabled" : ""}>${data.skills
		.filter((s) => s.cls === build.cls)
		.map(
			(s) =>
				`<option value="${s.id}" ${s.id === build.skill ? "selected" : ""}>${esc(s.nameZh)} · ${esc(s.name)}</option>`,
		)
		.join(
			"",
		)}</select></div><div class="field"><label for="passive-select">被动</label><select id="passive-select" ${build.sig ? "disabled" : ""}>${data.passives.map((s) => `<option value="${s.id}" ${s.id === build.passive ? "selected" : ""}>${esc(s.nameZh)} · ${esc(s.name)}</option>`).join("")}</select></div></div><hr class="form-divider"><div class="panel-title"><span class="step">02</span><h2>装备 MOD</h2></div><div class="picker-count"><span>选择不同 MOD · 组合只看类型</span><strong id="mod-selected-count">${build.mods.length} / 3</strong></div><div class="mod-picker">${data.mods.map((m) => `<button class="mod-button ${build.mods.includes(m.id) ? "selected" : ""}" data-mod="${m.id}" aria-pressed="${build.mods.includes(m.id)}" aria-label="${esc(m.short + " " + m.name)}"><b>${esc(m.short)}</b><small>${esc(m.name)}</small></button>`).join("")}</div><div class="picker-count"><span>固有效果示例星级 · 不代表主副词条</span><div class="star-select" aria-label="MOD 星级">${[1, 2, 3, 4, 5].map((n) => `<button class="star-button ${n <= build.star ? "on" : ""}" data-star="${n}" aria-label="查看 ${n} 星效果" aria-pressed="${n === build.star}">★</button>`).join("")}</div></div><p class="result-note">为便于比较，所选 MOD 的固有效果按同一星级展示。完整面板还需要每件装备的实际词条和强化等级。</p><div class="builder-actions">${btn("复制搭配链接 ↗", 'id="share-build"', true)}${btn("重置", 'id="reset-build"')}</div></section><section class="panel" aria-label="搭配结果"><div class="panel-title"><span class="step">03</span><h2>联动检查</h2></div><div id="build-results" aria-live="polite"></div></section></div><div class="notice"><span>!</span><div><b>装备 MOD ≠ 楼层 MOD。</b>同名的 SD、FL 等战场规则会额外改变治疗、护盾或嘲讽。建议进入战斗前查看 <a href="#floorMods" class="inline-link">楼层规则</a>。</div></div>`;
	document.querySelector("#skill-select").onchange = (e) => {
		build.skill = e.target.value;
		updateBuild();
	};
	document.querySelector("#passive-select").onchange = (e) => {
		build.passive = e.target.value;
		updateBuild();
	};
	document.querySelector("#signature-select").onchange = (e) => {
		build.sig = e.target.value;
		if (build.sig)
			build.cls = data.signatures.find((s) => s.id === build.sig).cls;
		build = validateBuild(build, data);
		builder();
		updateBuild();
	};
	updateBuild(false);
}
function updateBuild(writeUrl = true) {
	if (writeUrl)
		history.replaceState(null, "", `#builder?${buildParams(build)}`);
	const skill = data.skills.find((s) => s.id === build.skill),
		passive = data.passives.find((p) => p.id === build.passive),
		sig = data.signatures.find((s) => s.id === build.sig),
		synergy = synergyFor(build, data),
		{ active, suppressed } = comboResolution(build.mods, data.combos);
	const effect = (name, text) =>
		`<div class="result-title">${esc(name)}</div><p class="result-text">${esc(text)}</p>`;
	document.querySelector("#build-results").innerHTML =
		`<div class="result-section"><div class="result-label">${sig ? "签名技能 · 固定技能组" : "当前战技与被动"}${badge(sig?.cls || build.cls)}</div>${effect(sig?.skill.nameZh || skill.nameZh, sig?.skill.textZh || skill.textZh)}${effect(sig?.passive.nameZh || passive.nameZh, sig?.passive.textZh || passive.textZh)}${sig?.basic ? effect(sig.basic.nameZh, sig.basic.textZh) : ""}</div><div class="result-section"><div class="result-label">战技 × 被动</div>${synergy ? `<div class="result-highlight"><strong>✓ 专属联动已激活</strong><p class="result-text">${esc(synergy.bonusZh)}</p></div>` : `<p class="result-text">${sig ? "签名卡使用固定技能组，不适用普通战技与被动的专属配对。" : "当前组合没有专属联动。两个技能仍各自生效；没有专属联动不等于无法搭配。"}</p>`}${!synergy && !sig ? `<p class="result-note">这个战技的专属配对：${linkEntry("passives", data.synergies.find((s) => (s.skill || s.id) === build.skill)?.passive)}</p>` : ""}</div><div class="result-section"><div class="result-label">MOD 组合检查<span>${build.mods.length} / 3 MODS</span></div>${modChips(build.mods)}${active.length ? active.map((c) => `<div class="result-highlight"><strong>${esc(c.nameZh)} · ${esc(c.name)}</strong><p class="result-text">${esc(c.textZh)}</p></div>`).join("") : `<p class="result-text">${build.mods.length < 2 ? "再选择 MOD，检查两件或三件组合。" : "没有命中组合，所选 MOD 的各自属性与固有效果仍生效。"}</p>`}${suppressed.length ? `<div class="result-warning">三件组合优先：${suppressed.map((c) => esc(c.nameZh)).join("、")} 不同时生效。MOD 自身的固有效果不受此覆盖影响。</div>` : ""}</div><div class="result-section"><div class="result-label">MOD 自身固有效果 · ${build.star} 星</div>${
			build.mods.length
				? build.mods
						.map((id) => {
							const m = data.mods.find((m) => m.id === id),
								ef = m.effectsByStar.find((x) => x.star === build.star);
							return `<div class="mini-entry"><b>${esc(m.short)} · ${esc(m.name)}</b><p>${esc(ef?.textZh || m.textZh)}</p></div>`;
						})
						.join("")
				: '<p class="result-text">尚未选择 MOD。</p>'
		}</div><div class="result-section"><div class="result-label">边界说明</div>${buildWarnings(
			build,
			data,
		)
			.map((w) => `<div class="result-warning">${esc(w)}</div>`)
			.join(
				"",
			)}<p class="result-text">这里检查规则匹配，不计算面板或伤害。角色等级、Eidolon、词条、敌人状态和场地效果未参与。签名技能是否能受益于某个 MOD，仍要看其实际动作与触发条件。</p></div>`;
	document.querySelector("#mod-selected-count").textContent =
		`${build.mods.length} / 3`;
	document.querySelectorAll("[data-mod]").forEach((b) => {
		const selected = build.mods.includes(b.dataset.mod);
		b.classList.toggle("selected", selected);
		b.setAttribute("aria-pressed", String(selected));
	});
	document.querySelectorAll("[data-star]").forEach((b) => {
		b.classList.toggle("on", Number(b.dataset.star) <= build.star);
		b.setAttribute(
			"aria-pressed",
			String(Number(b.dataset.star) === build.star),
		);
	});
}
function glossary() {
	main.innerHTML = `${head("战斗术语", "状态到底改变什么？把关键机制拆开查。具体数值以对应技能条目与规则快照为准。")}${searchBox("搜索削韧、击破、SP、嘲讽…")}<div class="glossary-list" id="glossary-results"></div>`;
	bindSearch();
	updateGlossary();
}
function updateGlossary() {
	const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	const found = [
		...editorial.glossary,
		...editorial.rules.map((r) => ({
			...r,
			name: r.title,
			english: "RULE NOTE",
		})),
	].filter((e) =>
		terms.every((t) => JSON.stringify(e).toLowerCase().includes(t)),
	);
	document.querySelector("#glossary-results").innerHTML =
		found
			.map(
				(e) =>
					`<article class="glossary-item"><h3>${esc(e.name)}</h3><small>${esc(e.english || e.id)}</small><p>${esc(e.text)}</p></article>`,
			)
			.join("") || emptyResults();
}
function sources() {
	main.innerHTML = `${head("来源与版本", "让每个数值都有出处，也让每个结论有边界。")}<article class="source-panel"><div class="notice mint"><span>✓</span><div><b>这是静态规则快照，不是实时游戏服务。</b><br>本页不连接你的账号，不读取库存，不执行抽卡、交易、战斗或装备操作。搜索与收藏在浏览器中完成。</div></div><table class="source-table"><tbody><tr><th>抓取时间</th><td>${esc(new Date(data.meta.fetchedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }))}（北京时间）</td></tr><tr><th>前端版本</th><td><code>${esc(data.meta.build)}</code></td></tr><tr><th>规则来源</th><td><a href="${safeUrl(data.meta.sourceUrl)}" target="_blank" rel="noopener noreferrer">osugacha.com / 公开 RPG 规则 ↗</a></td></tr><tr><th>中文词典</th><td><a href="${safeUrl(data.meta.localeUrl)}" target="_blank" rel="noopener noreferrer">原站简体中文词典 ↗</a></td></tr><tr><th>SHA-256</th><td><code>${esc(data.meta.sourceHash)}</code></td></tr><tr><th>收录范围</th><td>${Object.entries(
		categories,
	)
		.filter(([k]) => count(k))
		.map(([k, v]) => `${v.name} ${count(k)}`)
		.join(
			" · ",
		)}</td></tr></tbody></table><h2>怎样读这份 Wiki</h2><ul><li><strong>图鉴效果：</strong>来自站点公开前端规则；普通条目优先采用原站中文词典，保留英文可核对。</li><li><strong>搭配手册：</strong>基于规则的编辑推导，不是官方推荐、胜率实验或数值最优解。</li><li><strong>实验台：</strong>复现已核对的战技/被动配对与 MOD 组合选择规则；不模拟战斗，不估算账号战力。</li><li><strong>签名技能：</strong>展示技能原型，而非声称拥有全部签名卡面或当期卡池映射。</li></ul><h2>没有包含的东西</h2><p>你的实际卡库、MOD 主副词条和强化、当前队伍、私有战斗记录，以及无法从公开前端核实的服务器逻辑。公开卡池有大量玩家条目，本 Wiki 未镜像整个玩家库；请在 <a href="https://osugacha.com/players" target="_blank" rel="noopener noreferrer">原站玩家池</a> 查询具体角色。</p><h2>版本可能变化</h2><p>原站更新后，这个快照不会自动变成新版本。资产文件名与 SHA-256 用于识别来源，不代表服务器全部实现一致。看到差异时，以原站当前游戏说明与实际结算为准；更新脚本会在未知结构或翻译缺失时停止，避免静默发布错误资料。</p><h2>资料导出</h2><p><a href="data.json" download>下载规则快照 JSON</a> · <a href="guides.json" download>下载搭配手册 JSON</a> · <a href="https://osugacha.com/" target="_blank" rel="noopener noreferrer">访问原站</a></p><details><summary>查看完整快照元数据</summary><pre>${esc(JSON.stringify(data.meta, null, 2))}</pre></details><h2>致谢与使用范围</h2><p>osu! gacha 是独立同人游戏；本 Wiki 为非官方中文学习与检索资料，和游戏开发者及 ppy / osu! 无隶属关系。游戏名称、规则与原文归其各自权利人所有。请支持原站；本页不提供作弊、绕过认证或自动战斗功能。</p></article>`;
}
function showDetail(key, fromRoute = false) {
	const e = byKey.get(key);
	if (!e) {
		toast("这个条目不存在，可能来自不同版本的快照。");
		return;
	}
	detailOrigin = document.activeElement;
	let extra = "";
	if (e.kind === "skills") {
		const sy = data.synergies.find((s) => (s.skill || s.id) === e.id);
		extra = `<h3>战技类型</h3><p>${e.aoe ? "全体敌人" : e.single ? "单体目标" : e.targets === "ally" ? "指定队友" : "无需指定敌人 / 全队效果"} · ${classNames[e.cls]}</p>${sy ? `<h3>专属联动</h3><p>${linkEntry("passives", sy.passive)}</p><div class="notice mint"><div>${esc(sy.bonusZh)}</div></div>` : ""}`;
	}
	if (e.kind === "passives") {
		extra = `${e.comboZh ? `<h3>原站搭配提示</h3><p>${esc(e.comboZh)}</p>` : ""}<h3>关联战技</h3><div class="detail-related">${
			data.synergies
				.filter((s) => s.passive === e.id)
				.map((s) => linkEntry("skills", s.skill || s.id))
				.join(" · ") || "<p>没有普通战技与此被动的专属额外联动。</p>"
		}</div>`;
	}
	if (e.kind === "synergies") {
		extra = `<h3>需要的配对</h3><p>${linkEntry("skills", e.skill || e.id)} × ${linkEntry("passives", e.passive)}</p><h3>组合思路</h3><p>${esc(e.whyZh || e.why)}</p>`;
	}
	if (e.kind === "mods") {
		extra = `<h3>定位</h3><p>${esc(e.identityZh || e.identity)}</p><h3>各星级固有效果</h3>${e.effectsByStar.map((s) => `<div class="mini-entry"><b>${"★".repeat(s.star)}</b><p>${esc(s.textZh)}</p></div>`).join("")}<p class="result-note">以上不含主副词条。星级只缩放指定数值；固定回合数、部分固定减伤不按星级等比缩放。</p>${modStatTable(e)}<h3>包含此 MOD 的组合</h3><div class="detail-related">${data.combos
			.filter((c) => c.mods.includes(e.id))
			.map((c) => linkEntry("combos", c.id, c.nameZh))
			.join(" · ")}</div>`;
	}
	if (e.kind === "combos") {
		extra = `<h3>需要的 MOD</h3>${modChips(e.mods)}<p>${e.mods.map((m) => linkEntry("mods", m, m.toUpperCase())).join(" · ")}</p><h3>原站适用方向</h3><p>${esc(e.forWhoZh || e.forWho)}</p><div class="notice"><div>${e.mods.length === 3 ? "三件组合命中后，不叠加所包含的两件组合。" : "如果加入第三件触发了三件组合，本组合会被覆盖。没有三件组合时，可同时命中多个两件组合。"}</div></div>`;
	}
	if (e.kind === "signatures") {
		extra = `<h3>被动 · ${esc(e.passive.nameZh)}</h3><p class="effect">${esc(e.passive.textZh)}</p>${e.basic ? `<h3>普通行动 · ${esc(e.basic.nameZh)}</h3><p class="effect">${esc(e.basic.textZh)}</p>` : ""}<div class="notice"><div>签名技能组是固定配置，不套用普通战技 / 被动的专属配对。这里没有推测该原型对应的具体卡面或当期卡池。</div></div>`;
	}
	if (e.kind === "classes") {
		extra = `<h3>职业基础倍率</h3><p>ATK ×${e.atk} · HP ×${e.hp} · DEF ×${e.def} · SPD ×${e.spd} · 基础韧性 ${e.guard}</p><h3>职业战技</h3><div class="detail-related">${data.skills
			.filter((s) => s.cls === e.id)
			.map((s) => linkEntry("skills", s.id, s.nameZh))
			.join(
				" · ",
			)}</div><p class="result-note">这些是基础构成，不是最终面板；还需要稀有度、等级、装备和其它加成。</p>`;
	}
	const related = editorial.guides.filter((g) =>
		e.kind === "skills"
			? g.skill === e.id
			: e.kind === "passives"
				? g.passive === e.id
				: e.kind === "mods"
					? g.mods.includes(e.id)
					: e.kind === "combos"
						? e.mods.every((m) => g.mods.includes(m))
						: e.kind === "synergies"
							? g.skill === (e.skill || e.id) && g.passive === e.passive
							: false,
	);
	const original =
		e.kind === "signatures"
			? `${e.skill.text}\n\n${e.passive.text}${e.basic ? "\n\n" + e.basic.text : ""}`
			: e.text || e.bonus || e.identity || "";
	document.querySelector("#detail-content").innerHTML =
		`<div class="detail-head"><div><div class="eyebrow">${esc(categories[e.kind].en.toUpperCase())}</div><h2 id="detail-title">${esc(title(e))}</h2><div class="entry-en">${esc(e.name || e.id)}</div></div><button class="icon-button" data-close aria-label="关闭详情">×</button></div><div class="detail-body"><p class="effect">${esc(summary(e))}</p>${extra}${related.length ? `<h3>使用它的搭配手册 <span class="badge inference">推导</span></h3><div class="detail-related">${related.map((g) => btn(esc(g.name), `data-guide="${esc(g.id)}"`)).join("")}</div>` : ""}<details><summary>查看英文原文</summary><p>${esc(original)}</p></details><div class="builder-actions">${btn(favorites.has(key) ? "★ 已收藏" : "☆ 收藏条目", `data-favorite="${esc(key)}"`)}${btn("复制条目链接", `data-share-entry="${esc(key)}"`)}</div><div class="detail-source">快照 ${date} · <a href="${safeUrl(data.meta.sourceUrl)}" target="_blank" rel="noopener noreferrer">公开规则来源 ↗</a> · 英文原文可展开核对</div></div>`;
	if (!dialog.open) dialog.showModal();
	dialog.scrollTop = 0;
}
function closeDetail() {
	dialog.close();
	if (detailOrigin?.isConnected) detailOrigin.focus();
}
async function copy(text) {
	try {
		await navigator.clipboard.writeText(text);
		toast("链接已复制。");
	} catch {
		toast("无法自动复制；链接已放入地址栏，请手动复制。");
		history.replaceState(null, "", text);
	}
}
function route() {
	const raw = location.hash.slice(1) || "home";
	const [path, params = ""] = raw.split("?");
	if (path.startsWith("entry/")) {
		if (!main.querySelector(".hero")) {
			current = "home";
			home();
		}
		renderNav();
		let key;
		try {
			key = decodeURIComponent(path.slice(6));
		} catch {
			key = "";
		}
		showDetail(key, true);
		return;
	}
	if (dialog.open) dialog.close();
	current =
		Object.hasOwn(categories, path) ||
		[
			"home",
			"builder",
			"guides",
			"sources",
			"favorites",
			"search",
			"glossary",
		].includes(path)
			? path
			: "home";
	query = new URLSearchParams(params).get("q") || "";
	classFilter = "all";
	pageSize = 36;
	if (current === "builder" && params) build = parseBuild(params, data);
	document.querySelector("#crumb").textContent =
		categories[current]?.name ||
		{
			home: "总览",
			builder: "搭配实验台",
			guides: "搭配手册",
			sources: "来源与版本",
			favorites: "我的收藏",
			search: "全站搜索",
			glossary: "战斗术语",
		}[current];
	document.title = `${document.querySelector("#crumb").textContent} · osu! gacha 战术图鉴`;
	renderNav();
	if (current === "home") home();
	else if (current === "builder") builder();
	else if (current === "guides") guides();
	else if (current === "sources") sources();
	else if (current === "glossary") glossary();
	else catalog();
	toggleMenu(false);
	window.scrollTo(0, 0);
}
function toggleMenu(open) {
	document.querySelector("#sidebar").classList.toggle("open", open);
	document.querySelector("#overlay").classList.toggle("show", open);
	document.querySelector("#menu").setAttribute("aria-expanded", String(open));
}
document.querySelector("#menu").onclick = () =>
	toggleMenu(!document.querySelector("#sidebar").classList.contains("open"));
document.querySelector("#overlay").onclick = () => toggleMenu(false);
document.addEventListener("click", (e) => {
	const el = e.target.closest("button,a");
	if (!el) return;
	if (el.classList.contains("skip")) {
		e.preventDefault();
		main.focus();
		return;
	}
	if (el.dataset.detail) showDetail(el.dataset.detail);
	if (el.hasAttribute("data-close")) closeDetail();
	if (el.dataset.favorite) {
		const key = el.dataset.favorite;
		favorites.has(key) ? favorites.delete(key) : favorites.add(key);
		saveFavorites();
		renderNav();
		document.querySelectorAll("[data-favorite]").forEach((b) => {
			if (b.dataset.favorite === key) {
				const on = favorites.has(key);
				b.classList.toggle("on", on);
				b.setAttribute("aria-pressed", String(on));
				if (b.classList.contains("favorite")) {
					b.textContent = on ? "★" : "☆";
					b.setAttribute(
						"aria-label",
						`${on ? "取消收藏" : "收藏"} ${title(byKey.get(key))}`,
					);
				} else b.textContent = on ? "★ 已收藏" : "☆ 收藏条目";
			}
		});
		if (current === "favorites") updateCatalog();
	}
	if (el.dataset.classFilter) {
		classFilter = el.dataset.classFilter;
		pageSize = 36;
		current === "guides" ? updateGuides() : updateCatalog();
	}
	if (el.hasAttribute("data-reset-search")) {
		query = "";
		classFilter = "all";
		pageSize = 36;
		const search = document.querySelector("#search");
		if (search) {
			search.value = "";
			search.dispatchEvent(new Event("input"));
		}
	}
	if (el.id === "load-more") {
		pageSize += 36;
		updateCatalog();
	}
	if (el.dataset.guide) {
		const g = editorial.guides.find((g) => g.id === el.dataset.guide);
		if (g) {
			build = validateBuild({ ...g, sig: "", star: 5 }, data);
			if (dialog.open) dialog.close();
			const next = "#builder?" + buildParams(build);
			if (location.hash === next) {
				current = "builder";
				builder();
			} else location.hash = next;
		}
	}
	if (el.dataset.buildClass && !build.sig) {
		build = validateBuild({ ...build, cls: el.dataset.buildClass }, data);
		builder();
		updateBuild();
	}
	if (el.dataset.mod) {
		const id = el.dataset.mod;
		if (build.mods.includes(id))
			build.mods = build.mods.filter((m) => m !== id);
		else if (build.mods.length < 3) build.mods.push(id);
		else {
			toast("最多选择 3 种 MOD，请先取消一项。");
			return;
		}
		updateBuild();
	}
	if (el.dataset.star) {
		build.star = Number(el.dataset.star);
		updateBuild();
	}
	if (el.id === "reset-build") {
		build = validateBuild(
			{
				cls: "dps",
				skill: "heavy-strike",
				passive: "guard-breaker",
				mods: [],
				star: 5,
			},
			data,
		);
		builder();
		updateBuild();
	}
	if (el.id === "share-build")
		copy(
			location.origin + location.pathname + "#builder?" + buildParams(build),
		);
	if (el.dataset.shareEntry)
		copy(
			location.origin + location.pathname + "#entry/" + el.dataset.shareEntry,
		);
});
dialog.addEventListener("click", (e) => {
	if (e.target === dialog) {
		const r = dialog.getBoundingClientRect();
		if (
			e.clientX < r.left ||
			e.clientX > r.right ||
			e.clientY < r.top ||
			e.clientY > r.bottom
		)
			closeDetail();
	}
});
document.addEventListener("keydown", (e) => {
	if (
		e.key === "/" &&
		!dialog.open &&
		!["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
	) {
		const s = document.querySelector("#search");
		if (s) {
			e.preventDefault();
			s.focus();
		}
	}
	if (e.key === "Escape") toggleMenu(false);
});
window.addEventListener("hashchange", route);
route();
