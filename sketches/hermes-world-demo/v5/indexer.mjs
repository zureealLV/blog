import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import matter from 'gray-matter';
import { marked } from 'marked';
import sanitize from 'sanitize-html';
import { topics, classify, positionFor } from './topics.mjs';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const repo = path.resolve(here, '../../..');
export const source = path.join(repo, 'src/content/posts');
const require = createRequire(import.meta.url);
const astroDir = path.dirname(require.resolve('astro/package.json'));
// Reuse installed Astro's exact glob slug implementation, including Unicode,
// punctuation, nested index files and explicit frontmatter slug overrides.
const { getContentEntryIdAndSlug } = await import(pathToFileURL(path.join(astroDir, 'dist/content/utils.js')));
export const digest = s => createHash('sha256').update(s).digest('hex').slice(0,24);

export async function filesIn(root) {
 const files = [];
 for (const entry of await readdir(root, { withFileTypes: true })) {
  const full = path.join(root, entry.name);
  if (entry.isDirectory()) files.push(...await filesIn(full));
  else if (entry.isFile() && /\.mdx?$/i.test(entry.name)) files.push(full);
 }
 return files.sort();
}
export function routeId(file, root, data) {
 return data.slug || getContentEntryIdAndSlug({ entry: pathToFileURL(file), contentDir: pathToFileURL(root + path.sep), collection: '' }).slug;
}
function plain(markdown) {
 return sanitize(marked.parse(markdown), {allowedTags: [], allowedAttributes: {}})
  .replace(/&(?:amp|lt|gt|quot|#39);/g, s => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[s]))
  .replace(/\s+/g,' ').trim();
}
function bodyHTML(body, url) {
 return sanitize(marked.parse(body), {
  allowedTags: sanitize.defaults.allowedTags.filter(t => !['iframe','img'].includes(t)),
  allowedAttributes: { a: ['href','rel','target'], code: ['class'] },
  transformTags: { a: (tag, attrs) => {
   let href = ''; try { const u = new URL(attrs.href || '', url); if (/^https?:$/.test(u.protocol)) href = u.href; } catch {}
   return {tagName:'a',attribs:{href,rel:'noopener noreferrer',target:'_blank'}};
  } },
 });
}
export async function buildSnapshot(root = source, overrides = {}) {
 const files = await filesIn(root), posts = [], bodies = new Map(), excluded = {draft:0,encrypted:0};
 const seen = new Set();
 for (const file of files) {
  const raw = await readFile(file,'utf8');
  const {data,content} = matter(raw);
  if (data.draft === true) { excluded.draft++; continue; }
  if (data.password) { excluded.encrypted++; continue; }
  if (!data.title || !data.published) throw Error(`Missing required frontmatter: ${path.relative(root,file)}`);
  const id = String(routeId(file,root,data));
  if (seen.has(id)) throw Error(`Duplicate route ID: ${id}`);
  seen.add(id);
  const url = new URL(`/posts/${id.replace(/\.(md|mdx|markdown)$/i,'')}/`, 'https://zureeallv.com').href;
  const text = plain(content.replace(/^\s*#{1,6}\s+[^\r\n]+\r?\n/,''));
  const description = String(data.description || '').trim();
  const summary = (description.length>=60 ? description : description ? `${description} ${text.startsWith(description)?text.slice(description.length):text}` : text).slice(0,100);
  const date = new Date(data.published);
  if (Number.isNaN(+date)) throw Error(`Invalid date: ${id}`);
  const assignment = classify({...data,id},text,overrides);
  const key = digest(id), bodyVersion = digest(content);
  const keywords = [...new Set(assignment.scores.flatMap(s => s.evidence))];
  const post = { id, key, url, title:String(data.title), date:date.toISOString().slice(0,10), description,
   summary, category:String(data.category || '未分类'), author:String(data.author || ((data.tags || []).includes('Hermes') ? 'Hermes' : 'Lv')),
   tags:data.tags || [], keywords, topic:assignment.topic, confidence:assignment.confidence, evidence:assignment.evidence,
   crossTopics:assignment.crossTopics, position:positionFor(id,assignment.topic), bodyVersion };
  posts.push(post); bodies.set(key, { title:post.title, html:bodyHTML(content,url), version:bodyVersion });
 }
 posts.sort((a,b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
 const groups = Object.fromEntries(topics.map(t => [t.id, posts.filter(p => p.topic === t.id).length]));
 const index = { version:digest(JSON.stringify(posts)), generatedAt:new Date().toISOString(), sourceCount:files.length, excluded,
  count:posts.length, groups, topics:topics.map(({words,...t})=>t), posts };
 return {index,bodies};
}

export async function createWatcher(root, overridesPath, onChange, interval = 1200) {
 let fingerprint = '', running = false, stopped = false;
 async function scan() {
  if (running || stopped) return;
  running = true;
  try {
   const paths = await filesIn(root);
   const overrideText = await readFile(overridesPath,'utf8');
   // Hash content, not mtime: catches same-size edits and timestamp preservation.
   const next = digest(overrideText + (await Promise.all(paths.map(async p => p + '\0' + await readFile(p,'utf8')))).join('\0'));
   if (next !== fingerprint) {
    const snapshot = await buildSnapshot(root, JSON.parse(overrideText));
    if (!stopped) { await onChange(null,snapshot); fingerprint = next; }
   }
  } catch (error) { if (!stopped) await onChange(error); }
  finally { running = false; }
 }
 await scan();
 const timer = setInterval(scan, interval);
 return () => { stopped = true; clearInterval(timer); };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const {index} = await buildSnapshot(source, JSON.parse(await readFile(path.join(here,'topic-overrides.json'),'utf8')));
 await writeFile(path.join(here,'index.report.json'),JSON.stringify(index,null,2));
 console.log(JSON.stringify({count:index.count,sourceCount:index.sourceCount,excluded:index.excluded,groups:index.groups},null,2));
}
