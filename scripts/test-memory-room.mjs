import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
const require = createRequire(new URL('../sketches/hermes-world-demo/v5/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
import assert from 'node:assert/strict';
import { writeFile, readFile, mkdir, access, readdir } from 'node:fs/promises';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const here=path.join(os.tmpdir(),'memory-room-production-qa');await mkdir(here,{recursive:true});
const base=process.env.MEMORY_ROOM_BASE_URL||'http://127.0.0.1:8768';
const roomUrl=new URL('/memory-room/',base).href;
const index=JSON.parse(await readFile(path.join(root,'dist/memory-room/data/index.json'),'utf8'));
const expected=index.count;
const sourceFiles=await readdir(path.join(root,'src/content/posts'),{recursive:true});
const matter=require('gray-matter');let publicCount=0;const excludedTitles=[];
for(const file of sourceFiles.filter(f=>/\.mdx?$/.test(f))){
 const {data}=matter(await readFile(path.join(root,'src/content/posts',file),'utf8'));
 if(data.draft||data.password){excludedTitles.push(data.title);continue;}publicCount++;
}
assert.equal(expected,publicCount);assert.equal(index.posts.length,expected);
assert.equal(new Set(index.posts.map(p=>p.key)).size,expected);
assert.ok(index.posts.some(p=>p.id==='a-room-for-scattered-memories'));
assert.ok(!index.posts.some(p=>excludedTitles.includes(p.title)));
for(const post of index.posts){
 assert.ok(!('body' in post)&&!('html' in post));
 assert.ok(post.position.length===3&&post.position.every(Number.isFinite));
 assert.ok(Array.from(post.summary).length<=100);
 const body=JSON.parse(await readFile(path.join(root,`dist/memory-room/data/body/${post.key}.json`),'utf8'));
 assert.equal(body.version,post.bodyVersion);assert.equal(body.title,post.title);
 assert.ok(!/<(?:script|iframe|img|style)\b/i.test(body.html));
 await access(path.join(root,'dist',decodeURIComponent(new URL(post.url).pathname),'index.html'));
}
const sitemap=await readFile(path.join(root,'dist/sitemap-0.xml'),'utf8');
assert.ok(sitemap.includes('https://zureeallv.com/memory-room/'));
assert.ok(!sitemap.includes('/memory-room/data/'));
const story=await readFile(path.join(root,'src/content/posts/a-room-for-scattered-memories.md'),'utf8');
assert.ok((matter(story).content.match(/[\u4e00-\u9fff]/g)||[]).length>=2000);
assert.deepEqual(matter(story).data.tags,['Hermes']);
console.log('PASS built data, every original route, lazy bodies, sitemap, story:',expected,'public posts');

const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
context.setDefaultTimeout(15000);context.setDefaultNavigationTimeout(30000);
const page=await context.newPage(),errors=[],requests=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
const ready=async p=>{await p.waitForFunction(()=>window.__memoryRoom?.count>0);await p.waitForTimeout(900);};
const state=()=>page.evaluate(()=>window.__memoryRoom);
const capture=async name=>{await page.screenshot({path:path.join(here,name)});};
try {
 await page.goto(roomUrl);await ready(page);
 check('All public posts in runtime',(await state()).count===expected);
 check('No body payload on initial load',!requests.some(u=>u.includes('/data/body/')));
 check('No external network assets',requests.every(u=>new URL(u).origin===new URL(base).origin));
 check('Default has no decorative text',!/(PERSONAL MEMORY|ARCHIVE|AFTER HOURS|PROTOTYPE|ALL MEMORIES|凌晨的房间|记忆星图)/.test(await page.locator('body').innerText()));
 check('Three/WebGL active',(await state()).metrics.enabled);
 await capture('preview-room.png');
 // A real displayed region button -> real perspective camera -> ray/pixel picking a star.
 await page.locator('.space-button').first().click();await page.waitForTimeout(850);
 const sector=await state();check('Sector camera moves in 3D',sector.mode==='sector'&&sector.view.distance<20&&sector.view.target.some(x=>x!==0));
 await capture('preview-sector.png');
 const pick=await page.evaluate(()=>{
  const box=document.querySelector('#scene').getBoundingClientRect();
  const points=window.__memoryRoom.projected.filter(p=>p.visible&&p.x>90&&p.x<box.width-90&&p.y>160&&p.y<box.height-90);
  const p=points.find(p=>points.every(q=>q.id===p.id||Math.hypot(q.x-p.x,q.y-p.y)>30));
  return p?{...p,x:p.x+box.x,y:p.y+box.y}:null;
 });
 assert.ok(pick);await page.mouse.click(pick.x,pick.y);await page.waitForTimeout(850);
 check('Actual star click focuses article',(await state()).mode==='memory'&&!!(await state()).selected);
 check('Focus reduces perspective distance',(await state()).view.distance<sector.view.distance);
 check('Selected description is sourced and visible',(await page.locator('#summary').innerText()).length>0);
 await capture('preview-focus.png');
 const beforeRead=await state();await page.locator('#read').click();await page.waitForFunction(()=>document.querySelector('#reader-body').children.length>0);
 check('Body fetched only after read action',requests.some(u=>u.includes('/data/body/')));
 await page.getByRole('button',{name:'关闭阅读，回到原位',exact:true}).click();
 check('Reader returns to unchanged selection and view',JSON.stringify((await state()).view)===JSON.stringify(beforeRead.view)&&(await state()).selected===beforeRead.selected);
 await page.locator('#back').click();await page.waitForTimeout(850);
 check('Back restores previous sector view',JSON.stringify((await state()).view)===JSON.stringify(sector.view));
 // Keyboard can traverse actual persistent title buttons (not recreated every frame).
 const label=page.locator('.node-label:visible').first();await label.focus();await page.keyboard.press('Enter');await page.waitForTimeout(850);
 check('Keyboard article selection',(await state()).mode==='memory');
 await page.keyboard.press('/');await page.locator('#query').fill('不存在的文章_xyz_不存在');
 check('Search empty state',await page.locator('.empty').isVisible());
 await page.locator('#clear').click();await page.locator('#category').selectOption('技术');
 check('Original-category filter',(await page.locator('.result').count())===index.posts.filter(p=>p.category==='技术').length);
 await page.locator('.result').first().click();await page.waitForTimeout(850);
 const firstTech=(await state()).selected;
 await page.keyboard.press('/');check('Filter survives selection',await page.locator('#category').inputValue()==='技术');
 await page.locator('.result').nth(1).click();await page.waitForTimeout(120);
 await page.keyboard.press('/');await page.locator('.result').nth(2).click();await page.waitForTimeout(850);
 check('Rapid selections replace flight, no queue',(await state()).mode==='memory'&&(await state()).selected!==firstTech);
 const selection=await state();await page.reload();await ready(page);
 check('Reload restores filters and selection',(await state()).selected===selection.selected&&(await state()).filters.category==='技术');
 check('Reload restores settled camera',JSON.stringify((await state()).view)===JSON.stringify(selection.view));
 await page.locator('#settings-button').click();await page.locator('#quiet').check();await page.getByRole('button',{name:'关闭设置',exact:true}).click();
 await page.keyboard.press('/');await page.locator('#clear').click();await page.locator('.result').first().click();
 const staticView=await state();await page.waitForTimeout(130);
 check('Static mode uses immediate camera placement',JSON.stringify((await state()).view)===JSON.stringify(staticView.view));
 await page.locator('#settings-button').click();await page.locator('#low').check();await page.getByRole('button',{name:'关闭设置',exact:true}).click();
 check('Low performance mode remains usable',await page.locator('#fallback').isVisible());
 await page.locator('#fallback-search').click();check('Fallback exposes all articles',await page.locator('.result').count()===expected);await page.keyboard.press('Escape');
 await page.locator('#settings-button').click();await page.locator('#low').uncheck();await page.locator('#quiet').uncheck();await page.locator('#reset').click();await page.waitForTimeout(850);
 await page.locator('#scene').focus();await page.keyboard.press('Enter');await page.waitForTimeout(850);check('Canvas Enter enters nearest sector',(await state()).mode==='sector');await page.keyboard.press('Escape');await page.waitForTimeout(850);
 const layouts=[];
 for(const [width,height,file] of [[1920,1080,'preview-16x9.png'],[1440,900,'preview-room.png'],[2560,1080,'preview-ultrawide.png'],[390,844,'preview-mobile.png'],[360,740,'preview-mobile-small.png']]){
  await page.setViewportSize({width,height});await page.waitForTimeout(300);
  const layout=await page.evaluate(()=>{
   const b=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
   const pod=b('.pod'),character=b('#character'),tools=b('#tools');
   return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,pod,character,tools,room:b('#room')};
  });
  check(`${width}x${height}: full viewport, no overflow, upright pod, square sprite`,!layout.overflow&&layout.room.width===width&&layout.room.height===height&&layout.pod.height>layout.pod.width&&Math.abs(layout.character.width-layout.character.height)<1&&layout.tools.right<width&&layout.tools.bottom<height);
  layouts.push(layout);await page.mouse.click(20,20);await capture(file);
 }
 await page.setViewportSize({width:390,height:844});await page.keyboard.press('/');await page.locator('.result').first().click();await page.waitForTimeout(850);await capture('preview-mobile-focus.png');
 const fallback=await context.newPage();await fallback.goto(roomUrl+'?no-webgl=1');await ready(fallback);
 check('No-WebGL fallback auto activates',await fallback.locator('#fallback').isVisible());await fallback.locator('#fallback-search').click();check('No-WebGL search covers every article',await fallback.locator('.result').count()===expected);await fallback.close();
 const reduced=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const rp=await reduced.newPage();await rp.goto(roomUrl);await ready(rp);await rp.locator('.space-button').first().click();
 const rv=await rp.evaluate(()=>window.__memoryRoom.view);await rp.waitForTimeout(120);check('System reduced-motion honored',JSON.stringify(rv)===JSON.stringify(await rp.evaluate(()=>window.__memoryRoom.view)));await reduced.close();
 check('No browser runtime or console errors',errors.length===0);
 const roomErrors=[...errors];
 // Full-document boundaries and browser history, after the isolated-room error check.
 await page.setViewportSize({width:1440,height:900});
 await page.locator('#close-detail').click();
 await page.getByRole('link',{name:'返回 Hermes 文章页',exact:true}).click();
 await page.waitForURL('**/hermes/');
 if(await page.locator('#osu-welcome').isVisible()){await page.waitForFunction(()=>!document.querySelector('.osu-welcome__logo')?.disabled);await page.getByRole('button',{name:'点击 OSU! TV 图标进入当前页面',exact:true}).focus();await page.keyboard.press('Enter');await page.locator('#osu-welcome').waitFor({state:'hidden'});}
 check('Existing Hermes listing is retained',await page.getByRole('link',{name:'走进记忆房间'}).isVisible());
 await page.getByRole('link',{name:'走进记忆房间'}).click();await ready(page);
 check('Hermes entry initializes standalone scene',await page.locator('canvas#scene').count()===1);
 await page.goBack();await page.waitForURL('**/hermes/');
 await page.goForward();await ready(page);
 check('Browser forward restores standalone runtime',(await state()).count===expected);
 await page.goto(base+'/posts/a-room-for-scattered-memories/');
 await page.screenshot({path:path.join(here,'story-page.png')});
 check('Story has working room links',(await page.locator('a[href="/memory-room/"]').count())>=2);
 await page.getByRole('link',{name:'推门进来',exact:true}).click();await ready(page);
 check('Story navigation loads real 3D scene',(await state()).metrics.enabled);
 await page.getByRole('link',{name:'返回 Hermes 文章页',exact:true}).click();await page.waitForURL('**/hermes/');
 await page.locator('#nav-menu-switch').click();await page.locator('#nav-menu-panel').getByRole('link',{name:'记忆房间',exact:true}).click();await ready(page);
 check('Main navigation re-entry has one scene',await page.locator('canvas#scene').count()===1);
 check('Standalone navigation never falls back from Swup container errors',!errors.some(message=>/\[swup\]|Container mismatch/.test(message)));
 const metrics=await page.evaluate(()=>window.__memoryRoom.metrics);
 await writeFile(path.join(here,'browser-test-report.json'),JSON.stringify({testedAt:new Date().toISOString(),browser:await browser.version(),checks,errors:roomErrors,existingBlogDiagnostics:errors,metrics,layouts},null,2));
 console.log(JSON.stringify({checks:checks.length,metrics,roomErrors,existingBlogDiagnosticCount:errors.length},null,2));
} catch(error) {await page.screenshot({path:path.join(here,'failure.png')});console.error('FAILED URL',page.url());throw error;} finally {await browser.close();}
