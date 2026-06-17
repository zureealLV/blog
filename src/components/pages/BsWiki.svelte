<script lang="ts">
import { onMount } from 'svelte';
import Icon from '@/components/common/Icon.svelte';

interface WikiEntry {
  game: string;
  category: string;
  page: string;
  title: string;
  content: string;
  tables: string[][][];
  id: string;
}

// State
let allEntries: WikiEntry[] = [];
let filtered: WikiEntry[] = [];
let keyword = '';
let selectedGame = '';
let selectedCategory = '';
let selectedPage = '';
let selectedEntry: WikiEntry | null = null;
let isLoading = true;
let showSidebar = false;

// Derived navigation structure
$: navTree = buildNavTree(allEntries);
$: games = Object.keys(navTree);
$: categories = selectedGame ? Object.keys(navTree[selectedGame] || {}) : [];
$: pages = (selectedGame && selectedCategory) ? Object.keys(navTree[selectedGame]?.[selectedCategory] || {}) : [];

$: {
  // Filter entries
  let result = allEntries;
  if (selectedGame) result = result.filter(e => e.game === selectedGame);
  if (selectedCategory) result = result.filter(e => e.category === selectedCategory);
  if (selectedPage) result = result.filter(e => e.page === selectedPage);
  if (keyword.trim()) {
    const kw = keyword.toLowerCase();
    result = result.filter(e =>
      e.title.toLowerCase().includes(kw) ||
      e.content.toLowerCase().includes(kw)
    );
  }
  filtered = result;
}

function buildNavTree(entries: WikiEntry[]) {
  const tree: Record<string, Record<string, Record<string, number>>> = {};
  for (const e of entries) {
    if (!tree[e.game]) tree[e.game] = {};
    if (!tree[e.game][e.category]) tree[e.game][e.category] = {};
    if (!tree[e.game][e.category][e.page]) tree[e.game][e.category][e.page] = 0;
    tree[e.game][e.category][e.page]++;
  }
  return tree;
}

function selectGame(game: string) {
  selectedGame = selectedGame === game ? '' : game;
  selectedCategory = '';
  selectedPage = '';
  selectedEntry = null;
}

function selectCategory(cat: string) {
  selectedCategory = selectedCategory === cat ? '' : cat;
  selectedPage = '';
  selectedEntry = null;
}

function selectPage(page: string) {
  selectedPage = selectedPage === page ? '' : page;
  selectedEntry = null;
}

function selectEntry(entry: WikiEntry) {
  selectedEntry = entry;
  showSidebar = false;
}

function clearFilters() {
  selectedGame = '';
  selectedCategory = '';
  selectedPage = '';
  selectedEntry = null;
  keyword = '';
}

function gameLabel(game: string) {
  return game === 'BLACKSOULS' ? 'BS1' : 'BS2';
}

function catIcon(cat: string) {
  if (cat.includes('角色')) return 'material-symbols:person';
  if (cat.includes('道具') || cat.includes('装备')) return 'material-symbols:shield';
  if (cat.includes('攻略') || cat.includes('建议')) return 'material-symbols:map';
  return 'material-symbols:book';
}

function highlightText(text: string, kw: string): string {
  if (!kw.trim()) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const kwEsc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(`(${kwEsc})`, 'gi'), '<mark>$1</mark>');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function contentPreview(content: string, maxLen = 120): string {
  if (!content) return '';
  return content.length > maxLen ? content.slice(0, maxLen) + '…' : content;
}

onMount(async () => {
  try {
    const resp = await fetch('/data/bs_wiki.json');
    allEntries = await resp.json();
    filtered = allEntries;
  } catch (e) {
    console.error('Failed to load wiki data:', e);
  } finally {
    isLoading = false;
  }
});
</script>

<div class="wiki-container">
  <!-- Mobile sidebar toggle -->
  <button class="sidebar-toggle" on:click={() => showSidebar = !showSidebar}>
    <Icon icon="material-symbols:menu" class="text-xl" />
  </button>

  <!-- Sidebar -->
  <aside class="wiki-sidebar" class:show={showSidebar}>
    <div class="sidebar-header">
      <h2 class="text-lg font-bold text-90 flex items-center gap-2">
        <Icon icon="material-symbols:menu-book" class="text-(--primary)" />
        BS Wiki
      </h2>
      <button class="text-50 hover:text-90 transition-colors" on:click={clearFilters}>
        <Icon icon="material-symbols:filter-alt-off" class="text-lg" />
      </button>
    </div>

    <!-- Search -->
    <div class="sidebar-search">
      <Icon icon="material-symbols:search" class="text-sm text-50 absolute left-2.5 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        placeholder="搜索词条..."
        bind:value={keyword}
        class="sidebar-input"
      />
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      {#each games as game}
        <button
          class="nav-game"
          class:active={selectedGame === game}
          on:click={() => selectGame(game)}
        >
          <Icon icon={selectedGame === game ? 'material-symbols:expand-more' : 'material-symbols:chevron-right'} class="text-sm" />
          <span class="font-bold">{gameLabel(game)}</span>
          <span class="text-xs text-50 ml-auto">{game === 'BLACKSOULS' ? '一代' : '二代'}</span>
        </button>

        {#if selectedGame === game}
          {#each categories as cat}
            <button
              class="nav-cat"
              class:active={selectedCategory === cat}
              on:click={() => selectCategory(cat)}
            >
              <Icon icon={catIcon(cat)} class="text-sm" />
              <span>{cat}</span>
            </button>

            {#if selectedCategory === cat}
              {#each pages as page}
                <button
                  class="nav-page"
                  class:active={selectedPage === page}
                  on:click={() => selectPage(page)}
                >
                  <span>{page}</span>
                  <span class="text-xs text-50 ml-auto">{navTree[game][cat][page]}</span>
                </button>
              {/each}
            {/if}
          {/each}
        {/if}
      {/each}
    </nav>

    <!-- Stats -->
    <div class="sidebar-stats">
      共 {allEntries.length} 词条 · {filtered.length} 显示中
    </div>
  </aside>

  <!-- Overlay for mobile -->
  {#if showSidebar}
    <button class="sidebar-overlay" on:click={() => showSidebar = false} aria-label="Close sidebar"></button>
  {/if}

  <!-- Main content -->
  <main class="wiki-main">
    {#if isLoading}
      <div class="loading-state">
        <Icon icon="svg-spinners:ring-resize" class="text-4xl text-(--primary)" />
        <p class="text-50 mt-3">加载中...</p>
      </div>
    {:else if selectedEntry}
      <!-- Single entry view -->
      <div class="entry-view">
        <button class="back-btn" on:click={() => selectedEntry = null}>
          <Icon icon="material-symbols:arrow-back" class="text-sm" />
          返回列表
        </button>

        <div class="entry-breadcrumb">
          <span class="game-tag" class:bs1={selectedEntry.game === 'BLACKSOULS'} class:bs2={selectedEntry.game !== 'BLACKSOULS'}>
            {gameLabel(selectedEntry.game)}
          </span>
          <span class="text-50">›</span>
          <span class="text-75">{selectedEntry.category}</span>
          <span class="text-50">›</span>
          <span class="text-75">{selectedEntry.page}</span>
        </div>

        <h1 class="entry-title">{selectedEntry.title}</h1>

        {#if selectedEntry.content}
          <div class="entry-content">
            {#each selectedEntry.content.split('\n') as line}
              {#if line.trim()}
                <p>{line}</p>
              {/if}
            {/each}
          </div>
        {/if}

        {#if selectedEntry.tables?.length}
          {#each selectedEntry.tables as table}
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    {#each Object.keys(table[0] || {}) as col}
                      <th>{col}</th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each table as row}
                    <tr>
                      {#each Object.values(row) as cell}
                        <td>{cell}</td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/each}
        {/if}
      </div>
    {:else}
      <!-- List view -->
      <div class="list-header">
        <h1 class="text-2xl font-bold text-90">
          {#if selectedGame}
            {gameLabel(selectedGame)}
            {#if selectedCategory} › {selectedCategory}{/if}
            {#if selectedPage} › {selectedPage}{/if}
          {:else}
            全部词条
          {/if}
        </h1>
        {#if keyword}
          <p class="text-sm text-50 mt-1">搜索 "{keyword}" · {filtered.length} 结果</p>
        {/if}
      </div>

      {#if filtered.length === 0}
        <div class="empty-state">
          <Icon icon="material-symbols:search-off" class="text-5xl text-30" />
          <p class="text-50 mt-3">没有找到匹配的词条</p>
        </div>
      {:else}
        <div class="entry-grid">
          {#each filtered as entry}
            <button class="entry-card" on:click={() => selectEntry(entry)}>
              <div class="entry-card-header">
                <span class="game-tag sm" class:bs1={entry.game === 'BLACKSOULS'} class:bs2={entry.game !== 'BLACKSOULS'}>
                  {gameLabel(entry.game)}
                </span>
                <span class="text-xs text-50">{entry.page}</span>
              </div>
              <h3 class="entry-card-title">{entry.title}</h3>
              {#if entry.content}
                <p class="entry-card-preview">{@html highlightText(contentPreview(entry.content), keyword)}</p>
              {/if}
              {#if entry.tables?.length}
                <div class="entry-card-badge">
                  <Icon icon="material-symbols:table-chart" class="text-xs" />
                  {entry.tables.reduce((acc, t) => acc + t.length, 0)} 条数据
                </div>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    {/if}
  </main>
</div>

<style>
  .wiki-container {
    display: flex;
    gap: 0;
    min-height: 80vh;
    position: relative;
  }

  /* Sidebar */
  .wiki-sidebar {
    width: 280px;
    flex-shrink: 0;
    border-right: 1px solid rgba(128,128,128,0.15);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    background: #fff;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .sidebar-search {
    position: relative;
    margin-bottom: 1rem;
  }

  .sidebar-input {
    width: 100%;
    padding: 0.5rem 0.5rem 0.5rem 2rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(128,128,128,0.2);
    background: transparent;
    font-size: 0.875rem;
    color: #555;
    outline: none;
    transition: border-color 0.2s;
  }

  .sidebar-input:focus {
    border-color: var(--primary);
  }

  .sidebar-nav {
    flex: 1;
    overflow-y: auto;
  }

  .nav-game, .nav-cat, .nav-page {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.4rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: #555;
    transition: all 0.15s;
    text-align: left;
    cursor: pointer;
    border: none;
    background: none;
  }

  .nav-game { padding: 0.5rem; }
  .nav-cat { padding-left: 1.5rem; font-size: 0.8125rem; }
  .nav-page { padding-left: 2.5rem; font-size: 0.75rem; }

  .nav-game:hover, .nav-cat:hover, .nav-page:hover {
    background: rgba(128,128,128,0.08);
  }

  .nav-game.active { color: var(--primary); font-weight: 600; }
  .nav-cat.active { color: var(--primary); }
  .nav-page.active { color: var(--primary); font-weight: 500; }

  .sidebar-stats {
    font-size: 0.75rem;
    color: #999;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(128,128,128,0.1);
    margin-top: 0.5rem;
  }

  /* Main */
  .wiki-main {
    flex: 1;
    min-width: 0;
    padding: 1.5rem;
  }

  .loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 40vh;
  }

  /* List */
  .list-header {
    margin-bottom: 1.5rem;
  }

  .entry-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  .entry-card {
    text-align: left;
    cursor: pointer;
    padding: 1.25rem;
    border-radius: 0.75rem;
    background: #fff;
    border: 1px solid rgba(128,128,128,0.1);
    transition: all 0.2s;
  }

  .entry-card:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  .entry-card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .entry-card-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }

  .entry-card-preview {
    font-size: 0.8125rem;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .entry-card-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.75rem;
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.7rem;
    background: rgba(128,128,128,0.08);
    color: #888;
  }

  /* Tags */
  .game-tag {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .game-tag.sm {
    padding: 0.1rem 0.35rem;
    font-size: 0.625rem;
  }

  .game-tag.bs1 {
    background: rgba(168, 85, 247, 0.15);
    color: #a855f7;
  }

  .game-tag.bs2 {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
  }

  /* Text colors - light mode */
  .entry-card-title,
  .entry-title,
  th {
    color: #1a1a1a;
  }

  .entry-card-preview,
  .entry-content,
  td,
  .sidebar-stats,
  .nav-game, .nav-cat, .nav-page {
    color: #555;
  }

  /* Text colors - dark mode */
  :global(html.dark) .entry-card-title,
  :global(html.dark) .entry-title,
  :global(html.dark) th {
    color: #e5e5e5;
  }

  :global(html.dark) .entry-card-preview,
  :global(html.dark) .entry-content,
  :global(html.dark) td,
  :global(html.dark) .sidebar-stats,
  :global(html.dark) .nav-game,
  :global(html.dark) .nav-cat,
  :global(html.dark) .nav-page {
    color: #b3b3b3;
  }

  :global(html.dark) .entry-card,
  :global(html.dark) .wiki-sidebar {
    background: rgba(30, 30, 30, 0.95);
  }

  :global(html.dark) .table-wrapper {
    border-color: rgba(255,255,255,0.1);
  }

  :global(html.dark) thead {
    background: rgba(255,255,255,0.06);
  }

  :global(html.dark) .sidebar-input {
    border-color: rgba(255,255,255,0.15);
    color: #e5e5e5;
  }

  :global(html.dark) .back-btn {
    color: #b3b3b3;
  }

  :global(html.dark) .back-btn:hover {
    color: #e5e5e5;
  }

  /* Entry view */
  .entry-view {
    max-width: 900px;
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.4rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    color: #888;
    transition: all 0.15s;
    margin-bottom: 1rem;
    cursor: pointer;
    border: none;
    background: none;
  }

  .back-btn:hover {
    color: #333;
    background: rgba(128,128,128,0.08);
  }

  .entry-breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    margin-bottom: 0.75rem;
  }

  .entry-title {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    line-height: 1.3;
  }

  .entry-content {
    font-size: 0.9375rem;
    line-height: 1.8;
  }

  .entry-content p {
    margin-bottom: 0.75rem;
  }

  /* Tables */
  .table-wrapper {
    overflow-x: auto;
    margin: 1.5rem 0;
    border-radius: 0.5rem;
    border: 1px solid rgba(128,128,128,0.15);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;
  }

  thead {
    background: rgba(128,128,128,0.06);
  }

  th {
    padding: 0.625rem 0.75rem;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid rgba(128,128,128,0.15);
    white-space: nowrap;
  }

  td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid rgba(128,128,128,0.08);
    max-width: 400px;
    word-break: break-word;
  }

  tr:hover td {
    background: var(--primary-bg, rgba(128,128,128,0.04));
  }

  /* Mark highlight */
  :global(mark) {
    background: transparent;
    color: var(--primary);
    font-weight: 600;
  }

  /* Mobile */
  .sidebar-toggle {
    display: none;
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 50;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    border: none;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }

  .sidebar-overlay {
    display: none;
  }

  @media (max-width: 768px) {
    .wiki-container {
      flex-direction: column;
    }

    .wiki-sidebar {
      position: fixed;
      left: -100%;
      top: 0;
      height: 100vh;
      z-index: 100;
      transition: left 0.3s;
      width: 280px;
      box-shadow: 4px 0 20px rgba(0,0,0,0.2);
    }

    .wiki-sidebar.show {
      left: 0;
    }

    .sidebar-toggle {
      display: flex;
    }

    .sidebar-overlay {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 99;
      background: rgba(0,0,0,0.4);
      border: none;
      cursor: pointer;
    }

    .entry-grid {
      grid-template-columns: 1fr;
    }

    .wiki-main {
      padding: 1rem;
    }

    .entry-title {
      font-size: 1.5rem;
    }
  }
</style>
