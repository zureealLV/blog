import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { here } from '../indexer.mjs';

const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
const page=await context.newPage(),errors=[],requests=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
const ready=async p=>{await p.waitForFunction(()=>window.__v5?.count>0);await p.waitForTimeout(900);};
const state=()=>page.evaluate(()=>window.__v5);
const capture=async name=>{await page.screenshot({path:path.join(here,name)});};
try {
 await page.goto('http://127.0.0.1:8767/v5/');await ready(page);
 check('194 public posts in runtime',(await state()).count===194);
 check('No body payload on initial load',!requests.some(u=>u.includes('/api/body/')));
 check('No external network assets',requests.every(u=>new URL(u).hostname==='127.0.0.1'));
 check('Default has no decorative text',!/(PERSONAL MEMORY|ARCHIVE|AFTER HOURS|PROTOTYPE|ALL MEMORIES|凌晨的房间|记忆星图)/.test(await page.locator('body').innerText()));
 check('Three/WebGL active',(await state()).metrics.enabled);
 await capture('preview-room.png');
 // A real displayed region button -> real perspective camera -> ray/pixel picking a star.
 await page.locator('.space-button').first().click();await page.waitForTimeout(850);
 const sector=await state();check('Sector camera moves in 3D',sector.mode==='sector'&&sector.view.distance<20&&sector.view.target.some(x=>x!==0));
 await capture('preview-sector.png');
 const pick=await page.evaluate(()=>{
  const box=document.querySelector('#scene').getBoundingClientRect();
  const points=window.__v5.projected.filter(p=>p.visible&&p.x>90&&p.x<box.width-90&&p.y>160&&p.y<box.height-90);
  const p=points.find(p=>points.every(q=>q.id===p.id||Math.hypot(q.x-p.x,q.y-p.y)>30));
  return p?{...p,x:p.x+box.x,y:p.y+box.y}:null;
 });
 assert.ok(pick);await page.mouse.click(pick.x,pick.y);await page.waitForTimeout(850);
 check('Actual star click focuses article',(await state()).mode==='memory'&&!!(await state()).selected);
 check('Focus reduces perspective distance',(await state()).view.distance<sector.view.distance);
 check('Selected description is sourced and visible',(await page.locator('#summary').innerText()).length>0);
 await capture('preview-focus.png');
 const beforeRead=await state();await page.locator('#read').click();await page.waitForFunction(()=>document.querySelector('#reader-body').children.length>0);
 check('Body fetched only after read action',requests.some(u=>u.includes('/api/body/')));
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
 check('Original-category filter',(await page.locator('.result').count())===8);
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
 await page.locator('#fallback-search').click();check('Fallback exposes all articles',await page.locator('.result').count()===194);await page.keyboard.press('Escape');
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
 const fallback=await context.newPage();await fallback.goto('http://127.0.0.1:8767/v5/?no-webgl=1');await ready(fallback);
 check('No-WebGL fallback auto activates',await fallback.locator('#fallback').isVisible());await fallback.locator('#fallback-search').click();check('No-WebGL search covers every article',await fallback.locator('.result').count()===194);await fallback.close();
 const reduced=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const rp=await reduced.newPage();await rp.goto('http://127.0.0.1:8767/v5/');await ready(rp);await rp.locator('.space-button').first().click();
 const rv=await rp.evaluate(()=>window.__v5.view);await rp.waitForTimeout(120);check('System reduced-motion honored',JSON.stringify(rv)===JSON.stringify(await rp.evaluate(()=>window.__v5.view)));await reduced.close();
 check('No browser runtime or console errors',errors.length===0);
 const metrics=await page.evaluate(()=>window.__v5.metrics);
 await writeFile(path.join(here,'browser-test-report.json'),JSON.stringify({testedAt:new Date().toISOString(),browser:await browser.version(),checks,errors,metrics,layouts},null,2));
 console.log(JSON.stringify({checks:checks.length,metrics,errors},null,2));
} finally {await browser.close();}
