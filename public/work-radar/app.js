const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const CATEGORY = { cybersecurity: "网络安全", ai_engineer: "AI 工程师", ai_security: "AI 安全", llm_security: "LLM 安全" };
const STATUS = { active: "确认在招", unknown: "待核验", stale: "疑似下线", closed: "已关闭" };
const FAVORITES_KEY = "hermes-work-radar:favorites:v1";
const PRIORITY_CITIES = ["合肥", "南京", "杭州"];

const state = {
  category: "", favorite: "", q: "", status: "", location: "", internship: "",
  source_id: "", min_confidence: "85", sort: "priority", page: 1, pageSize: 30,
  allJobs: [], filtered: [], jobs: [], sources: [], total: 0, generatedAt: "",
};
let searchTimer;
let favorites = loadFavoriteIds();

function loadFavoriteIds() {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return new Set(Array.isArray(value) ? value.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveFavoriteIds() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" })[char]);
}

function formatDate(value) {
  if (!value) return "日期未注明";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days > 1 && days < 30) return `${days} 天前`;
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function setStatus(message, net = "IDLE") {
  $("#status-message").textContent = message;
  $("#net-state").textContent = net;
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 3200);
}

function renderLoading() {
  $("#job-list").innerHTML = '<div class="loading-row"></div><div class="loading-row"></div><div class="loading-row"></div>';
}

function dateScore(job) {
  const value = job.posted_at || job.source_updated_at || job.last_seen_at;
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function salaryScore(job) {
  if (Number.isFinite(Number(job.salary_max))) return Number(job.salary_max);
  const numbers = String(job.salary || "").match(/\d+(?:\.\d+)?/g);
  return numbers?.length ? Math.max(...numbers.map(Number)) : 0;
}

function priorityScore(job) {
  const city = PRIORITY_CITIES.some(name => String(job.location || "").includes(name)) ? 30 : 0;
  const internship = Number(job.is_internship) ? 18 : 0;
  const curated = ["regional", "curated"].includes(job.source_id) ? 12 : 0;
  const security = job.category === "llm_security" ? 14 : job.category === "ai_security" ? 10 : job.category === "cybersecurity" ? 6 : 0;
  return city + internship + curated + security + Number(job.relevance || 0) + Number(job.confidence || 0) / 10;
}

function coreFilter({ ignoreLocation = false, ignoreCategory = false, ignoreFavorite = false } = {}) {
  const query = state.q.toLocaleLowerCase("zh-CN");
  const threshold = Number(state.min_confidence || 0);
  return state.allJobs.filter(job => {
    if (!ignoreCategory && state.category && job.category !== state.category) return false;
    if (!ignoreFavorite && state.favorite && !favorites.has(String(job.id))) return false;
    if (state.status && job.status !== state.status) return false;
    if (!ignoreLocation && state.location && job.location !== state.location) return false;
    if (state.internship !== "" && Number(job.is_internship) !== Number(state.internship)) return false;
    if (state.source_id && job.source_id !== state.source_id) return false;
    if (Number(job.confidence || 0) < threshold) return false;
    if (query) {
      const haystack = [job.title, job.company, job.location, job.description, job.requirements, ...(job.skills || [])].join(" ").toLocaleLowerCase("zh-CN");
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function sortJobs(items) {
  const result = [...items];
  const byText = (a, b) => String(a.company || "").localeCompare(String(b.company || ""), "zh-CN");
  const sorters = {
    priority: (a, b) => priorityScore(b) - priorityScore(a) || dateScore(b) - dateScore(a),
    confidence: (a, b) => Number(b.confidence || 0) - Number(a.confidence || 0) || Number(b.relevance || 0) - Number(a.relevance || 0),
    relevance: (a, b) => Number(b.relevance || 0) - Number(a.relevance || 0) || dateScore(b) - dateScore(a),
    newest: (a, b) => dateScore(b) - dateScore(a),
    updated: (a, b) => new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0),
    salary_desc: (a, b) => salaryScore(b) - salaryScore(a) || Number(b.relevance || 0) - Number(a.relevance || 0),
    company: byText,
  };
  return result.sort(sorters[state.sort] || sorters.priority);
}

async function loadJobs() {
  renderLoading();
  setStatus("QUERY // 正在检索公开职位快照", "BUSY");
  const filtered = sortJobs(coreFilter());
  state.filtered = filtered;
  state.total = filtered.length;
  const start = (state.page - 1) * state.pageSize;
  state.jobs = filtered.slice(start, start + state.pageSize);
  renderJobs();
  renderPagination(state.page, state.pageSize, state.total);
  setStatus(`READY // 已显示 ${state.jobs.length} / ${state.total} 条职位`, "IDLE");
}

function renderJobs() {
  const baseTitle = state.favorite ? "我的收藏" : (CATEGORY[state.category] || "全部职位");
  const title = state.internship === "1" ? `${baseTitle} · 实习岗` : baseTitle;
  $("#result-title").textContent = title;
  $("#result-count").textContent = `${state.total} 条信号`;
  if (!state.jobs.length) {
    $("#job-list").innerHTML = '<div class="empty-state"><strong>NO SIGNAL</strong><p>当前筛选没有职位。换个关键词吧，别对搜索框施加精神攻击。</p></div>';
    return;
  }
  $("#job-list").innerHTML = state.jobs.map(job => {
    const favorite = favorites.has(String(job.id));
    return `
      <article class="job-card" data-id="${escapeHTML(job.id)}" data-category="${escapeHTML(job.category)}" tabindex="0" aria-label="查看 ${escapeHTML(job.title)} 详情">
        <div class="job-main">
          <div class="job-topline"><h2 class="job-title">${escapeHTML(job.title)}</h2><span class="category-chip">${CATEGORY[job.category] || escapeHTML(job.category)}</span>${job.is_internship ? '<span class="internship-chip">实习</span>' : ""}<span class="confidence-chip grade-${escapeHTML(job.confidence_grade)}">${escapeHTML(job.confidence_grade)} ${escapeHTML(job.confidence)}%</span></div>
          <p class="company-line">${escapeHTML(job.company || "公司未注明")} <span>// ${escapeHTML(job.employment_type || job.experience || "类型未注明")}</span></p>
          <div class="skills">${(job.skills || []).slice(0, 6).map(skill => `<span class="skill-chip">${escapeHTML(skill)}</span>`).join("") || '<span class="skill-chip">技能待提取</span>'}</div>
        </div>
        <div class="job-location"><strong>${escapeHTML(job.salary || "面议")}</strong><span>${escapeHTML(job.location || "地点未注明")}</span></div>
        <div class="job-source"><span class="source-chip">${escapeHTML(job.source_name)}</span><span class="status-chip ${escapeHTML(job.status)}">${STATUS[job.status] || escapeHTML(job.status)}</span><time>${formatDate(job.posted_at)}</time></div>
        <button class="favorite-button ${favorite ? "active" : ""}" data-favorite-id="${escapeHTML(job.id)}" aria-label="${favorite ? "取消收藏" : "收藏"} ${escapeHTML(job.title)}"><svg><use href="#i-star"/></svg></button>
      </article>`;
  }).join("");
}

function renderPagination(page, pageSize, total) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) { $("#pagination").innerHTML = ""; return; }
  const shown = new Set([1, pages, page - 1, page, page + 1].filter(value => value >= 1 && value <= pages));
  $("#pagination").innerHTML = [...shown].sort((a, b) => a - b).map(value => `<button class="${value === page ? "active" : ""}" data-page="${value}" aria-label="第 ${value} 页">${value}</button>`).join("");
}

function loadStats() {
  const base = coreFilter({ ignoreCategory: true, ignoreFavorite: true });
  const categories = Object.fromEntries(Object.keys(CATEGORY).map(key => [key, 0]));
  for (const job of base) categories[job.category] = (categories[job.category] || 0) + 1;
  const favoriteCount = base.filter(job => favorites.has(String(job.id))).length;
  $("#stat-total").textContent = base.length;
  $("#stat-active").textContent = base.filter(job => job.status === "active").length;
  $("#stat-internship").textContent = base.filter(job => Number(job.is_internship)).length;
  $("#count-internship").textContent = base.filter(job => Number(job.is_internship)).length;
  $("#stat-favorite").textContent = favoriteCount;
  $("#count-all").textContent = base.length;
  $("#count-favorite").textContent = favoriteCount;
  Object.keys(CATEGORY).forEach(key => $(`#count-${key}`).textContent = categories[key] || 0);
  $("#last-sync").textContent = state.generatedAt ? `快照 ${formatDate(state.generatedAt)}` : "版本时间未知";
}

function loadLocations() {
  const counts = new Map();
  for (const job of coreFilter({ ignoreLocation: true, ignoreCategory: true, ignoreFavorite: true })) {
    const location = String(job.location || "地点未注明");
    counts.set(location, (counts.get(location) || 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => {
    const ap = PRIORITY_CITIES.some(city => a[0].includes(city)) ? 1 : 0;
    const bp = PRIORITY_CITIES.some(city => b[0].includes(city)) ? 1 : 0;
    return bp - ap || b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN");
  }).slice(0, 18);
  if (state.location && !counts.has(state.location)) state.location = "";
  $("#location-tags").innerHTML = '<span class="location-tags-label">// LOCATION</span>' +
    `<button class="${state.location ? "" : "active"}" type="button" data-location="">全部地区</button>` +
    ranked.map(([name, count]) => `<button class="${state.location === name ? "active" : ""} ${PRIORITY_CITIES.some(city => name.includes(city)) ? "priority-city" : ""}" type="button" data-location="${escapeHTML(name)}">${escapeHTML(name)} <b>${count}</b></button>`).join("");
}

function loadSources() {
  $("#source-grid").innerHTML = state.sources.map(source => `
    <article class="source-card" data-auto="${source.auto_sync}">
      <header><h3>${escapeHTML(source.name)}</h3>${source.auto_sync ? '<span class="auto-tag">SNAPSHOT</span>' : '<span class="auto-tag">LINK</span>'}</header>
      <p>${escapeHTML(source.description)}</p>
      <small>${escapeHTML(source.strengths)}</small>
      <footer><a href="${escapeHTML(source.search_url || source.homepage)}" target="_blank" rel="noopener noreferrer"><svg><use href="#i-external"/></svg>打开来源</a><span class="source-health ${source.last_sync_status}">${source.item_count ? `${source.item_count} 条入选` : "搜索入口"}</span></footer>
    </article>`).join("");
}

function openDetail(job) {
  if (!job) return;
  const favorite = favorites.has(String(job.id));
  const apply = job.apply_url ? `<a class="pixel-action" href="${escapeHTML(job.apply_url)}" target="_blank" rel="noopener noreferrer"><svg><use href="#i-external"/></svg>打开投递页</a>` : "";
  const source = job.source_url ? `<a class="pixel-action secondary" href="${escapeHTML(job.source_url)}" target="_blank" rel="noopener noreferrer"><svg><use href="#i-link"/></svg>核验来源</a>` : "";
  $("#detail-content").innerHTML = `
    <section class="detail-heading"><div><h2>${escapeHTML(job.title)}</h2><p>${escapeHTML(job.company)} // ${escapeHTML(job.location)}</p></div><span class="status-chip ${escapeHTML(job.status)}">${STATUS[job.status] || escapeHTML(job.status)}</span></section>
    <div class="detail-meta"><span>${CATEGORY[job.category] || escapeHTML(job.category)}</span>${job.is_internship ? '<span class="internship-chip">实习岗</span>' : ""}<span>${escapeHTML(job.salary || "面议")}</span>${job.experience ? `<span>${escapeHTML(job.experience)}</span>` : ""}${job.education ? `<span>${escapeHTML(job.education)}</span>` : ""}<span>相关度 ${escapeHTML(job.relevance)}</span><span class="confidence-chip grade-${escapeHTML(job.confidence_grade)}">${escapeHTML(job.confidence_grade)} 级 · ${escapeHTML(job.confidence)}%</span><span>发布 ${formatDate(job.posted_at)}</span></div>
    <section class="detail-section"><h3>技能信号 / SKILLS</h3><div class="skills">${(job.skills || []).map(skill => `<span class="skill-chip">${escapeHTML(skill)}</span>`).join("") || '<span class="skill-chip">未提取</span>'}</div></section>
    <section class="detail-section"><h3>岗位职责 / DESCRIPTION</h3><p>${escapeHTML(job.description || "来源未提供完整岗位职责，请打开原始页面查看。")}</p></section>
    <section class="detail-section"><h3>任职要求 / REQUIREMENTS</h3><p>${escapeHTML(job.requirements || "来源未将任职要求拆分为独立字段，请打开原始页面核验。")}</p></section>
    ${job.is_internship ? `<section class="detail-section"><h3>实习标注 / INTERNSHIP TAG</h3><p>${escapeHTML(job.internship_reason || "岗位标题或性质明确标记为实习")}</p></section>` : ""}
    <section class="detail-section"><h3>状态依据 / STATUS TRACE</h3><p>${escapeHTML(job.status_reason || "没有明确状态说明")}\n最后看见：${escapeHTML(job.last_seen_at || "未知")}\n来源更新：${escapeHTML(job.source_updated_at || "未知")}</p></section>
    <section class="detail-section"><h3>来源置信度 / TRUST SCORE</h3><p>${escapeHTML(job.confidence_grade)} 级 · ${escapeHTML(job.confidence)} / 99\n${escapeHTML(job.confidence_reason || "暂无评分说明")}\n评分只衡量来源可信与可追溯程度，不等于岗位或录用担保。</p></section>
    <div class="detail-actions">${apply}${source}<button class="pixel-action secondary" data-detail-favorite="${escapeHTML(job.id)}"><svg><use href="#i-star"/></svg>${favorite ? "取消收藏" : "加入收藏"}</button><span class="source-note">来源：${escapeHTML(job.source_name)}｜所有状态以来源页为准</span></div>`;
  $("#detail-dialog").showModal();
}

async function toggleFavorite(id) {
  const key = String(id);
  if (favorites.has(key)) favorites.delete(key); else favorites.add(key);
  saveFavoriteIds();
  toast(favorites.has(key) ? "已保存在当前浏览器" : "已取消收藏");
  await loadJobs();
  loadStats();
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function exportCsv(event) {
  event.preventDefault();
  const fields = ["title", "company", "category", "location", "salary", "employment_type", "skills", "status", "confidence", "apply_url", "source_url"];
  const header = ["职位", "公司", "分类", "地点", "薪资", "性质", "技能", "状态", "置信度", "投递页", "来源页"];
  const rows = state.filtered.map(job => fields.map(field => csvCell(job[field])).join(","));
  const blob = new Blob(["\ufeff", [header.map(csvCell).join(","), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `hermes-work-radar-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast(`已导出 ${state.filtered.length} 条当前筛选结果`);
}

async function loadSnapshot(force = false) {
  const suffix = force ? `?v=${Date.now()}` : "";
  const response = await fetch(`./jobs.json${suffix}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`职位快照读取失败：HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload.items) || !Array.isArray(payload.sources)) throw new Error("职位快照格式不正确");
  state.allJobs = payload.items;
  state.sources = payload.sources;
  state.generatedAt = payload.generated_at || "";
}

async function refreshSnapshot() {
  const button = $("#sync-button");
  button.disabled = true;
  button.classList.add("syncing");
  setStatus("SYNC // 正在刷新公开快照", "BUSY");
  try {
    await loadSnapshot(true);
    state.page = 1;
    loadLocations();
    loadSources();
    await loadJobs();
    loadStats();
    toast(`已刷新：公开版收录 ${state.allJobs.length} 条职位`);
  } catch (error) {
    toast(error.message);
    setStatus(`ERROR // ${error.message}`, "ERROR");
  } finally {
    button.disabled = false;
    button.classList.remove("syncing");
  }
}

function selectNav(button) {
  $$(".category-nav button").forEach(item => item.classList.toggle("active", item === button));
  state.category = button.dataset.category || "";
  state.favorite = button.dataset.favorite || "";
  state.page = 1;
  loadJobs();
}

function bindEvents() {
  $(".category-nav").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (button) selectNav(button);
  });
  $("#search-input").addEventListener("input", event => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = event.target.value.trim(); state.page = 1; loadJobs(); }, 220);
  });
  $("#status-filter").addEventListener("change", event => { state.status = event.target.value; state.page = 1; loadJobs(); });
  $("#location-tags").addEventListener("click", event => {
    const button = event.target.closest("[data-location]");
    if (!button) return;
    state.location = button.dataset.location;
    state.page = 1;
    loadLocations();
    loadJobs();
    loadStats();
  });
  $("#opportunity-tags").addEventListener("click", event => {
    const button = event.target.closest("[data-internship]");
    if (!button) return;
    state.internship = button.dataset.internship;
    state.page = 1;
    $$("#opportunity-tags button").forEach(item => item.classList.toggle("active", item === button));
    loadLocations();
    loadJobs();
    loadStats();
  });
  $("#confidence-filter").addEventListener("change", event => {
    state.min_confidence = event.target.value;
    state.page = 1;
    loadLocations();
    loadJobs();
    loadStats();
  });
  $("#sort-select").addEventListener("change", event => { state.sort = event.target.value; state.page = 1; loadJobs(); });
  $("#sync-button").addEventListener("click", refreshSnapshot);
  $("#export-link").addEventListener("click", exportCsv);
  $("#source-filter").addEventListener("click", () => $("#sources-dialog").showModal());
  $$('[data-action="sources"]').forEach(button => button.addEventListener("click", () => $("#sources-dialog").showModal()));
  $$('[data-action="guide"]').forEach(button => button.addEventListener("click", () => toast("公开版是静态职位快照；收藏留在浏览器，投递前必须打开来源页复核。")));
  $$(".dialog-close").forEach(button => button.addEventListener("click", () => button.closest("dialog").close()));
  $$("dialog").forEach(dialog => dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); }));
  $("#job-list").addEventListener("click", event => {
    const favorite = event.target.closest("[data-favorite-id]");
    if (favorite) { event.stopPropagation(); toggleFavorite(favorite.dataset.favoriteId); return; }
    const card = event.target.closest(".job-card");
    if (card) openDetail(state.jobs.find(job => String(job.id) === card.dataset.id));
  });
  $("#job-list").addEventListener("keydown", event => {
    if ((event.key === "Enter" || event.key === " ") && event.target.classList.contains("job-card")) {
      event.preventDefault();
      openDetail(state.jobs.find(job => String(job.id) === event.target.dataset.id));
    }
  });
  $("#detail-content").addEventListener("click", event => {
    const button = event.target.closest("[data-detail-favorite]");
    if (button) { $("#detail-dialog").close(); toggleFavorite(button.dataset.detailFavorite); }
  });
  $("#pagination").addEventListener("click", event => {
    const button = event.target.closest("[data-page]");
    if (button) { state.page = Number(button.dataset.page); loadJobs(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#search-input").focus(); }
    if (event.key === "Escape") $("#search-input").blur();
  });
}

function startClock() {
  const update = () => $("#clock").textContent = new Intl.DateTimeFormat("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
  update();
  setInterval(update, 1000);
}

async function init() {
  bindEvents();
  startClock();
  renderLoading();
  setStatus("BOOT // 正在载入公开职位快照", "BUSY");
  try {
    await loadSnapshot();
    loadLocations();
    loadSources();
    await loadJobs();
    loadStats();
  } catch (error) {
    $("#job-list").innerHTML = `<div class="empty-state"><strong>SNAPSHOT ERROR</strong><p>${escapeHTML(error.message)}</p></div>`;
    setStatus(`ERROR // ${error.message}`, "ERROR");
  }
}

init();
