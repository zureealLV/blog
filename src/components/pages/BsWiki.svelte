<script lang="ts">
import { onMount } from 'svelte';
import Icon from '@/components/common/Icon.svelte';

interface WikiEntry {
  game: string;
  category: string;
  page: string;
  title: string;
  blocks: Block[];
  id: string;
}

interface Block {
  type: 'text' | 'h3' | 'h4' | 'table' | 'list' | 'ordered_list';
  text?: string;
  items?: string[];
  data?: Record<string, string>[];
  headers?: string[];
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

// Derived
$: navTree = buildNavTree(allEntries);
$: games = Object.keys(navTree);
$: categories = selectedGame ? Object.keys(navTree[selectedGame] || {}) : [];
$: pages = (selectedGame && selectedCategory) ? Object.keys(navTree[selectedGame]?.[selectedCategory] || {}) : [];

$: {
  let result = allEntries;
  if (selectedGame) result = result.filter(e => e.game === selectedGame);
  if (selectedCategory) result = result.filter(e => e.category === selectedCategory);
  if (selectedPage) result = result.filter(e => e.page === selectedPage);
  if (keyword.trim()) {
    const kw = keyword.toLowerCase();
    result = result.filter(e =>
      e.title.toLowerCase().includes(kw) ||
      e.blocks.some(b => (b.text || '').toLowerCase().includes(kw) || (b.items || []).some(i => i.toLowerCase().includes(kw)))
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

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatBold(text: string, kw?: string): string {
  let html = escapeHtml(text);
  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="inline-bold">$1</strong>');
  // Highlight search keyword
  if (kw && kw.trim()) {
    const kwEsc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Don't highlight inside tags
    html = html.replace(new RegExp(`(${kwEsc})(?![^<]*>)`, 'gi'), '<mark>$1</mark>');
  }
  return html;
}

function contentPreview(blocks: Block[], maxLen = 120): string {
  for (const b of blocks) {
    if (b.type === 'text' && b.text) {
      const clean = b.text.replace(/\*\*/g, '').replace(/\n/g, ' ');
      return clean.length > maxLen ? clean.slice(0, maxLen) + '…' : clean;
    }
    if (b.type === 'h3' && b.text) {
      return b.text;
    }
  }
  return '';
}

function countData(blocks: Block[]): number {
  return blocks.reduce((acc, b) => {
    if (b.type === 'table') return acc + (b.data?.length || 0);
    return acc;
  }, 0);
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
      <h2 class="text-lg font-bold flex items-center gap-2 sidebar-title">
        <Icon icon="material-symbols:menu-book" class="text-(--primary)" />
        BS Wiki
      </h2>
      <button class="clear-btn" on:click={clearFilters}>
        <Icon icon="material-symbols:filter-alt-off" class="text-lg" />
      </button>
    </div>

    <div class="sidebar-search">
      <Icon icon="material-symbols:search" class="text-sm search-icon absolute left-2.5 top-1/2 -translate-y-1/2" />
      <input type="text" placeholder="搜索词条..." bind:value={keyword} class="sidebar-input" />
    </div>

    <nav class="sidebar-nav">
      {#each games as game}
        <button class="nav-game" class:active={selectedGame === game} on:click={() => selectGame(game)}>
          <Icon icon={selectedGame === game ? 'material-symbols:expand-more' : 'material-symbols:chevron-right'} class="text-sm" />
          <span class="font-bold">{gameLabel(game)}</span>
          <span class="text-xs ml-auto nav-sub">{game === 'BLACKSOULS' ? '一代' : '二代'}</span>
        </button>

        {#if selectedGame === game}
          {#each categories as cat}
            <button class="nav-cat" class:active={selectedCategory === cat} on:click={() => selectCategory(cat)}>
              <Icon icon={catIcon(cat)} class="text-sm" />
              <span>{cat}</span>
            </button>

            {#if selectedCategory === cat}
              {#each pages as page}
                <button class="nav-page" class:active={selectedPage === page} on:click={() => selectPage(page)}>
                  <span>{page}</span>
                  <span class="text-xs ml-auto nav-sub">{navTree[game][cat][page]}</span>
                </button>
              {/each}
            {/if}
          {/each}
        {/if}
      {/each}
    </nav>

    <div class="sidebar-stats">
      共 {allEntries.length} 词条 · {filtered.length} 显示中
    </div>
  </aside>

  {#if showSidebar}
    <button class="sidebar-overlay" on:click={() => showSidebar = false} aria-label="Close sidebar"></button>
  {/if}

  <!-- Main content -->
  <main class="wiki-main">
    {#if isLoading}
      <div class="loading-state">
        <Icon icon="svg-spinners:ring-resize" class="text-4xl text-(--primary)" />
        <p class="loading-text mt-3">加载中...</p>
      </div>
    {:else if selectedEntry}
      <!-- Detail view -->
      <div class="entry-view">
        <button class="back-btn" on:click={() => selectedEntry = null}>
          <Icon icon="material-symbols:arrow-back" class="text-sm" />
          返回列表
        </button>

        <div class="entry-breadcrumb">
          <span class="game-tag" class:bs1={selectedEntry.game === 'BLACKSOULS'} class:bs2={selectedEntry.game !== 'BLACKSOULS'}>
            {gameLabel(selectedEntry.game)}
          </span>
          <span class="breadcrumb-sep">›</span>
          <span class="breadcrumb-text">{selectedEntry.category}</span>
          <span class="breadcrumb-sep">›</span>
          <span class="breadcrumb-text">{selectedEntry.page}</span>
        </div>

        <h1 class="entry-title">{selectedEntry.title}</h1>

        {#each selectedEntry.blocks as block}
          {#if block.type === 'h3'}
            <h3 class="block-h3">{block.text}</h3>
          {:else if block.type === 'h4'}
            <h4 class="block-h4">{block.text}</h4>
          {:else if block.type === 'text'}
            <div class="entry-content">
              {#each (block.text || '').split('\n') as line}
                {#if line.trim()}
                  <p>{@html formatBold(line, keyword)}</p>
                {/if}
              {/each}
            </div>
          {:else if block.type === 'list'}
            <ul class="entry-list">
              {#each block.items || [] as item}
                <li>{@html formatBold(item, keyword)}</li>
              {/each}
            </ul>
          {:else if block.type === 'ordered_list'}
            <ol class="entry-olist">
              {#each block.items || [] as item}
                <li>{@html formatBold(item, keyword)}</li>
              {/each}
            </ol>
          {:else if block.type === 'table' && block.data?.length}
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    {#each block.headers || Object.keys(block.data[0] || {}) as col}
                      <th>{col}</th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each block.data as row}
                    <tr>
                      {#each Object.values(row) as cell}
                        <td>{@html formatBold(cell, keyword)}</td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        {/each}
      </div>

    {:else}
      <!-- List view -->
      <div class="list-header">
        <h1 class="list-title">
          {#if selectedGame}
            {gameLabel(selectedGame)}
            {#if selectedCategory} › {selectedCategory}{/if}
            {#if selectedPage} › {selectedPage}{/if}
          {:else}
            全部词条
          {/if}
        </h1>
        {#if keyword}
          <p class="list-sub">搜索 "{keyword}" · {filtered.length} 结果</p>
        {/if}
      </div>

      {#if filtered.length === 0}
        <div class="empty-state">
          <Icon icon="material-symbols:search-off" class="text-5xl empty-icon" />
          <p class="empty-text mt-3">没有找到匹配的词条</p>
        </div>
      {:else}
        <div class="entry-grid">
          {#each filtered as entry}
            <button class="entry-card" on:click={() => selectEntry(entry)}>
              <div class="entry-card-header">
                <span class="game-tag sm" class:bs1={entry.game === 'BLACKSOULS'} class:bs2={entry.game !== 'BLACKSOULS'}>
                  {gameLabel(entry.game)}
                </span>
                <span class="card-page">{entry.page}</span>
              </div>
              <h3 class="entry-card-title">{entry.title}</h3>
              {#if contentPreview(entry.blocks)}
                <p class="entry-card-preview">{@html formatBold(contentPreview(entry.blocks), keyword)}</p>
              {/if}
              {#if countData(entry.blocks) > 0}
                <div class="entry-card-badge">
                  <Icon icon="material-symbols:table-chart" class="text-xs" />
                  {countData(entry.blocks)} 条数据
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

  /* ===== Sidebar ===== */
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

  :global(html.dark) .wiki-sidebar {
    background: rgba(26, 26, 26, 0.98);
    border-right-color: rgba(255,255,255,0.08);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .sidebar-title { color: #1a1a1a; }
  :global(html.dark) .sidebar-title { color: #e5e5e5; }

  .clear-btn {
    color: #999;
    transition: color 0.15s;
    background: none;
    border: none;
    cursor: pointer;
  }
  .clear-btn:hover { color: #333; }
  :global(html.dark) .clear-btn { color: #666; }
  :global(html.dark) .clear-btn:hover { color: #ccc; }

  .sidebar-search { position: relative; margin-bottom: 1rem; }

  .search-icon { color: #999; }
  :global(html.dark) .search-icon { color: #666; }

  .sidebar-input {
    width: 100%;
    padding: 0.5rem 0.5rem 0.5rem 2rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(128,128,128,0.2);
    background: transparent;
    font-size: 0.875rem;
    color: #333;
    outline: none;
    transition: border-color 0.2s;
  }
  .sidebar-input:focus { border-color: var(--primary); }
  .sidebar-input::placeholder { color: #999; }
  :global(html.dark) .sidebar-input { color: #e5e5e5; border-color: rgba(255,255,255,0.12); }
  :global(html.dark) .sidebar-input::placeholder { color: #666; }

  .sidebar-nav { flex: 1; overflow-y: auto; }

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
  :global(html.dark) .nav-game,
  :global(html.dark) .nav-cat,
  :global(html.dark) .nav-page { color: #b3b3b3; }

  .nav-game { padding: 0.5rem; }
  .nav-cat { padding-left: 1.5rem; font-size: 0.8125rem; }
  .nav-page { padding-left: 2.5rem; font-size: 0.75rem; }

  .nav-game:hover, .nav-cat:hover, .nav-page:hover { background: rgba(128,128,128,0.08); }
  :global(html.dark) .nav-game:hover,
  :global(html.dark) .nav-cat:hover,
  :global(html.dark) .nav-page:hover { background: rgba(255,255,255,0.06); }

  .nav-game.active { color: var(--primary); font-weight: 600; }
  .nav-cat.active { color: var(--primary); }
  .nav-page.active { color: var(--primary); font-weight: 500; }

  .nav-sub { color: #999; }
  :global(html.dark) .nav-sub { color: #666; }

  .sidebar-stats {
    font-size: 0.75rem;
    color: #999;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(128,128,128,0.1);
    margin-top: 0.5rem;
  }
  :global(html.dark) .sidebar-stats { color: #666; border-top-color: rgba(255,255,255,0.06); }

  /* ===== Main ===== */
  .wiki-main { flex: 1; min-width: 0; padding: 1.5rem; }

  .loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 40vh;
  }
  .loading-text { color: #999; }
  :global(html.dark) .loading-text { color: #666; }
  .empty-icon { color: #ccc; }
  :global(html.dark) .empty-icon { color: #444; }
  .empty-text { color: #999; }
  :global(html.dark) .empty-text { color: #666; }

  /* ===== List ===== */
  .list-header { margin-bottom: 1.5rem; }
  .list-title { font-size: 1.5rem; font-weight: 700; color: #1a1a1a; }
  :global(html.dark) .list-title { color: #e5e5e5; }
  .list-sub { font-size: 0.875rem; color: #999; margin-top: 0.25rem; }
  :global(html.dark) .list-sub { color: #666; }

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
  :global(html.dark) .entry-card { background: rgba(30, 30, 30, 0.95); border-color: rgba(255,255,255,0.08); }

  .entry-card:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }
  :global(html.dark) .entry-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.3); }

  .entry-card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
  .card-page { font-size: 0.75rem; color: #999; }
  :global(html.dark) .card-page { color: #666; }

  .entry-card-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }
  :global(html.dark) .entry-card-title { color: #e5e5e5; }

  .entry-card-preview {
    font-size: 0.8125rem;
    color: #666;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  :global(html.dark) .entry-card-preview { color: #999; }

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
  :global(html.dark) .entry-card-badge { background: rgba(255,255,255,0.06); color: #888; }

  /* ===== Game Tags ===== */
  .game-tag {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .game-tag.sm { padding: 0.1rem 0.35rem; font-size: 0.625rem; }
  .game-tag.bs1 { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
  .game-tag.bs2 { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }

  /* ===== Entry Detail View ===== */
  .entry-view { max-width: 900px; }

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
  .back-btn:hover { color: #333; background: rgba(128,128,128,0.08); }
  :global(html.dark) .back-btn { color: #888; }
  :global(html.dark) .back-btn:hover { color: #e5e5e5; background: rgba(255,255,255,0.06); }

  .entry-breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    margin-bottom: 0.75rem;
  }
  .breadcrumb-sep { color: #ccc; }
  :global(html.dark) .breadcrumb-sep { color: #555; }
  .breadcrumb-text { color: #666; }
  :global(html.dark) .breadcrumb-text { color: #999; }

  .entry-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 1.5rem;
    line-height: 1.3;
  }
  :global(html.dark) .entry-title { color: #f0f0f0; }

  /* ===== Block Renderers ===== */

  /* h3 sub-section header */
  .block-h3 {
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--primary);
    margin: 2rem 0 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid rgba(128,128,128,0.12);
    line-height: 1.3;
  }
  :global(html.dark) .block-h3 {
    border-bottom-color: rgba(255,255,255,0.08);
  }

  /* h4 sub-sub-section header */
  .block-h4 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #333;
    margin: 1.5rem 0 0.5rem;
    padding-left: 0.75rem;
    border-left: 3px solid var(--primary);
    line-height: 1.3;
  }
  :global(html.dark) .block-h4 { color: #ddd; }

  /* Text content */
  .entry-content {
    font-size: 0.9375rem;
    line-height: 1.8;
    color: #444;
  }
  :global(html.dark) .entry-content { color: #c0c0c0; }
  .entry-content p { margin-bottom: 0.75rem; }

  /* Bold text inline */
  :global(.inline-bold) {
    font-weight: 700;
    color: #222;
  }
  :global(html.dark) :global(.inline-bold) {
    color: #e0e0e0;
  }

  /* Lists */
  .entry-list {
    margin: 0.75rem 0;
    padding-left: 1.5rem;
    list-style: disc;
    font-size: 0.9375rem;
    line-height: 1.8;
    color: #444;
  }
  :global(html.dark) .entry-list { color: #c0c0c0; }
  .entry-list li { margin-bottom: 0.25rem; }

  .entry-olist {
    margin: 0.75rem 0;
    padding-left: 1.5rem;
    list-style: decimal;
    font-size: 0.9375rem;
    line-height: 1.8;
    color: #444;
  }
  :global(html.dark) .entry-olist { color: #c0c0c0; }
  .entry-olist li { margin-bottom: 0.25rem; }

  /* Tables */
  .table-wrapper {
    overflow-x: auto;
    margin: 1.5rem 0;
    border-radius: 0.5rem;
    border: 1px solid rgba(128,128,128,0.15);
  }
  :global(html.dark) .table-wrapper { border-color: rgba(255,255,255,0.1); }

  table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }

  thead { background: rgba(128,128,128,0.06); }
  :global(html.dark) thead { background: rgba(255,255,255,0.06); }

  th {
    padding: 0.625rem 0.75rem;
    text-align: left;
    font-weight: 600;
    color: #1a1a1a;
    border-bottom: 2px solid rgba(128,128,128,0.15);
    white-space: nowrap;
  }
  :global(html.dark) th { color: #e5e5e5; border-bottom-color: rgba(255,255,255,0.1); }

  td {
    padding: 0.5rem 0.75rem;
    color: #444;
    border-bottom: 1px solid rgba(128,128,128,0.08);
    max-width: 400px;
    word-break: break-word;
  }
  :global(html.dark) td { color: #bbb; border-bottom-color: rgba(255,255,255,0.05); }

  tr:hover td { background: rgba(128,128,128,0.04); }
  :global(html.dark) tr:hover td { background: rgba(255,255,255,0.03); }

  /* Search highlight */
  :global(mark) {
    background: transparent;
    color: var(--primary);
    font-weight: 600;
  }

  /* ===== Mobile ===== */
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
  .sidebar-overlay { display: none; }

  @media (max-width: 768px) {
    .wiki-container { flex-direction: column; }
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
    .wiki-sidebar.show { left: 0; }
    .sidebar-toggle { display: flex; }
    .sidebar-overlay {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 99;
      background: rgba(0,0,0,0.4);
      border: none;
      cursor: pointer;
    }
    .entry-grid { grid-template-columns: 1fr; }
    .wiki-main { padding: 1rem; }
    .entry-title { font-size: 1.5rem; }
  }
</style>
