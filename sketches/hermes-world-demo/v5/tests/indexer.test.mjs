import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSnapshot, createWatcher, here, source, routeId } from '../indexer.mjs';

const post=(title,extra='',body='意识与自我，记忆的边界。')=>`---\ntitle: "${title}"\npublished: 2026-11-07\ntags: [Hermes]\ncategory: Hermes\n${extra}\n---\n${body}`;
async function fixture(t) {
 const root=await mkdtemp(path.join(os.tmpdir(),'hermes-v5-fixture-'));
 t.after(async()=>{const resolved=path.resolve(root);assert.ok(resolved.startsWith(path.join(os.tmpdir(),'hermes-v5-fixture-')));await rm(resolved,{recursive:true,force:true});});return root;
}
test('actual source coverage, body separation, themes and route implementation',async()=>{
 const {index,bodies}=await buildSnapshot();assert.equal(index.count+index.excluded.draft+index.excluded.encrypted,index.sourceCount);
 assert.equal(index.count,bodies.size);assert.ok(index.count>=194);assert.ok(index.posts.every(p=>!('body' in p)&&!('html' in p)&&p.url.startsWith('https://zureeallv.com/posts/')));
 const hermes=new Set(index.posts.filter(p=>p.tags.includes('Hermes')).map(p=>p.topic));assert.ok(hermes.size>=4);
 // Route adapter drift tripwires: these are the owning production sources, not a guessed URL convention.
 const config=await readFile(path.join(here,'../../../src/content.config.ts'),'utf8');assert.match(config,/loader: glob/);assert.doesNotMatch(config,/generateId:/);
 const urls=await readFile(path.join(here,'../../../src/utils/url-utils.ts'),'utf8');assert.ok(urls.includes('url(`/posts/${slugWithoutExt}/`)'));
 const astro=await readFile(path.join(here,'../../../astro.config.mjs'),'utf8');assert.match(astro,/base:\s*"\/"/);
});
test('nested Unicode routes, slug override, privacy, sanitization and no invented description',async t=>{
 const root=await fixture(t);await mkdir(path.join(root,'Nested Test'));
 await writeFile(path.join(root,'Nested Test','index.md'),post('嵌套文章','description: "已有摘要优先"'));
 await writeFile(path.join(root,'Alias.md'),post('别名','slug: custom/path', '<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n# 正文'));
 await writeFile(path.join(root,'draft.md'),post('PRIVATE DRAFT','draft: true','DRAFT SECRET'));
 await writeFile(path.join(root,'password.md'),post('PRIVATE ENCRYPTED','password: secret','PASSWORD SECRET'));
 const {index,bodies}=await buildSnapshot(root);
 assert.equal(index.count,2);assert.deepEqual(index.excluded,{draft:1,encrypted:1});
 assert.equal(index.posts.find(p=>p.title==='嵌套文章').id,'nested-test');
 assert.ok(index.posts.find(p=>p.title==='嵌套文章').summary.startsWith('已有摘要优先'));
 assert.equal(index.posts.find(p=>p.title==='别名').id,'custom/path');
 const serialized=JSON.stringify([index,[...bodies]]);assert.doesNotMatch(serialized,/PRIVATE|SECRET|<script|javascript:/);
 const file=path.join(root,'中文 测试！.md');assert.equal(routeId(file,root,{}),'中文-测试');
});
test('add/edit/delete updates and stable coordinates, manual correction',async t=>{
 const root=await fixture(t),a=path.join(root,'a.md'),b=path.join(root,'b.md');
 await writeFile(a,post('意识'));const first=await buildSnapshot(root);
 await writeFile(b,post('时间记忆'));const second=await buildSnapshot(root);
 assert.deepEqual(first.index.posts[0].position,second.index.posts.find(p=>p.id==='a').position);
 await writeFile(a,post('意识变更'));const third=await buildSnapshot(root);assert.equal(third.index.posts.find(p=>p.id==='a').title,'意识变更');
 await rm(b);const fourth=await buildSnapshot(root);assert.equal(fourth.index.count,1);assert.ok(!fourth.bodies.has(second.index.posts.find(p=>p.id==='b').key));
 const corrected=await buildSnapshot(root,{a:'code'});assert.equal(corrected.index.posts[0].topic,'code');assert.equal(corrected.index.posts[0].confidence,'manual');
});
test('live watcher sees add/edit/delete without restart and fails closed on invalid source',async t=>{
 const root=await fixture(t),config=path.join(root,'overrides.json');await writeFile(config,'{}');
 let current, error;const stop=await createWatcher(root,config,(e,s)=>{error=e;current=e?null:s;},80);t.after(stop);
 const until=async predicate=>{const end=Date.now()+4000;while(Date.now()<end){if(predicate())return;await new Promise(r=>setTimeout(r,40));}assert.fail('watcher timeout');};
 const file=path.join(root,'live.md');await writeFile(file,post('新增'));await until(()=>current?.index.count===1);
 await writeFile(file,post('修改'));await until(()=>current?.index.posts[0]?.title==='修改');
 await writeFile(file,post('隐藏','password: private'));await until(()=>current?.index.count===0);assert.equal(current.bodies.size,0);
 await writeFile(file,'---\ntitle: [broken\n---');await until(()=>!!error&&!current);
 await rm(file);await until(()=>!error&&current?.index.count===0);
});
